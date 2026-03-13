/**
 * FaceitService — integração com a FACEIT API v4
 * Batch: 1 jogador por request (300s timeout Vercel)
 * Incremental: acumula partidas novas sobre o cache existente
 */

import type { FaceitPlayer } from '@/types/faceit.types';
import type { PlayerStats } from '@/types/app.types';
import {
  FACEIT_API,
  PLAYER_POTS,
  RANKING_CONFIG,
} from '@/config/constants';
import { sanitizePlayer } from '@/utils/stats.utils';
import { calculateSimplifiedRating } from '@/utils/rating.utils';

// Configurações de rate limiting
const PARALLEL_MATCHES = 3;           // 3 partidas em paralelo
const REQUEST_TIMEOUT = 20000;        // 20s timeout
const MIN_DELAY_BETWEEN_REQUESTS = 1200; // 1.2s entre requests
const DELAY_BETWEEN_CHUNKS = 1500;    // 1.5s entre chunks

interface FaceitServiceConfig {
  apiKey: string;
  baseUrl?: string;
}

interface QueuePlayerStats {
  wins: number;
  losses: number;
  matchesPlayed: number;
  points: number;
  lastMatchId?: string;
  totalKills: number;
  totalDeaths: number;
  totalDamage: number;
  totalRounds: number;
  totalHeadshots: number;
  totalPentaKills: number;
  totalAssists: number;
  totalFirstKills: number;
  totalFirstDeaths: number;
  totalFlashSuccesses: number;
  totalKnifeKills: number;
  matchADRs: number[];
  matchRatings: number[];
  matchResults: boolean[];
  matchIds: string[];
  rivalNickname?: string;
  rivalMatchCount?: number;
  rivalWins?: number;
  rivalLosses?: number;
  amuletoNickname?: string;
  amuletoWinRate?: number;
  amuletoMatchCount?: number;
  kriptoniaNickname?: string;
  kritoniaWinRate?: number;
  kritoniaMatchCount?: number;
}

class FaceitService {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor(config: FaceitServiceConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || FACEIT_API.BASE_URL;
    this.timeout = REQUEST_TIMEOUT;
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < MIN_DELAY_BETWEEN_REQUESTS) {
      const waitTime = MIN_DELAY_BETWEEN_REQUESTS - timeSinceLastRequest;
      await this.delay(waitTime);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async request<T>(endpoint: string, retries = 4): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.waitForRateLimit();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Not found`);
          }

          if (response.status === 429) {
            const waitTime = 10000 * (attempt + 1);
            console.log(`   ⚠️ Rate limit! Aguardando ${waitTime/1000}s...`);
            await this.delay(waitTime);
            continue;
          }

          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        return data as T;

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retries) {
          const waitTime = 3000 * (attempt + 1);
          await this.delay(waitTime);
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  async getPlayerByNickname(nickname: string): Promise<FaceitPlayer | null> {
    try {
      const endpoint = `${FACEIT_API.ENDPOINTS.PLAYERS}?nickname=${encodeURIComponent(nickname)}&game=cs2`;
      return await this.request<FaceitPlayer>(endpoint);
    } catch (error) {
      console.error(`   ❌ ${nickname}: Não encontrado`);
      return null;
    }
  }

  private buildPlayerStats(
    nickname: string,
    player: FaceitPlayer,
    queueStats: QueuePlayerStats,
  ): PlayerStats {
    const playerId = player.player_id;
    const avatar = player.avatar;
    const country = player.country;
    const faceitElo = player.faceit_elo || 0;
    const skillLevel = player.skill_level || 0;

    const {
      wins, losses, matchesPlayed, points, lastMatchId,
      totalKills, totalDeaths, totalDamage, totalRounds,
      totalHeadshots, totalPentaKills, totalAssists,
      totalFirstKills, totalFirstDeaths, totalFlashSuccesses, totalKnifeKills,
      matchADRs, matchRatings, matchResults,
      rivalNickname, rivalMatchCount, rivalWins, rivalLosses,
      amuletoNickname, amuletoWinRate, amuletoMatchCount,
      kriptoniaNickname, kritoniaWinRate, kritoniaMatchCount,
    } = queueStats;
    
    const kd = totalDeaths > 0 ? parseFloat((totalKills / totalDeaths).toFixed(2)) : 0;
    
    // ADR: average of per-match ADRs
    const adr = matchADRs.length > 0
      ? parseFloat((matchADRs.reduce((sum, adr) => sum + adr, 0) / matchADRs.length).toFixed(1))
      : 0;
    
    const kills = matchesPlayed > 0 ? parseFloat((totalKills / matchesPlayed).toFixed(1)) : 0;
    const deaths = matchesPlayed > 0 ? parseFloat((totalDeaths / matchesPlayed).toFixed(1)) : 0;

    const headshotPercentage = totalKills > 0
      ? parseFloat(((totalHeadshots / totalKills) * 100).toFixed(1))
      : 0;

    let currentStreakCalc = 0;
    let longestStreak = 0;
    for (const won of matchResults) {
      if (won) {
        currentStreakCalc++;
        longestStreak = Math.max(longestStreak, currentStreakCalc);
      } else {
        currentStreakCalc = 0;
      }
    }
    const longestWinStreak = longestStreak;

    // Simulate point history match-by-match to find peak ranking points
    let currentPoints: number = RANKING_CONFIG.INITIAL_POINTS; // 1000
    let peakPoints: number = currentPoints;
    
    // matchResults está mais-recente-primeiro; iterar ao contrário para simulação cronológica
    for (const won of [...matchResults].reverse()) {
      currentPoints += won ? 3 : -3;
      peakPoints = Math.max(peakPoints, currentPoints);
    }
    const peakRankingPoints = peakPoints;

    const assists = matchesPlayed > 0 ? parseFloat((totalAssists / matchesPlayed).toFixed(1)) : 0;
    const kr = totalRounds > 0 ? parseFloat((totalKills / totalRounds).toFixed(2)) : 0;

    // Current streak: count consecutive results from most recent (index 0)
    let currentStreak = 0;
    if (matchResults.length > 0) {
      const first = matchResults[0];
      for (const won of matchResults) {
        if (won !== first) break;
        currentStreak += first ? 1 : -1;
      }
    }

    const winRate = matchesPlayed > 0 
      ? parseFloat(((wins / matchesPlayed) * 100).toFixed(1))
      : 0;

    const pot = PLAYER_POTS[nickname];

    // Calcular rating simplificado
    const rating = calculateSimplifiedRating({
      totalKills,
      totalDeaths,
      totalDamage,
      totalRounds,
      totalHeadshots,
    });

    return sanitizePlayer({
      playerId, nickname, avatar, country, pot,
      rating,  // Rating simplificado
      rankingPoints: points,
      peakRankingPoints,
      position: 0,
      matchesPlayed, wins, losses, winRate,
      kills, deaths, assists, kd, kr, adr,
      headshotPercentage, faceitElo, skillLevel,
      currentStreak, longestWinStreak, lastMatchId,
      totalKills, totalDeaths, totalDamage, totalRounds, totalHeadshots,
      pentaKills: totalPentaKills,
      totalFirstKills, totalFirstDeaths, totalFlashSuccesses, totalKnifeKills,
      rivalNickname, rivalMatchCount, rivalWins, rivalLosses,
      amuletoNickname, amuletoWinRate, amuletoMatchCount,
      kriptoniaNickname, kritoniaWinRate, kritoniaMatchCount,
      matchResults, matchADRs, matchRatings,
    });
  }

  /**
   * Fetch a player and their match history (up to maxMatches).
   * Supports incremental fetching from lastMatchId and
   * accumulation over previousStats.
   */
  async fetchPlayerWithMatches(
    nickname: string,
    maxMatches: number = 200,
    lastMatchId?: string | null,
    queueId?: string,
    previousStats?: PlayerStats | null
  ): Promise<(PlayerStats & { lastMatchId?: string }) | null> {
    try {
      const playerInfo = await this.getPlayerByNickname(nickname);
      if (!playerInfo) return null;

      const QUEUE_TO_USE = queueId || '';

      const allMatches: any[] = [];
      let offset = 0;
      const limit = 100;
      let foundLastMatch = false;

      while (allMatches.length < maxMatches && !foundLastMatch) {
        const endpoint = `/players/${playerInfo.player_id}/history?game=cs2&offset=${offset}&limit=${limit}`;
        const matchesResponse: any = await this.request(endpoint);

        if (!matchesResponse?.items || matchesResponse.items.length === 0) break;

        const queueMatches = matchesResponse.items.filter(
          (match: any) => match.competition_id === QUEUE_TO_USE
        );

        for (const match of queueMatches) {
          if (lastMatchId && match.match_id === lastMatchId) {
            foundLastMatch = true;
            break;
          }
          allMatches.push(match);
          if (allMatches.length >= maxMatches) break;
        }

        offset += limit;
        if (matchesResponse.items.length < limit) break;
        if (!foundLastMatch && allMatches.length < maxMatches) {
          await this.delay(800);
        }
      }

      console.log(`   Buscou ${allMatches.length} partidas NOVAS para ${nickname}`);
      
      // No new matches found — return previous stats as-is
      if (allMatches.length === 0 && previousStats) {
        console.log(`   ⚡ Sem partidas novas - Mantendo stats antigas (${previousStats.matchesPlayed} partidas)`);
        return {
          ...previousStats,
          lastMatchId: previousStats.lastMatchId,
        };
      }
      
      const newStats = await this.calculateStatsFromMatches(allMatches, playerInfo, nickname);

      // Accumulate only when we have previous stats, new matches, and
      // confirmed the stop point (foundLastMatch). If lastMatchId was null,
      // foundLastMatch stays false and we recalculate from scratch.
      if (previousStats && allMatches.length > 0 && foundLastMatch) {
        console.log(`   ⚡ ${nickname}: Acumulando ${allMatches.length} partidas novas com ${previousStats.matchesPlayed} existentes`);

        const combinedWins      = previousStats.wins + newStats.wins;
        const combinedLosses    = previousStats.losses + newStats.losses;
        const combinedPlayed    = combinedWins + combinedLosses;
        const combinedKills     = (previousStats.totalKills     || 0) + (newStats.totalKills     || 0);
        const combinedDeaths    = (previousStats.totalDeaths    || 0) + (newStats.totalDeaths    || 0);
        const combinedDamage    = (previousStats.totalDamage    || 0) + (newStats.totalDamage    || 0);
        const combinedRounds    = (previousStats.totalRounds    || 0) + (newStats.totalRounds    || 0);
        const combinedHeadshots = (previousStats.totalHeadshots || 0) + (newStats.totalHeadshots || 0);

        // Arrays: novas partidas primeiro (mais recentes), depois antigas
        const combinedMatchResults = [
          ...(newStats.matchResults || []),
          ...(previousStats.matchResults || []),
        ];
        const combinedMatchADRs = [
          ...(newStats.matchADRs || []),
          ...(previousStats.matchADRs || []),
        ];
        const combinedMatchRatings = [
          ...(newStats.matchRatings || []),
          ...(previousStats.matchRatings || []),
        ];

        // Recalcular stats derivadas
        const rankingPoints = RANKING_CONFIG.INITIAL_POINTS + (combinedWins * 3) - (combinedLosses * 3);
        const kd      = combinedDeaths > 0 ? parseFloat((combinedKills / combinedDeaths).toFixed(2)) : 0;
        const adr     = combinedMatchADRs.length > 0
          ? parseFloat((combinedMatchADRs.reduce((s, a) => s + a, 0) / combinedMatchADRs.length).toFixed(1))
          : 0;
        const headshotPercentage = combinedKills > 0
          ? parseFloat(((combinedHeadshots / combinedKills) * 100).toFixed(1))
          : 0;
        const winRate = combinedPlayed > 0
          ? parseFloat(((combinedWins / combinedPlayed) * 100).toFixed(1))
          : 0;
        const kills  = combinedPlayed > 0 ? parseFloat((combinedKills  / combinedPlayed).toFixed(1)) : 0;
        const deaths = combinedPlayed > 0 ? parseFloat((combinedDeaths / combinedPlayed).toFixed(1)) : 0;

        // Peak points (tipagem explícita para evitar literal type 1000)
        let simPoints: number = RANKING_CONFIG.INITIAL_POINTS;
        let peakPoints: number = simPoints;
        for (const won of [...combinedMatchResults].reverse()) {
          simPoints += won ? 3 : -3;
          peakPoints = Math.max(peakPoints, simPoints);
        }

        // Longest win streak
        let streak = 0;
        let longestStreak = 0;
        for (const won of combinedMatchResults) {
          if (won) { streak++; longestStreak = Math.max(longestStreak, streak); }
          else { streak = 0; }
        }

        return sanitizePlayer({
          ...previousStats,
          wins: combinedWins,
          losses: combinedLosses,
          matchesPlayed: combinedPlayed,
          rankingPoints,
          peakRankingPoints: Math.max(peakPoints, previousStats.peakRankingPoints || 0),
          winRate,
          kills,
          deaths,
          kd,
          adr,
          headshotPercentage,
          totalKills:     combinedKills,
          totalDeaths:    combinedDeaths,
          totalDamage:    combinedDamage,
          totalRounds:    combinedRounds,
          totalHeadshots: combinedHeadshots,
          totalFirstKills:     (previousStats.totalFirstKills     || 0) + (newStats.totalFirstKills     || 0),
          totalFirstDeaths:    (previousStats.totalFirstDeaths    || 0) + (newStats.totalFirstDeaths    || 0),
          totalFlashSuccesses: (previousStats.totalFlashSuccesses || 0) + (newStats.totalFlashSuccesses || 0),
          totalKnifeKills:     (previousStats.totalKnifeKills     || 0) + (newStats.totalKnifeKills     || 0),
          longestWinStreak: longestStreak,
          matchADRs:     combinedMatchADRs,
          matchRatings:  combinedMatchRatings,
          matchResults:  combinedMatchResults,
          lastMatchId:   allMatches[0].match_id,
          // Rival / amuleto / kriptonita mantém do cache (histórico completo)
          rivalNickname:    previousStats.rivalNickname,
          rivalMatchCount:  previousStats.rivalMatchCount,
          rivalWins:        previousStats.rivalWins,
          rivalLosses:      previousStats.rivalLosses,
          amuletoNickname:  previousStats.amuletoNickname,
          amuletoWinRate:   previousStats.amuletoWinRate,
          amuletoMatchCount: previousStats.amuletoMatchCount,
          kriptoniaNickname: previousStats.kriptoniaNickname,
          kritoniaWinRate:  previousStats.kritoniaWinRate,
          kritoniaMatchCount: previousStats.kritoniaMatchCount,
        });
      }

      // Sem previousStats: retornar newStats normalmente (primeiro processamento)
      console.log(`   ✅ ${nickname}: Calculado do zero (${allMatches.length} partidas)`);
      return {
        ...newStats,
        lastMatchId: allMatches.length > 0 ? allMatches[0].match_id : undefined,
      };
    } catch (error) {
      console.error(`Erro ao buscar ${nickname}:`, error);
      return null;
    }
  }

  /**
   * Calculate player statistics from a list of matches.
   */
  private async calculateStatsFromMatches(
    matches: any[],
    playerInfo: FaceitPlayer,
    nickname: string
  ): Promise<PlayerStats> {
    let totalKills = 0, totalDeaths = 0, totalDamage = 0, totalRounds = 0, wins = 0, losses = 0;
    let totalHeadshots = 0, totalPentaKills = 0, totalAssists = 0;
    let totalFirstKills = 0, totalFirstDeaths = 0, totalFlashSuccesses = 0, totalKnifeKills = 0;
    let matchADRs: number[] = [];
    let matchRatings: number[] = [];
    let matchResults: boolean[] = [];
    let matchIds: string[] = [];

    // Track opponents to find the biggest rival
    const opponentMap = new Map<string, {
      nickname: string;
      count: number;
      wins: number;
      losses: number;
    }>();

    // Rastrear companheiros de time (amuleto / kriptonita)
    const teammateMap = new Map<string, {
      nickname: string;
      count: number;
      wins: number;
    }>();

    if (matches.length === 0) {
      return this.buildPlayerStats(nickname, playerInfo, {
        wins: 0, losses: 0, matchesPlayed: 0, points: RANKING_CONFIG.INITIAL_POINTS,
        totalKills: 0, totalDeaths: 0, totalDamage: 0, totalRounds: 0,
        totalHeadshots: 0, totalPentaKills: 0, totalAssists: 0,
        totalFirstKills: 0, totalFirstDeaths: 0, totalFlashSuccesses: 0, totalKnifeKills: 0,
        matchADRs: [], matchRatings: [], matchResults: [], matchIds: [],
        rivalNickname: undefined,
        rivalMatchCount: 0,
        rivalWins: 0,
        rivalLosses: 0,
      });
    }

    const chunks = [];
    for (let i = 0; i < matches.length; i += PARALLEL_MATCHES) {
      chunks.push(matches.slice(i, i + PARALLEL_MATCHES));
    }

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const matchStatsPromises = chunk.map(async (match: any) => {
        try {
          const matchStats: any = await this.request(`/matches/${match.match_id}/stats`);
          let matchKills = 0, matchDeaths = 0, matchDamage = 0, matchHeadshots = 0, matchPentaKills = 0, matchAssists = 0;
          let matchFirstKills = 0, matchFirstDeaths = 0, matchFlashSuccesses = 0, matchKnifeKills = 0;
          const rounds = matchStats.rounds || [];
          const firstRound = rounds[0];
          const matchRounds = firstRound?.round_stats?.Rounds 
            ? parseInt(firstRound.round_stats.Rounds) 
            : rounds.length;
          
          for (const round of rounds) {
            const allPlayers = [
              ...(round.teams?.[0]?.players || []),
              ...(round.teams?.[1]?.players || [])
            ];
            const playerStats = allPlayers.find((p: any) => p.player_id === playerInfo.player_id);
            if (playerStats) {
              const ps = playerStats.player_stats || {};
              matchKills          += parseInt(ps.Kills               || '0');
              matchDeaths         += parseInt(ps.Deaths              || '0');
              matchAssists        += parseInt(ps.Assists             || '0');
              matchDamage         += Math.round(parseFloat(ps.ADR   || '0') * matchRounds);
              matchHeadshots      += parseInt(ps.Headshots           || '0');
              matchPentaKills     += parseInt(ps['Penta Kills']     || '0');
              matchFirstKills     += parseInt(ps['First Kills']     || '0');
              // FACEIT API não tem "First Deaths" — calcular como Entry Count - Entry Wins
              const entryCount = parseInt(ps['Entry Count'] || '0');
              const entryWins  = parseInt(ps['Entry Wins']  || '0');
              matchFirstDeaths += Math.max(0, entryCount - entryWins);
              matchFlashSuccesses += parseInt(ps['Flash Successes'] || '0');
              matchKnifeKills     += parseInt(ps['Knife Kills']     || '0');
            }
          }
          
          const playerTeam = match.teams?.faction1?.players?.some((p: any) => p.player_id === playerInfo.player_id)
            ? 'faction1' : 'faction2';
          const won = match.results?.winner === playerTeam;

          // Rastrear oponentes desta partida (rival)
          const opponentTeam = playerTeam === 'faction1' ? 'faction2' : 'faction1';
          const opponents = match.teams?.[opponentTeam]?.players || [];
          for (const opponent of opponents) {
            const oppNickname = opponent.nickname;
            if (!opponentMap.has(oppNickname)) {
              opponentMap.set(oppNickname, { nickname: oppNickname, count: 0, wins: 0, losses: 0 });
            }
            const rivalStats = opponentMap.get(oppNickname)!;
            rivalStats.count++;
            if (won) rivalStats.wins++; else rivalStats.losses++;
          }

          // Rastrear companheiros de time (amuleto / kriptonita)
          const teammates = (match.teams?.[playerTeam]?.players || []) as any[];
          for (const teammate of teammates) {
            if (teammate.player_id === playerInfo.player_id) continue;
            const tmNickname = teammate.nickname;
            if (!teammateMap.has(tmNickname)) {
              teammateMap.set(tmNickname, { nickname: tmNickname, count: 0, wins: 0 });
            }
            const tmStats = teammateMap.get(tmNickname)!;
            tmStats.count++;
            if (won) tmStats.wins++;
          }

          const matchADR = matchRounds > 0 ? matchDamage / matchRounds : 0;
          
          return { matchId: match.match_id, kills: matchKills, deaths: matchDeaths, assists: matchAssists, damage: matchDamage, rounds: matchRounds, headshots: matchHeadshots, pentaKills: matchPentaKills, firstKills: matchFirstKills, firstDeaths: matchFirstDeaths, flashSuccesses: matchFlashSuccesses, knifeKills: matchKnifeKills, adr: matchADR, won };
        } catch (error) {
          return null;
        }
      });

      const chunkResults = await Promise.all(matchStatsPromises);
      for (const result of chunkResults) {
        if (result) {
          totalKills      += result.kills;
          totalDeaths     += result.deaths;
          totalDamage     += result.damage;
          totalRounds     += result.rounds;
          totalHeadshots  += result.headshots;
          totalPentaKills     += result.pentaKills;
          totalAssists        += result.assists;
          totalFirstKills     += result.firstKills;
          totalFirstDeaths    += result.firstDeaths;
          totalFlashSuccesses += result.flashSuccesses;
          totalKnifeKills     += result.knifeKills;
          matchADRs.push(result.adr);
          matchRatings.push(calculateSimplifiedRating({ totalKills: result.kills, totalDeaths: result.deaths, totalDamage: result.damage, totalRounds: result.rounds, totalHeadshots: result.headshots }));
          matchResults.push(result.won);
          matchIds.push(result.matchId);
          if (result.won) wins++; else losses++;
        }
      }
      if (chunkIndex < chunks.length - 1) await this.delay(DELAY_BETWEEN_CHUNKS);
    }

    const matchesPlayed = wins + losses;
    const points = RANKING_CONFIG.INITIAL_POINTS + (wins * 3) - (losses * 3);

    // Encontrar maior rival (mais encontros, desempate alfabético)
    let biggestRival = null;
    for (const rival of opponentMap.values()) {
      if (!biggestRival ||
          rival.count > biggestRival.count ||
          (rival.count === biggestRival.count && rival.nickname < biggestRival.nickname)) {
        biggestRival = rival;
      }
    }

    // Amuleto (maior win rate junto, mín. 3 partidas) / Kriptonita (menor win rate, mín. 3 partidas)
    const MIN_TEAMMATE_GAMES = 3;
    let amuleto: { nickname: string; winRate: number; count: number } | null = null;
    let kriptonita: { nickname: string; winRate: number; count: number } | null = null;
    for (const tm of teammateMap.values()) {
      if (tm.count < MIN_TEAMMATE_GAMES) continue;
      const wr = (tm.wins / tm.count) * 100;
      if (!amuleto || wr > amuleto.winRate || (wr === amuleto.winRate && tm.count > amuleto.count)) {
        amuleto = { nickname: tm.nickname, winRate: wr, count: tm.count };
      }
      if (!kriptonita || wr < kriptonita.winRate || (wr === kriptonita.winRate && tm.count > kriptonita.count)) {
        kriptonita = { nickname: tm.nickname, winRate: wr, count: tm.count };
      }
    }

    return this.buildPlayerStats(nickname, playerInfo, {
      wins, losses, matchesPlayed, points, totalKills, totalDeaths, totalDamage, totalRounds,
      totalHeadshots, totalPentaKills, totalAssists,
      totalFirstKills, totalFirstDeaths, totalFlashSuccesses, totalKnifeKills,
      matchADRs, matchRatings, matchResults,
      rivalNickname: biggestRival?.nickname,
      rivalMatchCount: biggestRival?.count || 0,
      rivalWins: biggestRival?.wins || 0,
      rivalLosses: biggestRival?.losses || 0,
      amuletoNickname: amuleto?.nickname,
      amuletoWinRate: amuleto ? parseFloat(amuleto.winRate.toFixed(1)) : undefined,
      amuletoMatchCount: amuleto?.count,
      kriptoniaNickname: kriptonita?.nickname,
      kritoniaWinRate: kriptonita ? parseFloat(kriptonita.winRate.toFixed(1)) : undefined,
      kritoniaMatchCount: kriptonita?.count,
    });
  }

}

let faceitServiceInstance: FaceitService | null = null;

export function getFaceitService(apiKey?: string): FaceitService {
  if (!faceitServiceInstance) {
    if (!apiKey) {
      throw new Error('FACEIT API Key is required');
    }
    faceitServiceInstance = new FaceitService({ apiKey });
  }
  return faceitServiceInstance;
}

export { FaceitService };
export type { FaceitServiceConfig };