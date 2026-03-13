/**
 * Utilitários para cálculos de estatísticas
 */

import type { PlayerStats } from '@/types/app.types';
import { RANKING_CONFIG, type SeasonId } from '@/config/constants';

// ==================== CALCULATION UTILITIES ====================

/**
 * Calcula K/D ratio de forma segura (evita divisão por zero)
 */
export function calculateKD(kills: number, deaths: number): number {
  if (deaths === 0) return kills;
  return parseFloat((kills / deaths).toFixed(2));
}

/**
 * Calcula K/R ratio (Kills per Round)
 */
export function calculateKR(kills: number, rounds: number): number {
  if (rounds === 0) return 0;
  return parseFloat((kills / rounds).toFixed(2));
}

/**
 * Calcula win rate percentual
 */
export function calculateWinRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return parseFloat(((wins / total) * 100).toFixed(1));
}

/**
 * Calcula pontos do ranking baseado em vitórias e derrotas
 */
export function calculateRankingPoints(wins: number, losses: number): number {
  return RANKING_CONFIG.calculatePoints(wins, losses);
}

/**
 * Parse de string para número (da API da FACEIT)
 * Muitos valores vêm como string: "1.50", "75.5", etc.
 */
export function parseStatValue(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse de percentual (remove % e converte)
 */
export function parsePercentage(value: string | undefined): number {
  if (!value) return 0;
  return parseStatValue(value.replace('%', ''));
}

// ==================== SORTING UTILITIES ====================

/**
 * Compara dois jogadores para ordenação
 * Season 1: Se pontos iguais, desempate por vitórias > número de partidas
 */
export function comparePlayers(
  a: PlayerStats,
  b: PlayerStats,
  sortBy: keyof PlayerStats,
  order: 'asc' | 'desc' = 'desc',
  season?: SeasonId
): number {
  const aValue = a[sortBy];
  const bValue = b[sortBy];
  
  // Handle undefined/null
  if (aValue === undefined || aValue === null) return 1;
  if (bValue === undefined || bValue === null) return -1;
  
  // Compare
  let result = 0;
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    result = aValue - bValue;
    
    // Season 1 tiebreak criteria for rankingPoints sort
    if (season === 'SEASON_1' && sortBy === 'rankingPoints' && result === 0) {
      // 1º critério: Vitórias (mais vitórias = melhor)
      const winsResult = b.wins - a.wins;
      if (winsResult !== 0) return winsResult;
      
      // 2º critério: Número de partidas (MENOS partidas = melhor)
      const matchesResult = a.matchesPlayed - b.matchesPlayed;
      return matchesResult;
    }
  } else if (typeof aValue === 'string' && typeof bValue === 'string') {
    result = aValue.localeCompare(bValue);
  }
  
  return order === 'desc' ? -result : result;
}

// ==================== FILTERING UTILITIES ====================

/**
 * Filtra jogadores por termo de busca (nickname)
 */
export function filterBySearch(
  players: PlayerStats[],
  searchTerm: string
): PlayerStats[] {
  if (!searchTerm.trim()) return players;
  
  const term = searchTerm.toLowerCase();
  return players.filter(player => 
    player.nickname.toLowerCase().includes(term)
  );
}

/**
 * Filtra jogadores por pote
 */
export function filterByPot(
  players: PlayerStats[],
  pot: number | 'all' | string  // ← Aceita string
): PlayerStats[] {
  if (pot === 'all') return players;
  
  const potNum = Number(pot);  // ← Converte para number
  return players.filter(player => player.pot === potNum);
}

/**
 * Filtra jogadores por mínimo de partidas
 */
export function filterByMinMatches(
  players: PlayerStats[],
  minMatches: number
): PlayerStats[] {
  if (minMatches <= 0) return players;
  return players.filter(player => player.matchesPlayed >= minMatches);
}

// ==================== AGGREGATION UTILITIES ====================

/**
 * Calcula média de uma métrica entre todos os jogadores
 */
export function calculateAverage(
  players: PlayerStats[],
  metric: keyof PlayerStats
): number {
  if (players.length === 0) return 0;
  
  const sum = players.reduce((acc, player) => {
    const value = player[metric];
    return acc + (typeof value === 'number' ? value : 0);
  }, 0);
  
  return parseFloat((sum / players.length).toFixed(2));
}

// ==================== VALIDATION UTILITIES ====================

/**
 * Valida se um jogador tem dados mínimos para ser exibido
 */
export function isValidPlayer(player: Partial<PlayerStats>): boolean {
  return !!(
    player.playerId &&
    player.nickname &&
    player.matchesPlayed !== undefined &&
    player.rankingPoints !== undefined
  );
}

/**
 * Sanitiza dados de jogador (garante valores válidos)
 */
export function sanitizePlayer(player: Partial<PlayerStats>): PlayerStats {
  return {
    playerId: player.playerId || '',
    nickname: player.nickname || 'Unknown',
    avatar: player.avatar || '',
    country: player.country || '',
    pot: player.pot,
    rating: player.rating,
    rankingPoints: player.rankingPoints || 0,
    peakRankingPoints: player.peakRankingPoints,
    position: player.position || 0,
    matchesPlayed: player.matchesPlayed || 0,
    wins: player.wins || 0,
    losses: player.losses || 0,
    winRate: player.winRate || 0,
    kills: player.kills || 0,
    deaths: player.deaths || 0,
    assists: player.assists || 0,
    kd: player.kd || 0,
    kr: player.kr || 0,
    adr: player.adr || 0,
    headshotPercentage: player.headshotPercentage || 0,
    faceitElo: player.faceitElo || 0,
    skillLevel: player.skillLevel || 0,
    currentStreak: player.currentStreak || 0,
    longestWinStreak: player.longestWinStreak || 0,
    lastMatch: player.lastMatch,
    totalKills: player.totalKills,
    totalDeaths: player.totalDeaths,
    totalDamage: player.totalDamage,
    totalRounds: player.totalRounds,
    totalHeadshots: player.totalHeadshots,
    pentaKills: player.pentaKills,
    totalFirstKills: player.totalFirstKills,
    totalFirstDeaths: player.totalFirstDeaths,
    totalFlashSuccesses: player.totalFlashSuccesses,
    totalKnifeKills: player.totalKnifeKills,
    // RIVAL DATA
    rivalNickname: player.rivalNickname,
    rivalMatchCount: player.rivalMatchCount,
    rivalWins: player.rivalWins,
    rivalLosses: player.rivalLosses,
    // AMULETO / KRIPTONITA
    amuletoNickname: player.amuletoNickname,
    amuletoWinRate: player.amuletoWinRate,
    amuletoMatchCount: player.amuletoMatchCount,
    kriptoniaNickname: player.kriptoniaNickname,
    kritoniaWinRate: player.kritoniaWinRate,
    kritoniaMatchCount: player.kritoniaMatchCount,
    // Match history
    matchResults: player.matchResults,
    matchADRs: player.matchADRs,
    matchRatings: player.matchRatings,
    // Meta
    lastMatchId: player.lastMatchId,
  };
}

// ==================== FORMAT UTILITIES ====================

/**
 * Formata número com casas decimais
 */
export function formatStat(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Formata percentual
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Formata número grande (1000 -> 1k, 1000000 -> 1M)
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

/**
 * Formata posição com sufixo ordinal (1º, 2º, 3º...)
 */
export function formatPosition(position: number): string {
  return `${position}º`;
}

// ==================== COLOR UTILITIES ====================

/**
 * Retorna cor baseada em valor (azul/amarelo/vermelho)
 * Para K/D, Win Rate, etc.
 */
export function getStatColor(value: number, thresholds: { good: number; bad: number }): string {
  if (value >= thresholds.good) return 'text-[#0EA5E9]';
  if (value <= thresholds.bad) return 'text-[#e31e24]';
  return 'text-[#F59E0B]';
}

/**
 * Retorna cor do K/D
 * Verde: > 1.0 (positivo)
 * Amarelo: 0.5-1.0 (médio)
 * Vermelho: < 0.5 (ruim)
 */
export function getKDColor(kd: number): string {
  if (kd > 1.0)  return 'text-[#10B981]';  // Verde - Positivo
  if (kd >= 0.5) return 'text-[#F59E0B]';  // Amarelo - Médio
  return 'text-[#e31e24]';                 // Vermelho - Ruim
}

/**
 * Retorna cor do Win Rate
 * Verde: > 50% (bom)
 * Azul: = 50% (neutro)
 * Vermelho: < 50% (ruim)
 */
export function getWinRateColor(winRate: number): string {
  if (winRate > 50)  return 'text-[#10B981]';  // Verde - Bom
  if (winRate < 50)  return 'text-[#e31e24]';  // Vermelho - Ruim
  return 'text-[#0EA5E9]';                     // Azul - Exatamente 50%
}

/**
 * Retorna cor do ADR com escala específica
 * Verde: > 100 (excelente)
 * Amarelo: 50-100 (médio)
 * Vermelho: < 50 (ruim)
 */
export function getADRColor(adr: number): string {
  if (adr > 100) return 'text-[#10B981]';  // Verde - Excelente
  if (adr >= 50) return 'text-[#F59E0B]';  // Amarelo - Médio
  return 'text-[#e31e24]';                 // Vermelho - Ruim
}

/**
 * Cor do Rating (HLTV 2.0)
 * Verde:   > 1.20 (muito bom)
 * Azul:    1.00–1.20 (acima da média)
 * Amarelo: 0.80–1.00 (abaixo da média)
 * Vermelho: < 0.80 (ruim)
 */
export function getRatingColor(rating: number): string {
  if (rating > 1.20) return 'text-[#10B981]';  // Verde - Muito bom
  if (rating >= 1.00) return 'text-[#0EA5E9]'; // Azul - Acima da média
  if (rating >= 0.80) return 'text-[#F59E0B]'; // Amarelo - Abaixo da média
  return 'text-[#e31e24]';                      // Vermelho - Ruim
}