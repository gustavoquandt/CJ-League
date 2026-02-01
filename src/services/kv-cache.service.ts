/**
 * Serviço de Cache com Upstash Redis
 * Armazena dados dos jogadores de forma persistente
 * ✅ NOVO: Cache individual por jogador
 */

import { Redis } from '@upstash/redis';
import type { PlayerStats } from '@/types/app.types';

// Criar instância do Redis
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const CACHE_KEY = 'cj-stats:players';
const PLAYER_CACHE_PREFIX = 'cj-stats:player:'; // ✅ NOVO

interface CacheData {
  players: PlayerStats[];
  lastUpdated: string;
}

interface PlayerCacheData extends PlayerStats {
  lastMatchId?: string; // ✅ ID da última partida processada
  lastFetchedAt: string;
}

export const kvCacheService = {
  /**
   * Salvar jogadores no Redis (SEM EXPIRAÇÃO)
   */
  async saveCache(players: PlayerStats[]): Promise<void> {
    try {
      const data: CacheData = {
        players,
        lastUpdated: new Date().toISOString(),
      };

      await redis.set(CACHE_KEY, JSON.stringify(data));
      
      console.log(`✅ [REDIS] Cache salvo: ${players.length} jogadores (SEM EXPIRAÇÃO)`);
    } catch (error) {
      console.error('❌ [REDIS] Erro ao salvar cache:', error);
      throw error;
    }
  },

  /**
   * Ler jogadores do Redis
   */
  async getCache(): Promise<CacheData | null> {
    try {
      const cached = await redis.get(CACHE_KEY);
      
      if (!cached) {
        console.log('⚠️ [REDIS] Cache vazio');
        return null;
      }

      const data: CacheData = typeof cached === 'string' 
        ? JSON.parse(cached) 
        : cached as CacheData;
      
      console.log(`✅ [REDIS] Cache lido: ${data.players?.length || 0} jogadores`);
      
      return data;
    } catch (error) {
      console.error('❌ [REDIS] Erro ao ler cache:', error);
      return null;
    }
  },

  // ✅ NOVO: Salvar cache individual de um jogador
  async savePlayerCache(nickname: string, playerData: PlayerStats & { lastMatchId?: string }): Promise<void> {
    try {
      const key = `${PLAYER_CACHE_PREFIX}${nickname.toLowerCase()}`;
      const data: PlayerCacheData = {
        ...playerData,
        lastFetchedAt: new Date().toISOString(),
      };

      await redis.set(key, JSON.stringify(data));
      
      console.log(`✅ [REDIS] Cache do jogador salvo: ${nickname}`);
    } catch (error) {
      console.error(`❌ [REDIS] Erro ao salvar cache do jogador ${nickname}:`, error);
      throw error;
    }
  },

  // ✅ NOVO: Buscar cache individual de um jogador
  async getPlayerCache(nickname: string): Promise<PlayerCacheData | null> {
    try {
      const key = `${PLAYER_CACHE_PREFIX}${nickname.toLowerCase()}`;
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

  // ✅ NOVO: Limpar cache de um jogador específico
  async clearPlayerCache(nickname: string): Promise<void> {
    try {
      const key = `${PLAYER_CACHE_PREFIX}${nickname.toLowerCase()}`;
      await redis.del(key);
      console.log(`✅ [REDIS] Cache do jogador limpo: ${nickname}`);
    } catch (error) {
      console.error(`❌ [REDIS] Erro ao limpar cache do jogador ${nickname}:`, error);
      throw error;
    }
  },

  /**
   * Verificar se cache existe
   */
  async hasCache(): Promise<boolean> {
    try {
      const exists = await redis.exists(CACHE_KEY);
      return exists === 1;
    } catch (error) {
      console.error('❌ [REDIS] Erro ao verificar cache:', error);
      return false;
    }
  },

  /**
   * Limpar cache (útil para debug)
   */
  async clearCache(): Promise<void> {
    try {
      await redis.del(CACHE_KEY);
      console.log('✅ [REDIS] Cache limpo');
    } catch (error) {
      console.error('❌ [REDIS] Erro ao limpar cache:', error);
      throw error;
    }
  },

  // ✅ NOVO: Limpar todos os caches de jogadores
  async clearAllPlayerCaches(): Promise<void> {
    try {
      // Buscar todas as keys de jogadores
      const keys = await redis.keys(`${PLAYER_CACHE_PREFIX}*`);
      
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`✅ [REDIS] ${keys.length} caches de jogadores limpos`);
      }
    } catch (error) {
      console.error('❌ [REDIS] Erro ao limpar caches de jogadores:', error);
      throw error;
    }
  },
};