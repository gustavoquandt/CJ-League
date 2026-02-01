/**
 * Tipos específicos da aplicação
 * Estruturas de dados otimizadas para o frontend
 */

// ==================== PLAYER STATS (Consolidado) ====================

/**
 * Estrutura consolidada de estatísticas de um jogador
 * Combina dados de ranking, perfil e partidas
 */
export interface PlayerStats {
  // Identificação
  playerId: string;
  nickname: string;
  avatar: string;
  country: string;
  
  // Pote (classificação interna)
  pot?: number;
  
  // Ranking no Hub
  rankingPoints: number;
  position: number;
  
  // Partidas no Hub
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number; // Percentual (0-100)
  
  // Estatísticas gerais (lifetime)
  kills: number;
  deaths: number;
  assists: number;
  kd: number; // K/D Ratio
  kr: number; // K/R Ratio
  adr: number; // Average Damage per Round
  headshotPercentage: number;
  totalKills?: number;     // Total acumulado
  totalDeaths?: number;    // Total acumulado
  totalDamage?: number;    // Total acumulado
  totalRounds?: number;    // Total acumulado
  
  // Faceit Info
  faceitElo: number;
  skillLevel: number;
  
  // Streak
  currentStreak: number;
  longestWinStreak: number;
  
  // Meta
  lastMatch?: Date;

  lastMatchId?: string;  // ← ADICIONAR
}

// ==================== CACHE TYPES ====================

/**
 * Estrutura do cache armazenado
 */
export interface CacheData {
  players: PlayerStats[];
  lastUpdated: string; // ISO timestamp
  nextUpdate: string; // ISO timestamp (próxima atualização às 02:00)
  version: string; // Versão do cache (para invalidação)
}

/**
 * Configuração de cache
 */
export interface CacheConfig {
  updateHour: number; // Hora da atualização (0-23)
  updateMinute: number; // Minuto da atualização (0-59)
  ttl: number; // Time to live em milissegundos
  version: string; // Versão atual do cache
}

// ==================== API RESPONSE TYPES ====================

/**
 * Resposta da API /api/faceit/hub-stats
 */
export interface HubStatsResponse {
  success: boolean;
  data?: PlayerStats[];
  error?: string;
  cache: {
    lastUpdated: string;
    nextUpdate: string;
    fromCache: boolean;
  };
  meta?: {
    totalPlayers: number;
    updateDuration?: number; // ms
    apiCalls?: number;
  };
}

/**
 * Status de atualização em tempo real
 */
export interface UpdateProgress {
  status: 'idle' | 'fetching' | 'processing' | 'complete' | 'error';
  currentPlayer?: string;
  progress: number; // 0-100
  message: string;
  totalPlayers: number;
  processedPlayers: number;
}

// ==================== UI STATE TYPES ====================

/**
 * Filtros disponíveis na UI
 */
export interface PlayerFilters {
  searchTerm: string;
  pot?: number | 'all';
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
  minMatches?: number;
}

export type SortOption = 
  | 'rankingPoints'
  | 'position'
  | 'winRate'
  | 'kd'
  | 'adr'
  | 'matchesPlayed'
  | 'faceitElo';

/**
 * Estado da aplicação
 */
export interface AppState {
  players: PlayerStats[];
  filteredPlayers: PlayerStats[];
  filters: PlayerFilters;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  nextUpdate: Date | null;
}

// ==================== STORAGE TYPES ====================

/**
 * Chaves do localStorage
 */
export enum StorageKeys {
  CACHE_DATA = 'faceit_hub_cache',
  USER_PREFERENCES = 'faceit_hub_preferences',
  LAST_VISIT = 'faceit_hub_last_visit',
}

/**
 * Preferências do usuário
 */
export interface UserPreferences {
  defaultSort: SortOption;
  defaultSortOrder: 'asc' | 'desc';
  viewMode: 'cards' | 'table';
  theme: 'light' | 'dark';
  autoRefresh: boolean;
}

// ==================== POT SYSTEM ====================

/**
 * Sistema de potes (classificação interna)
 */
export interface PotConfig {
  pot: number;
  label: string;
  color: string;
  minElo?: number;
  maxElo?: number;
}

// ==================== ERROR TYPES ====================

export interface AppError {
  code: 'NETWORK_ERROR' | 'API_ERROR' | 'CACHE_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  details?: any;
  timestamp: Date;
}

// ==================== ANALYTICS TYPES ====================

/**
 * Estatísticas agregadas do hub
 */
export interface HubAnalytics {
  totalPlayers: number;
  totalMatches: number;
  averageKD: number;
  averageADR: number;
  averageWinRate: number;
  mostActivePlayer: {
    nickname: string;
    matches: number;
  };
  topPerformer: {
    nickname: string;
    kd: number;
  };
  distributionByPot: Record<number, number>;
}
