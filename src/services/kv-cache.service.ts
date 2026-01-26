/**
 * Serviço de Cache com Upstash Redis
 * Armazena dados dos jogadores de forma persistente
 */

import { Redis } from '@upstash/redis';
import type { PlayerStats } from '@/types/app.types';

// Criar instância do Redis
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const CACHE_KEY = 'cj-stats:players';
const CACHE_DURATION = 60 * 60; // 1 hora em segundos

interface CacheData {
  players: PlayerStats[];
  lastUpdated: string;
}

export const kvCacheService = {
  /**
   * Salvar jogadores no Redis
   */
  async saveCache(players: PlayerStats[]): Promise<void> {
    try {
      const data: CacheData = {
        players,
        lastUpdated: new Date().toISOString(),
      };

      await redis.set(CACHE_KEY, JSON.stringify(data), {
        ex: CACHE_DURATION,
      });
      
      console.log(`✅ [REDIS] Cache salvo: ${players.length} jogadores`);
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
};