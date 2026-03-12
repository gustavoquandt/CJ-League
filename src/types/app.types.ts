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

  // Rating (performance simplificado)
  rating?: number;

  // Ranking no Hub
  rankingPoints: number;
  peakRankingPoints?: number; // ✅ Maior pontuação já alcançada na season
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
  totalKills?: number;        // Total acumulado
  totalDeaths?: number;       // Total acumulado
  totalDamage?: number;       // Total acumulado
  totalRounds?: number;       // Total acumulado
  totalHeadshots?: number;    // Total acumulado (para HS% incremental)
  matchResults?: boolean[];   // Histórico de resultados (true=win)
  matchADRs?: number[];       // ADR por partida (para média incremental)
  matchRatings?: number[];    // Rating por partida (para gráfico de tendência)

  // Faceit Info
  faceitElo: number;
  skillLevel: number;

  // Streak
  currentStreak: number;
  longestWinStreak: number;

  // ✅ NOVO: Maior Rival (adversário mais frequente)
  rivalNickname?: string;      // Nome do rival
  rivalMatchCount?: number;    // Vezes que jogou contra
  rivalWins?: number;          // Vitórias contra o rival
  rivalLosses?: number;        // Derrotas contra o rival

  // Amuleto (melhor parceiro) / Kriptonita (pior parceiro)
  amuletoNickname?: string;    // Melhor parceiro (maior win rate juntos)
  amuletoWinRate?: number;     // Win rate % com o amuleto
  amuletoMatchCount?: number;  // Partidas juntos
  kriptoniaNickname?: string;  // Pior parceiro (menor win rate juntos)
  kritoniaWinRate?: number;    // Win rate % com a kriptonita
  kritoniaMatchCount?: number; // Partidas juntos

  // Estatísticas avançadas
  kast?: number;              // KAST % médio (Kill, Assist, Survive, or Trade)
  matchKASTs?: number[];      // KAST por partida (para média incremental)
  clutchAttempts?: number;    // Total de situações 1vX
  clutchWins?: number;        // Total de clutches ganhos
  clutchRate?: number;        // % de clutches ganhos
  clutch1v1?: number;         // Clutches 1v1 ganhos
  clutch1v2?: number;         // Clutches 1v2 ganhos
  clutch1v3?: number;         // Clutches 1v3 ganhos
  clutch1v4?: number;         // Clutches 1v4 ganhos
  clutch1v5?: number;         // Clutches 1v5 ganhos
  clutch1v1Attempts?: number;
  clutch1v2Attempts?: number;
  clutch1v3Attempts?: number;
  clutch1v4Attempts?: number;
  clutch1v5Attempts?: number;
  tripleKills?: number;       // Total de triple kills
  quadroKills?: number;       // Total de quadro kills
  pentaKills?: number;        // Total de penta kills
  mvps?: number;              // Total de MVPs

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
  | 'faceitElo'
  | 'rating';

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

export interface MapStats {
  mostPlayed: {
    map: string;
    count: number;
    percentage: number;
  } | null;
  leastPlayed: {
    map: string;
    count: number;
    percentage: number;
  } | null;
  totalMatches: number;
  mapDistribution: Record<string, number>;
}