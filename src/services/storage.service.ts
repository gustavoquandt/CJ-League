/**
 * Serviço de Storage (localStorage wrapper)
 * Gerencia persistência local com tipo seguro e fallback
 */

import type { CacheData, UserPreferences } from '@/types/app.types';
import { StorageKeys } from '@/types/app.types';
import type { SeasonId } from '@/config/constants';

// ==================== STORAGE CLASS ====================

class StorageService {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = this.checkAvailability();
  }

  /**
   * Verifica se localStorage está disponível
   * Pode não estar disponível em:
   * - Server-side rendering
   * - Modo privado de alguns browsers
   * - Browsers muito antigos
   */
  private checkAvailability(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const test = '__storage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage not available:', e);
      return false;
    }
  }

  /**
   * Salva item no localStorage com serialização JSON
   */
  private setItem<T>(key: string, value: T): boolean {
    if (!this.isAvailable) {
      console.warn('localStorage not available, skipping save');
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error(`Error saving to localStorage (${key}):`, error);
      return false;
    }
  }

  /**
   * Recupera item do localStorage com desserialização JSON
   */
  private getItem<T>(key: string): T | null {
    if (!this.isAvailable) {
      return null;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (!item) return null;
      
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return null;
    }
  }

  /**
   * Remove item do localStorage
   */
  private removeItem(key: string): boolean {
    if (!this.isAvailable) return false;

    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
      return false;
    }
  }

  /**
   * Limpa todo o localStorage da aplicação
   */
  clear(): boolean {
    if (!this.isAvailable) return false;

    try {
      // Remove apenas chaves da nossa aplicação
      Object.values(StorageKeys).forEach(key => {
        window.localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  // ==================== CACHE METHODS ====================

  /**
   * Gera cache key baseado na season
   */
  private getCacheKey(seasonId: SeasonId = 'SEASON_1'): string {
    return `${StorageKeys.CACHE_DATA}_${seasonId}`;
  }

  /**
   * Salva cache de dados (com season)
   */
  saveCache(data: CacheData, seasonId: SeasonId = 'SEASON_1'): boolean {
    const cacheKey = this.getCacheKey(seasonId);
    const cacheData = {
      ...data,
      seasonId,
    };
    return this.setItem(cacheKey, cacheData);
  }

  /**
   * Recupera cache de dados (com season)
   */
  getCache(seasonId: SeasonId = 'SEASON_1'): CacheData | null {
    const cacheKey = this.getCacheKey(seasonId);
    return this.getItem<CacheData>(cacheKey);
  }

  /**
   * Remove cache de dados (com season)
   */
  clearCache(seasonId?: SeasonId): boolean {
    if (seasonId) {
      // Limpar season específica
      const cacheKey = this.getCacheKey(seasonId);
      return this.removeItem(cacheKey);
    } else {
      // Limpar todas as seasons
      this.removeItem(this.getCacheKey('SEASON_0'));
      this.removeItem(this.getCacheKey('SEASON_1'));
      return true;
    }
  }

  // ==================== USER PREFERENCES METHODS ====================

  /**
   * Salva preferências do usuário
   */
  savePreferences(preferences: UserPreferences): boolean {
    return this.setItem(StorageKeys.USER_PREFERENCES, preferences);
  }

  /**
   * Recupera preferências do usuário
   */
  getPreferences(): UserPreferences | null {
    return this.getItem<UserPreferences>(StorageKeys.USER_PREFERENCES);
  }

  /**
   * Obtém preferências com fallback para valores padrão
   */
  getPreferencesWithDefaults(): UserPreferences {
    const saved = this.getPreferences();
    
    const defaults: UserPreferences = {
      defaultSort: 'rankingPoints',
      defaultSortOrder: 'desc',
      viewMode: 'cards',
      theme: 'dark',
      autoRefresh: true,
    };

    return { ...defaults, ...saved };
  }

  // ==================== LAST VISIT METHODS ====================

  /**
   * Salva timestamp da última visita
   */
  saveLastVisit(): boolean {
    return this.setItem(StorageKeys.LAST_VISIT, new Date().toISOString());
  }

  /**
   * Recupera timestamp da última visita
   */
  getLastVisit(): Date | null {
    const timestamp = this.getItem<string>(StorageKeys.LAST_VISIT);
    if (!timestamp) return null;
    
    try {
      return new Date(timestamp);
    } catch {
      return null;
    }
  }

  /**
   * Verifica se é primeira visita
   */
  isFirstVisit(): boolean {
    return this.getLastVisit() === null;
  }

}

// ==================== SINGLETON INSTANCE ====================

/**
 * Instância singleton do serviço de storage
 * Usar em toda a aplicação para garantir consistência
 */
export const storageService = new StorageService();

