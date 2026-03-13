/**
 * Serviço de Cache com Upstash Redis
 * Armazena dados dos jogadores de forma persistente
 * Per-player cache + multi-season support + map stats
 */

import { Redis } from '@upstash/redis';
import type { PlayerStats } from '@/types/app.types';
import type { SeasonId } from '@/config/constants';

// Criar instância do Redis
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Cache keys scoped by season
const getCacheKey = (seasonId: SeasonId = 'SEASON_1') => `cj-stats:players:${seasonId}`;
const getPlayerCacheKey = (nickname: string, seasonId: SeasonId = 'SEASON_1') => 
  `cj-stats:player:${seasonId}:${nickname.toLowerCase()}`;

interface CacheData {
  players: PlayerStats[];
  lastUpdated: string;
  seasonId?: SeasonId;
}

interface PlayerCacheData extends PlayerStats {
  lastMatchId?: string;
  lastFetchedAt: string;
  seasonId?: SeasonId;
}

export const kvCacheService = {
  /**
   * Salvar jogadores no Redis (SEM EXPIRAÇÃO) com season
   */
  async saveCache(players: PlayerStats[], seasonId: SeasonId = 'SEASON_1'): Promise<void> {
    try {
      const cacheKey = getCacheKey(seasonId);
      const data: CacheData = {
        players,
        lastUpdated: new Date().toISOString(),
        seasonId,
      };

      await redis.set(cacheKey, JSON.stringify(data));
      
      console.log(`✅ [REDIS] Cache salvo (${seasonId}): ${players.length} jogadores`);
    } catch (error) {
      console.error('❌ [REDIS] Erro ao salvar cache:', error);
      throw error;
    }
  },

  /**
   * Ler jogadores do Redis (com season)
   */
  async getCache(seasonId: SeasonId = 'SEASON_1'): Promise<CacheData | null> {
    try {
      const cacheKey = getCacheKey(seasonId);
      const cached = await redis.get(cacheKey);
      
      if (!cached) {
        console.log(`⚠️ [REDIS] Cache vazio (${seasonId})`);
        return null;
      }

      const data: CacheData = typeof cached === 'string' 
        ? JSON.parse(cached) 
        : cached as CacheData;
      
      console.log(`✅ [REDIS] Cache lido (${seasonId}): ${data.players?.length || 0} jogadores`);
      
      return data;
    } catch (error) {
      console.error('❌ [REDIS] Erro ao ler cache:', error);
      return null;
    }
  },

  /**
   * Salvar cache individual de um jogador (com season)
   */
  async savePlayerCache(
    nickname: string, 
    playerData: PlayerStats & { lastMatchId?: string },
    seasonId: SeasonId = 'SEASON_1'
  ): Promise<void> {
    try {
      const key = getPlayerCacheKey(nickname, seasonId);
      const data: PlayerCacheData = {
        ...playerData,
        lastFetchedAt: new Date().toISOString(),
        seasonId,
      };

      await redis.set(key, JSON.stringify(data));
      
      console.log(`✅ [REDIS] Cache do jogador salvo (${seasonId}): ${nickname}`);
    } catch (error) {
      console.error(`❌ [REDIS] Erro ao salvar cache do jogador ${nickname}:`, error);
      throw error;
    }
  },

  /**
   * Buscar cache individual de um jogador (com season)
   */
  async getPlayerCache(
    nickname: string,
    seasonId: SeasonId = 'SEASON_1'
  ): Promise<PlayerCacheData | null> {
    try {
      const key = getPlayerCacheKey(nickname, seasonId);
      const cached = await redis.get(key);
      
      if (!cached) {
        return null;
      }

      const data: PlayerCacheData = typeof cached === 'string' 
        ? JSON.parse(cached) 
        : cached as PlayerCacheData;
      
      return data;
    } catch (error) {
      console.error(`❌ [REDIS] Erro ao ler cache do jogador ${nickname}:`, error);
      return null;
    }
  },

  /**
   * Limpar cache de um jogador específico (com season)
   */
  async clearPlayerCache(nickname: string, seasonId: SeasonId = 'SEASON_1'): Promise<void> {
    try {
      const key = getPlayerCacheKey(nickname, seasonId);
      await redis.del(key);
      console.log(`✅ [REDIS] Cache do jogador limpo (${seasonId}): ${nickname}`);
    } catch (error) {
      console.error(`❌ [REDIS] Erro ao limpar cache do jogador ${nickname}:`, error);
      throw error;
    }
  },

  /**
   * Verificar se cache existe (com season)
   */
  async hasCache(seasonId: SeasonId = 'SEASON_1'): Promise<boolean> {
    try {
      const cacheKey = getCacheKey(seasonId);
      const exists = await redis.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      console.error('❌ [REDIS] Erro ao verificar cache:', error);
      return false;
    }
  },

  /**
   * Limpar cache (com season)
   */
  async clearCache(seasonId?: SeasonId): Promise<void> {
    try {
      if (seasonId) {
        const cacheKey = getCacheKey(seasonId);
        await redis.del(cacheKey);
        console.log(`✅ [REDIS] Cache limpo (${seasonId})`);
      } else {
        // Limpar todas as seasons
        await redis.del(getCacheKey('SEASON_0'));
        await redis.del(getCacheKey('SEASON_1'));
        console.log('✅ [REDIS] Todos os caches limpos');
      }
    } catch (error) {
      console.error('❌ [REDIS] Erro ao limpar cache:', error);
      throw error;
    }
  },

  /**
   * Limpar todos os caches de jogadores (com season)
   */
  async clearAllPlayerCaches(seasonId?: SeasonId): Promise<void> {
    try {
      if (seasonId) {
        // Limpar apenas uma season
        const pattern = `cj-stats:player:${seasonId}:*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(`✅ [REDIS] ${keys.length} caches de jogadores limpos (${seasonId})`);
        }
      } else {
        // Limpar todas as seasons
        const keys = await redis.keys('cj-stats:player:*');
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(`✅ [REDIS] ${keys.length} caches de jogadores limpos (todas seasons)`);
        }
      }
    } catch (error) {
      console.error('❌ [REDIS] Erro ao limpar caches de jogadores:', error);
      throw error;
    }
  },

  /**
   * Save map statistics to cache
   */
  async saveMapStats(mapStats: any, seasonId: SeasonId = 'SEASON_1'): Promise<void> {
    try {
      const key = `cj-stats:maps:${seasonId}`;
      await redis.set(key, JSON.stringify(mapStats));
      console.log(`💾 [REDIS] Map stats salvas (${seasonId}): ${mapStats.totalMatches} partidas`);
    } catch (error) {
      console.error('❌ [REDIS] Erro ao salvar map stats:', error);
      throw error;
    }
  },

  /**
   * Retrieve map statistics from cache
   */
  async getMapStats(seasonId: SeasonId = 'SEASON_1'): Promise<any | null> {
    try {
      const key = `cj-stats:maps:${seasonId}`;
      const cached = await redis.get(key);
      
      if (!cached) {
        console.log(`⚠️ [REDIS] Map stats não encontradas (${seasonId})`);
        return null;
      }

      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      console.log(`✅ [REDIS] Map stats lidas (${seasonId}): ${data.totalMatches || 0} partidas`);
      
      return data;
    } catch (error) {
      console.error('❌ [REDIS] Erro ao ler map stats:', error);
      return null;
    }
  },

  /**
   * Save the timestamp of the last check
   */
  async setLastCheck(seasonId: SeasonId = 'SEASON_1'): Promise<void> {
    try {
      const key = `cj-stats:last-check:${seasonId}`;
      await redis.set(key, new Date().toISOString());
      console.log(`✅ [REDIS] Last check salvo (${seasonId})`);
    } catch (error) {
      console.error('❌ [REDIS] Erro ao salvar last check:', error);
      throw error;
    }
  },

  /**
   * Retrieve the timestamp of the last check
   */
  async getLastCheck(seasonId: SeasonId = 'SEASON_1'): Promise<string | null> {
    try {
      const key = `cj-stats:last-check:${seasonId}`;
      const cached = await redis.get(key);
      
      if (!cached) {
        return null;
      }

      const timestamp = typeof cached === 'string' ? cached : String(cached);
      console.log(`✅ [REDIS] Last check lido (${seasonId}): ${timestamp}`);
      
      return timestamp;
    } catch (error) {
      console.error('❌ [REDIS] Erro ao ler last check:', error);
      return null;
    }
  },
};