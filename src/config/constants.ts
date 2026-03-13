/**
 * Constantes centralizadas da aplicação
 */

import type { CacheConfig, PotConfig } from '@/types/app.types';

// ==================== FACEIT API CONFIG ====================

export const FACEIT_API = {
  BASE_URL: 'https://open.faceit.com/data/v4',
  ENDPOINTS: {
    PLAYERS: '/players',
  },
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
 * Players marked as "Free" — excluded from all site displays.
 */
export const FREE_PLAYERS = [
 'BITENCOURT95',
  'SnalpinhA',
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
  'PiMPauMMMM': 1,
  'Pauletovski': 1,
  'Snoop-D0gg': 1,

  // POT 2
  'polippera': 2,
  'umone1': 2,
  'meneziis': 2,
  'imb4': 2,
  'iAgoLas': 2,
  'LBasqueira': 2,
  'ViniDrMM': 2,
  'tohru_sc': 2,
  'malkava': 2,
  'R1tzx': 2,

  // POT 3
  'daftzera': 3,
  'rogeriN-xddd': 3,
  'dhigo92': 3,
  '_hoTz': 3,
  'Mromanino': 3,
  'gboorges': 3,
  'pedr0bear': 3,
  'Jubale': 3,
  'Cissuu': 3,

  // POT 4
  'jungee-': 4,
  'caiosergioo': 4,
  'QGZERA': 4,
  'zzorkkk': 4,
  'Leo1800': 4,
  'MedzR': 4,

  // POT 5
  'BReaC': 5,
  'widmann': 5,
  'Caopiroto': 5,
  'mateustoto': 5,  
  'VeKasss': 5,
  'P0K4B4L4': 5, 
};

/**
 * Active player nicknames (excludes Free players).
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
  COPA_JUNGE_6: {
    id: '',
    name: 'Copa Junge 6',
    description: 'Em breve',
    startDate: null,
    endDate: null,
    status: 'locked' as const,
  },
} as const;

export const ACTIVE_SEASON = SEASONS.SEASON_1;
export const QUEUE_ID = ACTIVE_SEASON.id;

export type SeasonId = keyof typeof SEASONS;
export type Season = typeof SEASONS[SeasonId];

