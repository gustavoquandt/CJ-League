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
    DELAY_MS: 1000,
  },
} as const;

// ==================== HUB CONFIGURATION ====================

export const HUB_CONFIG = {
  HUB_ID: process.env.NEXT_PUBLIC_HUB_ID || 'SEU_HUB_ID_AQUI',
  HUB_NAME: 'Mix Dez 2025',
  GAME: 'cs2',
  REGION: 'SA',
} as const;

// ==================== CACHE CONFIGURATION ====================

export const CACHE_CONFIG: CacheConfig = {
  updateHour: 2,
  updateMinute: 0,
  ttl: 24 * 60 * 60 * 1000,
  version: '1.0.0',
};

// ==================== POT SYSTEM ====================

export const POT_CONFIG: PotConfig[] = [
  { pot: 1, label: 'Pote 1', color: '#C0392B' },
  { pot: 2, label: 'Pote 2', color: '#9A58B5' },
  { pot: 3, label: 'Pote 3', color: '#2ECC71' },
  { pot: 4, label: 'Pote 4', color: '#3498DB' },
  { pot: 5, label: 'Pote 5', color: '#F0C30F' },
];

// ==================== FREE PLAYERS ====================

/**
 * ✅ NOVO: Jogadores marcados como "Free"
 * Não aparecem no site (nem cards, nem destaques, nem tabela)
 */
export const FREE_PLAYERS = [
  'cunh4',
  'pablitanus',
  'Matheusgsr1',
  'nansch',
  'NegaoReinert',
  'JapaMarley',
] as const;

/**
 * Helper para verificar se jogador é Free
 */
export function isPlayerFree(nickname: string): boolean {
  return FREE_PLAYERS.includes(nickname as any);
}

// ==================== PLAYER POTS ====================

export const PLAYER_POTS: Record<string, number> = {
  // POT 1
  'LEON1D4S': 1,
  'MESS1ASf': 1,
  'rhandreco': 1,
  'nollan9': 1,
  'Roxu__': 1,
  'bobz1k4hs': 1,
  'polippera': 2,  
  'PiMPauMMMM': 1,
  'Pauletovski': 1,

  // POT 2
  'Snoop-D0gg': 1,
  'umone1': 2,
  'meneziis': 2,
  'imb4': 2,
  'iAgoLas': 2,
  'LBasqueira': 2,
  'daftzera': 3,
  'ViniDrMM': 2,
  'rogeriN-xddd': 3,
  'tohru_sc': 2,
  'malkava': 2,

  // POT 3
  'dhigo92': 3,
  '_hoTz': 3,
  'Mromanino': 3,
  'jungee-': 4,
  'gboorges': 3,
  'caiosergioo': 4,
  'pedr0bear': 3, 
  'R1tzx': 2,

  // POT 4
  'Jubale': 3,
  'Cissuu': 3,
  'QGZERA': 4,
  'zzorkkk': 4,
  'Leo1800': 4,
  'BReaC': 5,
  'MedzR': 4,
  'widmann': 5,
  
  // ⚠️ REMOVIDOS DO POT 4 (agora são FREE):
  // 'Matheusgsr1': 4,
  // 'nansch': 4,

  // POT 5
 
  'Caopiroto': 5,
  'mateustoto': 5,
  'BITENCOURT95': 5,
  'VeKasss': 5,
  'P0K4B4L4': 5,
  
  // ⚠️ REMOVIDOS DO POT 5 (agora são FREE):
  // 'cunh4': 5,
  // 'pablitanus': 5,
  // 'NegaoReinert': 5,
};

/**
 * ✅ MODIFICADO: Lista de nicknames EXCLUINDO jogadores Free
 */
export const PLAYER_NICKNAMES = Object.keys(PLAYER_POTS).filter(
  nickname => !isPlayerFree(nickname)
);

// ==================== RANKING SYSTEM ====================

export const RANKING_CONFIG = {
  INITIAL_POINTS: 1000,
  POINTS_PER_WIN: 3,
  POINTS_PER_LOSS: 3,
  calculatePoints: (wins: number, losses: number): number => {
    return RANKING_CONFIG.INITIAL_POINTS +
      (wins * RANKING_CONFIG.POINTS_PER_WIN) -
      (losses * RANKING_CONFIG.POINTS_PER_LOSS);
  },
} as const;

// ==================== SEASONS ====================

export const SEASONS = {
  SEASON_0: {
    id: 'f2dec63c-b3c1-4df6-8193-0b83fc6640ef',
    name: 'Season 0',
    description: 'Temporada de Teste',
    startDate: '2024-12-15',
    endDate: '2025-01-31',
    status: 'finished' as const,
  },
  SEASON_1: {
    id: 'bcbe03eb-3ed0-49d7-a4e0-7959c7e27728',
    name: 'Season 1',
    description: 'Primeira temporada da CJ League',
    startDate: '2025-02-01',
    endDate: null,
    status: 'active' as const,
  },
} as const;

export const ACTIVE_SEASON = SEASONS.SEASON_1;
export const QUEUE_ID = ACTIVE_SEASON.id;

export type SeasonId = keyof typeof SEASONS;
export type Season = typeof SEASONS[SeasonId];

// ==================== UI CONFIGURATION ====================

export const UI_CONFIG = {
  ITEMS_PER_PAGE: 20,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  TOAST_DURATION: 5000,
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
  FREE_PLAYERS,
  isPlayerFree,
} as const;