/**
 * Constantes centralizadas da aplicação
 */

import type { CacheConfig, PotConfig } from '@/types/app.types';

// ==================== FACEIT API CONFIG ====================

export const FACEIT_API = {
  BASE_URL: 'https://open.faceit.com/data/v4',
  ENDPOINTS: {
    PLAYERS: '/players',
    PLAYER_STATS: '/players/{player_id}/stats/cs2',
    HUB: '/hubs/{hub_id}',
    HUB_MEMBERS: '/hubs/{hub_id}/members',
    HUB_MATCHES: '/hubs/{hub_id}/matches',
    HUB_STATS: '/leaderboards/hubs/{hub_id}',
    MATCH_STATS: '/matches/{match_id}/stats',
  },
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 60,
    DELAY_MS: 1000, // Delay entre requisições (para evitar rate limit)
  },
} as const;

// ==================== HUB CONFIGURATION ====================

/**
 * Configuração do HUB da FACEIT
 * IMPORTANTE: Substitua pelo ID real do seu hub
 */
export const HUB_CONFIG = {
  HUB_ID: process.env.NEXT_PUBLIC_HUB_ID || 'SEU_HUB_ID_AQUI',
  HUB_NAME: 'Mix Dez 2025',
  GAME: 'cs2',
  REGION: 'SA', // South America
} as const;

// ==================== CACHE CONFIGURATION ====================

/**
 * Configuração do sistema de cache
 * Atualização diária às 02:00
 */
export const CACHE_CONFIG: CacheConfig = {
  updateHour: 2, // 02:00 AM
  updateMinute: 0,
  ttl: 24 * 60 * 60 * 1000, // 24 horas em ms
  version: '1.0.0', // Incrementar para invalidar cache
};

// ==================== POT SYSTEM ====================

/**
 * Sistema de potes (classificação interna)
 * Baseado no arquivo players.json do projeto original
 */
export const POT_CONFIG: PotConfig[] = [
  { pot: 1, label: 'Pote 1', color: '#FFD700' }, // Dourado
  { pot: 2, label: 'Pote 2', color: '#C0C0C0' }, // Prata
  { pot: 3, label: 'Pote 3', color: '#CD7F32' }, // Bronze
  { pot: 4, label: 'Pote 4', color: '#4A90E2' }, // Azul
  { pot: 5, label: 'Pote 5', color: '#95A5A6' }, // Cinza
];

/**
 * Mapeamento de potes dos jogadores
 * Em produção, isso virá do banco de dados ou arquivo de configuração
 */
export const PLAYER_POTS: Record<string, number> = {
  // POT 1
  'LEON1D4S': 1,
  'MESS1ASf': 1,
  'PiMPauMMMM': 1,
  'Roxu__': 1,
  'bobz1k4hs': 1,
  'JapaMarley': 1,
  'caiobafk': 1,
  'dreco': 1,
  'Snoop-D0gg': 1,
  'nollan9': 1,

  // POT 2
  'polippera': 2,
  'knightziin': 2,
  'meneziis': 2,
  'tohru_sc': 2,
  'Pauletovski': 2,
  'iAgoLas': 2,
  'rogeriN-xddd': 2,
  'dhigo92': 2,
  'umone1': 2,
  'LBasqueira': 2,
  'imb4': 2,

  // POT 3
  'caiosergioo': 3,
  '_hoTz': 3,
  'pedr0bear': 3,
  'daftzera': 3,
  'malkava': 3,
  'GriloTJ': 3,
  'ViniDrMM': 3,
  'gboorges': 3,
  'widmann': 3,
  'Mromanino': 3,

  // POT 4
  'Cissuu': 4,
  'Leo1800': 4,
  'Jubale': 4,
  'R1tzx': 4,
  'nansch': 4,
  'BReaC': 4,
  'jungee-': 4,
  'zzorkkk': 4,
  'MedzR': 4,
  'Matheusgsr1': 4,
  'P0K4B4L4': 4,
  'QGZERA': 4,

  // POT 5
  'cunh4': 5,
  'pablitanus': 5,
  'VTB': 5,
  'Caopiroto': 5,
  'mateustoto': 5,
  'BITENCOURT95': 5,
  'VeKasss': 5,
  'NegaoReinert': 5,
};



/**
 * Lista de nicknames dos jogadores do hub
 */
export const PLAYER_NICKNAMES = Object.keys(PLAYER_POTS);

// ==================== RANKING SYSTEM ====================

/**
 * Sistema de pontuação do ranking
 */
export const RANKING_CONFIG = {
  INITIAL_POINTS: 1000,
  POINTS_PER_WIN: 3,
  POINTS_PER_LOSS: 3,
  /**
   * Calcula pontos do ranking
   * Fórmula: 1000 + (wins × 3) - (losses × 3)
   */
  calculatePoints: (wins: number, losses: number): number => {
    return RANKING_CONFIG.INITIAL_POINTS + 
           (wins * RANKING_CONFIG.POINTS_PER_WIN) - 
           (losses * RANKING_CONFIG.POINTS_PER_LOSS);
  },
} as const;

// ==================== UI CONFIGURATION ====================

export const UI_CONFIG = {
  ITEMS_PER_PAGE: 20,
  DEBOUNCE_DELAY: 300, // ms para filtros de busca
  ANIMATION_DURATION: 200, // ms
  TOAST_DURATION: 5000, // ms
} as const;

// ==================== ERROR MESSAGES ====================

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  API_ERROR: 'Erro ao buscar dados da FACEIT.',
  CACHE_ERROR: 'Erro ao salvar/carregar cache.',
  PLAYER_NOT_FOUND: 'Jogador não encontrado.',
  INVALID_HUB: 'Hub inválido ou não encontrado.',
  RATE_LIMIT: 'Limite de requisições atingido. Aguarde um momento.',
  UNKNOWN_ERROR: 'Erro desconhecido. Tente novamente.',
} as const;

// ==================== SUCCESS MESSAGES ====================

export const SUCCESS_MESSAGES = {
  DATA_UPDATED: 'Dados atualizados com sucesso!',
  CACHE_CLEARED: 'Cache limpo com sucesso!',
} as const;

// ==================== METADATA ====================

export const APP_METADATA = {
  TITLE: 'FACEIT Hub Stats - Mix Dez 2025',
  DESCRIPTION: 'Estatísticas e ranking dos jogadores do hub Mix Dez 2025',
  URL: process.env.NEXT_PUBLIC_APP_URL || 'https://faceit-hub-stats.vercel.app',
  TWITTER_HANDLE: '@faceit_hub_stats',
} as const;

// ==================== EXPORT ALL ====================

export const CONFIG = {
  FACEIT_API,
  HUB_CONFIG,
  CACHE_CONFIG,
  POT_CONFIG,
  PLAYER_POTS,
  PLAYER_NICKNAMES,
  RANKING_CONFIG,
  UI_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  APP_METADATA,
} as const;
