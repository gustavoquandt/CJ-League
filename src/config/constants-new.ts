/**
 * Configurações - SUPORTE A MÚLTIPLAS SEASONS
 * Cada season tem sua própria fila/competition
 */

import type { CacheConfig, PotConfig } from '@/types/app.types';

// ==================== HUB CONFIGURATION (PERMANENTE) ====================

/**
 * HUB da FACEIT (não muda)
 */
export const HUB_CONFIG = {
  HUB_ID: process.env.NEXT_PUBLIC_HUB_ID || '42393c93-5da0-4a6b-bcda-32de8d727658',
  HUB_NAME: 'Mix Dez',
  GAME: 'cs2',
  REGION: 'SA',
} as const;

// ==================== SEASON CONFIGURATION ====================

/**
 * Configuração de cada Season
 */
export interface SeasonConfig {
  id: string;
  name: string;
  competitionId: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date (undefined se season ativa)
  isActive: boolean;
  players: Record<string, number>; // nickname -> pot
}

/**
 * SEASONS CONFIGURADAS
 * Adicione uma nova season aqui para cada fila
 */
export const SEASONS: SeasonConfig[] = [
  {
    id: 'season-1',
    name: 'Season 1 - Janeiro 2025',
    competitionId: 'f2dec63c-b3c1-4df6-8193-0b83fc6640ef',
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-01-31T23:59:59Z',
    isActive: false,
    players: {
      // Jogadores da Season 1
       'LEON1D4S': 1,
  'caiosergioo': 3,
  'polippera': 2,
  '_hoTz': 3,
  'Cissuu': 4,
  'Leo1800': 4,
  'MESS1ASf': 1,
  'knightziin': 2,
  'PiMPauMMMM': 1,
  'meneziis': 2,
  'pedr0bear': 3,
  'Jubale': 4,
  'tohru_sc': 2,
  'R1tzx': 4,
  'daftzera': 3,
  'Roxu__': 1,
  'cunh4': 5,
  'pablitanus': 5,
  'malkava': 3,
  'bobz1k4hs': 1,
  'GriloTJ': 3,
  'JapaMarley': 1,
  'nansch': 4,
  'caiobafk': 1,
  'brunocrippam': 4,
  'VTB': 5,
  'umone1': 2,
  'jungee-': 4,
  'dreco': 1,
  'Caopiroto': 5,
  'Pauletovski': 2,
  'mateustoto': 5,
  'BITENCOURT95': 5,
  'VeKasss': 5,
  'ViniDrMM': 3,
  'iAgoLas': 2,
  'MedzR': 4,
  'rogeriN-xddd': 2,
  'gboorges': 3,
  'zzorkkk': 4,
  'dhigo92': 2,
  'Matheusgsr1': 4,
  'P0K4B4L4': 4,
  'LBasqueira': 2,
  'imb4': 2,
  'Mromanino': 3,
  'QGZERA': 4,
  'Snoop-D0gg': 1,
      // ... adicione todos os jogadores da Season 1
    }
  },
  {
    id: 'season-2',
    name: 'Season 2 - Fevereiro 2025',
    competitionId: 'NOVA_COMPETITION_ID_AQUI', // ← Mude quando criar nova fila
    startDate: '2025-02-01T00:00:00Z',
    // endDate: undefined, // Season ativa não tem endDate
    isActive: true, // ← SEASON ATIVA
    players: {
      // Jogadores da Season 2 (podem ser diferentes!)
      'LEON1D4S': 1,
      'caiosergioo': 2, // Mudou de pote!
      'NovoJogador': 3, // Novo jogador
      // ... adicione todos os jogadores da Season 2
    }
  },
  // Adicione mais seasons conforme necessário
];

/**
 * Season ativa atual
 */
export const ACTIVE_SEASON = SEASONS.find(s => s.isActive) || SEASONS[SEASONS.length - 1];

/**
 * ID da Competition ativa (para filtrar partidas)
 */
export const ACTIVE_COMPETITION_ID = ACTIVE_SEASON.competitionId;

/**
 * Jogadores da season ativa
 */
export const PLAYER_POTS = ACTIVE_SEASON.players;

/**
 * Lista de nicknames da season ativa
 */
export const PLAYER_NICKNAMES = Object.keys(PLAYER_POTS);

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
    COMPETITION_STATS: '/leaderboards/competitions/{competition_id}', // ← NOVO
    MATCH_STATS: '/matches/{match_id}/stats',
    PLAYER_MATCHES: '/players/{player_id}/history', // ← NOVO
  },
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 60,
    DELAY_MS: 1000,
  },
} as const;

// ==================== CACHE CONFIGURATION ====================

export const CACHE_CONFIG: CacheConfig = {
  updateHour: 2,
  updateMinute: 0,
  ttl: 24 * 60 * 60 * 1000,
  version: '2.0.0', // Incremente ao mudar season
};

// ==================== POT SYSTEM ====================

export const POT_CONFIG: PotConfig[] = [
  { pot: 1, label: 'Pote 1 - Elite', color: '#FFD700' },
  { pot: 2, label: 'Pote 2 - Avançado', color: '#C0C0C0' },
  { pot: 3, label: 'Pote 3 - Intermediário', color: '#CD7F32' },
  { pot: 4, label: 'Pote 4 - Iniciante', color: '#4A90E2' },
  { pot: 5, label: 'Pote 5 - Novato', color: '#95A5A6' },
];

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

// ==================== UI CONFIGURATION ====================

export const UI_CONFIG = {
  ITEMS_PER_PAGE: 20,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  TOAST_DURATION: 5000,
  SHOW_SEASON_SELECTOR: true, // ← Mostra seletor de season na UI
} as const;

// ==================== ERROR MESSAGES ====================

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  API_ERROR: 'Erro ao buscar dados da FACEIT.',
  CACHE_ERROR: 'Erro ao salvar/carregar cache.',
  PLAYER_NOT_FOUND: 'Jogador não encontrado.',
  INVALID_HUB: 'Hub inválido ou não encontrado.',
  INVALID_COMPETITION: 'Fila/Competition inválida.',
  RATE_LIMIT: 'Limite de requisições atingido. Aguarde um momento.',
  UNKNOWN_ERROR: 'Erro desconhecido. Tente novamente.',
} as const;

export const SUCCESS_MESSAGES = {
  DATA_UPDATED: 'Dados atualizados com sucesso!',
  CACHE_CLEARED: 'Cache limpo com sucesso!',
  SEASON_CHANGED: 'Season alterada com sucesso!',
} as const;

// ==================== METADATA ====================

export const APP_METADATA = {
  TITLE: `${HUB_CONFIG.HUB_NAME} - ${ACTIVE_SEASON.name}`,
  DESCRIPTION: `Estatísticas e ranking dos jogadores - ${ACTIVE_SEASON.name}`,
  URL: process.env.NEXT_PUBLIC_APP_URL || 'https://faceit-hub-stats.vercel.app',
} as const;

// ==================== HELPER FUNCTIONS ====================

/**
 * Pega configuração de uma season específica
 */
export function getSeasonById(seasonId: string): SeasonConfig | undefined {
  return SEASONS.find(s => s.id === seasonId);
}

/**
 * Pega todas as seasons (para histórico)
 */
export function getAllSeasons(): SeasonConfig[] {
  return SEASONS;
}

/**
 * Verifica se uma partida pertence à season ativa
 */
export function isMatchFromActiveSeason(competitionId?: string): boolean {
  if (!competitionId) return false;
  return competitionId === ACTIVE_COMPETITION_ID;
}

// ==================== EXPORT CONSOLIDADO ====================

export const CONFIG = {
  HUB: HUB_CONFIG,
  SEASON: ACTIVE_SEASON,
  SEASONS,
  FACEIT_API,
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