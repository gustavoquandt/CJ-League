/**
 * Serviço de Cache
 * Gerencia cache de dados com atualização diária às 02:00
 * Implementa cache em memória (backend) e localStorage (frontend)
 */

import type { CacheData, PlayerStats } from '@/types/app.types';
import { CACHE_CONFIG } from '@/config/constants';
import {
  shouldUpdateCache,
  getNextUpdateTime,
} from '@/utils/date.utils';

// ==================== IN-MEMORY CACHE (Backend) ====================

/**
 * Cache em memória para API Routes
 * Persiste enquanto o servidor estiver rodando
 * 
 * IMPORTANTE: Em serverless (Vercel), cada função pode ter sua própria
 * instância, então o cache pode não ser compartilhado entre requisições.
 * Por isso, sempre validamos com base no timestamp.
 */
class InMemoryCache {
  private cache: CacheData | null = null;

  /**
   * Salva dados no cache em memória
   */
  set(data: PlayerStats[], lastUpdated?: Date): void {
    const now = lastUpdated || new Date();
    
    this.cache = {
      players: data,
      lastUpdated: now.toISOString(),
      nextUpdate: getNextUpdateTime(now).toISOString(),
      version: CACHE_CONFIG.version,
    };
  }

  /**
   * Recupera dados do cache em memória
   */
  get(): CacheData | null {
    return this.cache;
  }

  /**
   * Verifica se o cache em memória é válido
   */
  isValid(): boolean {
    if (!this.cache) return false;

    // Verifica versão
    if (this.cache.version !== CACHE_CONFIG.version) {
      console.log('🗑️ Cache invalidado: versão desatualizada');
      this.clear();
      return false;
    }

    // Verifica se precisa atualizar
    if (shouldUpdateCache(this.cache.lastUpdated)) {
      console.log('🗑️ Cache invalidado: passou da hora de atualização');
      return false;
    }

    return true;
  }

  /**
   * Limpa cache em memória
   */
  clear(): void {
    this.cache = null;
  }

  /**
   * Debug: mostra status do cache
   */
  debug(): void {
    console.log('🧠 In-Memory Cache:', {
      hasCache: !!this.cache,
      isValid: this.isValid(),
      playersCount: this.cache?.players.length || 0,
      lastUpdated: this.cache?.lastUpdated,
      nextUpdate: this.cache?.nextUpdate,
    });
  }
}

// ==================== SINGLETON INSTANCE ====================

/**
 * Instância singleton do cache em memória
 * Usado apenas no backend (API Routes)
 */
export const memoryCache = new InMemoryCache();

// ==================== CACHE SERVICE ====================

/**
 * Serviço de cache com lógica de atualização
 */
class CacheService {
  /**
   * Verifica se deve atualizar o cache
   * Lógica:
   * 1. Se não existe cache válido -> atualizar
   * 2. Se passou da última janela de 02:00 -> atualizar
   * 3. Caso contrário -> usar cache existente
   */
  shouldUpdate(cacheData: CacheData | null): boolean {
    if (!cacheData) {
      console.log('✅ Deve atualizar: cache não existe');
      return true;
    }

    // Verifica versão
    if (cacheData.version !== CACHE_CONFIG.version) {
      console.log('✅ Deve atualizar: versão desatualizada');
      return true;
    }

    // Verifica timestamp
    const shouldUpdate = shouldUpdateCache(cacheData.lastUpdated);
    
    if (shouldUpdate) {
      console.log('✅ Deve atualizar: passou da janela de atualização (02:00)');
    } else {
      console.log('⏭️ Cache válido: próxima atualização em', cacheData.nextUpdate);
    }

    return shouldUpdate;
  }

  /**
   * Cria estrutura de CacheData
   */
  createCacheData(players: PlayerStats[], lastUpdated?: Date): CacheData {
    const now = lastUpdated || new Date();
    
    return {
      players,
      lastUpdated: now.toISOString(),
      nextUpdate: getNextUpdateTime(now).toISOString(),
      version: CACHE_CONFIG.version,
    };
  }

  /**
   * Valida estrutura de CacheData
   */
  isValidCacheData(data: any): data is CacheData {
    return !!(
      data &&
      typeof data === 'object' &&
      Array.isArray(data.players) &&
      typeof data.lastUpdated === 'string' &&
      typeof data.nextUpdate === 'string' &&
      typeof data.version === 'string'
    );
  }

  /**
   * Mescla caches (prioriza o mais recente)
   */
  mergeCaches(cache1: CacheData | null, cache2: CacheData | null): CacheData | null {
    if (!cache1) return cache2;
    if (!cache2) return cache1;

    // Retorna o mais recente
    const date1 = new Date(cache1.lastUpdated);
    const date2 = new Date(cache2.lastUpdated);

    return date1 >= date2 ? cache1 : cache2;
  }

  /**
   * Obtém informações sobre o cache
   */
  getCacheInfo(cache: CacheData | null): {
    hasCache: boolean;
    playersCount: number;
    lastUpdated: string | null;
    nextUpdate: string | null;
    isValid: boolean;
  } {
    return {
      hasCache: !!cache,
      playersCount: cache?.players.length || 0,
      lastUpdated: cache?.lastUpdated || null,
      nextUpdate: cache?.nextUpdate || null,
      isValid: cache ? !this.shouldUpdate(cache) : false,
    };
  }
}

// ==================== SINGLETON INSTANCE ====================

/**
 * Instância singleton do serviço de cache
 */
export const cacheService = new CacheService();

// ==================== CACHE STRATEGIES ====================

/**
 * Estratégia de cache: Memory-First (para API Routes)
 * Tenta memória primeiro, depois localStorage
 */
export async function getCacheMemoryFirst(): Promise<CacheData | null> {
  // 1. Verifica cache em memória
  if (memoryCache.isValid()) {
    console.log('✅ Cache hit (memory)');
    return memoryCache.get();
  }

  // 2. Não tem cache válido em memória
  console.log('❌ Cache miss (memory)');
  return null;
}

/**
 * Estratégia de cache: Storage-First (para Frontend)
 * Usado no cliente
 */
export async function getCacheStorageFirst(
  getStorageCache: () => CacheData | null
): Promise<CacheData | null> {
  // 1. Verifica localStorage
  const storageCache = getStorageCache();
  
  if (storageCache && !cacheService.shouldUpdate(storageCache)) {
    console.log('✅ Cache hit (localStorage)');
    return storageCache;
  }

  console.log('❌ Cache miss (localStorage)');
  return null;
}

/**
 * Salva cache em ambos os lugares (memory + storage)
 * Usado após buscar dados frescos da API
 */
export function saveCacheEverywhere(
  players: PlayerStats[],
  saveToStorage: (data: CacheData) => void
): CacheData {
  const now = new Date();
  const cacheData = cacheService.createCacheData(players, now);

  // Salva em memória
  memoryCache.set(players, now);

  // Salva em storage (se disponível)
  try {
    saveToStorage(cacheData);
  } catch (error) {
    console.warn('Falha ao salvar no storage:', error);
  }

  console.log('💾 Cache salvo com sucesso:', {
    players: players.length,
    lastUpdated: cacheData.lastUpdated,
    nextUpdate: cacheData.nextUpdate,
  });

  return cacheData;
}

// ==================== EXPORT ====================

export { InMemoryCache, CacheService };
