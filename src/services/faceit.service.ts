/**
 * VERSÃO COM PROCESSAMENTO EM BATCHES
 * Processa 5 jogadores por vez para evitar timeout
 */

import type {
  FaceitPlayer,
  FaceitPlayerStats,
} from '@/types/faceit.types';
import type { PlayerStats } from '@/types/app.types';
import {
  FACEIT_API,
  PLAYER_POTS,
  PLAYER_NICKNAMES,
  RANKING_CONFIG,
} from '@/config/constants';
import {
  parseStatValue,
  parsePercentage,
  sanitizePlayer,
} from '@/utils/stats.utils';
import { calculateSimplifiedRating } from '@/utils/rating.utils';

const QUEUE_ID = process.env.NEXT_PUBLIC_COMPETITION_ID || 'f2dec63c-b3c1-4df6-8193-0b83fc6640ef';

// CONFIGURAÇÕES CONSERVADORAS
const HISTORY_PAGES = 10;              // 10 páginas = 200 partidas
const PARALLEL_MATCHES = 3;           // 3 partidas em paralelo
const REQUEST_TIMEOUT = 20000;        // 20s timeout
const MIN_DELAY_BETWEEN_REQUESTS = 1000; // FACEIT permite 60 req/min = 1000ms exato
const DELAY_BETWEEN_CHUNKS = 1000;    // 1s entre chunks

interface FaceitServiceConfig {
  apiKey: string;
  baseUrl?: string;
}

interface FetchProgress {
  total: number;
  current: number;
  currentPlayer: string;
  percentage: number;
}

type ProgressCallback = (progress: FetchProgress) => void;

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
  totalHeadshots: number;      // ✅ NOVO
  matchADRs: number[];          // ✅ NOVO
  matchResults: boolean[];      // ✅ NOVO
  rivalNickname?: string;       // ✅ NOVO: Maior rival
  rivalMatchCount?: number;     // ✅ NOVO
  rivalWins?: number;           // ✅ NOVO
  rivalLosses?: number;         // ✅ NOVO
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

  async getPlayerStats(playerId: string): Promise<FaceitPlayerStats | null> {
    try {
      const endpoint = FACEIT_API.ENDPOINTS.PLAYER_STATS.replace('{player_id}', playerId);
      return await this.request<FaceitPlayerStats>(endpoint);
    } catch (error) {
      return null;
    }
  }

  async getPlayerMatchesInQueue(playerId: string, nickname: string): Promise<QueuePlayerStats> {
    let wins = 0;
    let losses = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalDamage = 0;
    let totalRounds = 0;
    let lastMatchId: string | undefined = undefined;
    let totalHeadshots = 0;  // ✅ NOVO
    let matchADRs: number[] = [];  // ✅ NOVO
    let matchResults: boolean[] = [];  // ✅ NOVO
    
    // ✅ NOVO: Rastrear oponentes (maior rival)
    const opponentMap = new Map<string, {
      nickname: string;
      count: number;
      wins: number;
      losses: number;
    }>();
    
    try {
      // Buscar páginas SEQUENCIALMENTE
      const allMatches = [];
      for (let page = 0; page < HISTORY_PAGES; page++) {
        const offset = page * 20;
        const endpoint = `/players/${playerId}/history?game=cs2&offset=${offset}&limit=20`;
        const result: any = await this.request(endpoint);
        allMatches.push(...(result.items || []));
        
        if (page < HISTORY_PAGES - 1) {
          await this.delay(600);
        }
      }
      
      if (allMatches.length === 0) {
        return {
          wins: 0, losses: 0, matchesPlayed: 0, points: RANKING_CONFIG.INITIAL_POINTS,
          totalKills: 0, totalDeaths: 0, totalDamage: 0, totalRounds: 0,
          totalHeadshots: 0, matchADRs: [], matchResults: []  // ✅ NOVO
        };
      }

      const queueMatches = allMatches.filter((match: any) => match.competition_id === QUEUE_ID);

      if (queueMatches.length === 0) {
        return {
          wins: 0, losses: 0, matchesPlayed: 0, points: RANKING_CONFIG.INITIAL_POINTS,
          totalKills: 0, totalDeaths: 0, totalDamage: 0, totalRounds: 0,
          totalHeadshots: 0, matchADRs: [], matchResults: []  // ✅ NOVO
        };
      }

      lastMatchId = queueMatches[0]?.match_id;

      // Processar partidas em chunks
      const chunks = [];
      for (let i = 0; i < queueMatches.length; i += PARALLEL_MATCHES) {
        chunks.push(queueMatches.slice(i, i + PARALLEL_MATCHES));
      }

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        
        const matchStatsPromises = chunk.map(async (match: any) => {
          try {
            const matchStats: any = await this.request(`/matches/${match.match_id}/stats`);
            
            let matchKills = 0;
            let matchDeaths = 0;
            let matchDamage = 0;
            let matchHeadshots = 0;  // ✅ NOVO
            
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
              
              const playerStats = allPlayers.find((p: any) => p.player_id === playerId);
              
              if (playerStats) {
                matchKills += parseInt(playerStats.player_stats?.Kills || '0');
                matchDeaths += parseInt(playerStats.player_stats?.Deaths || '0');
                matchDamage += parseInt(playerStats.player_stats?.Damage || '0');
                matchHeadshots += parseInt(playerStats.player_stats?.Headshots || '0');  // ✅ NOVO
              }
            }
            
            const playerTeam = match.teams?.faction1?.players?.some((p: any) => p.player_id === playerId)
              ? 'faction1'
              : 'faction2';
            
            const won = match.results?.winner === playerTeam;

            // ✅ NOVO: Rastrear oponentes desta partida
            const opponentTeam = playerTeam === 'faction1' ? 'faction2' : 'faction1';
            const opponents = match.teams?.[opponentTeam]?.players || [];
            
            for (const opponent of opponents) {
              const oppNickname = opponent.nickname;
              
              if (!opponentMap.has(oppNickname)) {
                opponentMap.set(oppNickname, {
                  nickname: oppNickname,
                  count: 0,
                  wins: 0,
                  losses: 0
                });
              }
              
              const rivalStats = opponentMap.get(oppNickname)!;
              rivalStats.count++;
              
              if (won) {
                rivalStats.wins++;
              } else {
                rivalStats.losses++;
              }
            }

            // ✅ NOVO: Calcular ADR da partida
            const matchADR = matchRounds > 0 ? matchDamage / matchRounds : 0;
            
            return { kills: matchKills, deaths: matchDeaths, damage: matchDamage, rounds: matchRounds, headshots: matchHeadshots, adr: matchADR, won };  // ✅ MODIFICADO
            
          } catch (error) {
            return null;
          }
        });

        const chunkResults = await Promise.all(matchStatsPromises);
        
        for (const result of chunkResults) {
          if (result) {
            totalKills += result.kills;
            totalDeaths += result.deaths;
            totalDamage += result.damage;
            totalRounds += result.rounds;
            totalHeadshots += result.headshots;  // ✅ NOVO
            matchADRs.push(result.adr);  // ✅ NOVO
            matchResults.push(result.won);  // ✅ NOVO
            if (result.won) wins++;
            else losses++;
          }
        }
        
        if (chunkIndex < chunks.length - 1) {
          await this.delay(DELAY_BETWEEN_CHUNKS);
        }
      }

      const matchesPlayed = wins + losses;
      const points = RANKING_CONFIG.INITIAL_POINTS + (wins * 3) - (losses * 3);

      // ✅ NOVO: Encontrar maior rival (com desempate por ordem alfabética)
      let biggestRival = null;
      for (const rival of opponentMap.values()) {
        if (!biggestRival || 
            rival.count > biggestRival.count ||
            (rival.count === biggestRival.count && rival.nickname < biggestRival.nickname)) {
          biggestRival = rival;
        }
      }

      console.log(`   ✅ ${nickname}: ${wins}W/${losses}L (${queueMatches.length} partidas)`);

      return { 
        wins, losses, matchesPlayed, points, lastMatchId,
        totalKills, totalDeaths, totalDamage, totalRounds,
        totalHeadshots, matchADRs, matchResults,  // ✅ NOVO
        rivalNickname: biggestRival?.nickname,
        rivalMatchCount: biggestRival?.count || 0,
        rivalWins: biggestRival?.wins || 0,
        rivalLosses: biggestRival?.losses || 0,
      };
      
    } catch (error) {
      console.error(`   ❌ ${nickname}: Erro`);
      return { 
        wins: 0, losses: 0, matchesPlayed: 0, points: RANKING_CONFIG.INITIAL_POINTS,
        totalKills: 0, totalDeaths: 0, totalDamage: 0, totalRounds: 0,
        totalHeadshots: 0, matchADRs: [], matchResults: [],  // ✅ NOVO
        rivalNickname: undefined,
        rivalMatchCount: 0,
        rivalWins: 0,
        rivalLosses: 0,
      };
    }
  }

  async getConsolidatedPlayerData(nickname: string): Promise<PlayerStats | null> {
    try {
      const playerInfo = await this.getPlayerByNickname(nickname);
      if (!playerInfo) return null;

      const queueStats = await this.getPlayerMatchesInQueue(playerInfo.player_id, nickname);
      const stats = await this.getPlayerStats(playerInfo.player_id);

      return this.buildPlayerStats(nickname, playerInfo, queueStats, stats);
    } catch (error) {
      return null;
    }
  }

  private buildPlayerStats(
    nickname: string,
    player: FaceitPlayer,
    queueStats: QueuePlayerStats,
    stats?: FaceitPlayerStats | null
  ): PlayerStats {
    const playerId = player.player_id;
    const avatar = player.avatar;
    const country = player.country;
    const faceitElo = player.faceit_elo || 0;
    const skillLevel = player.skill_level || 0;

    const { 
      wins, losses, matchesPlayed, points, lastMatchId, 
      totalKills, totalDeaths, totalDamage, totalRounds,
      totalHeadshots, matchADRs, matchResults,  // ✅ NOVO
      rivalNickname, rivalMatchCount, rivalWins, rivalLosses  // ✅ NOVO: Rival
    } = queueStats;
    
    const kd = totalDeaths > 0 ? parseFloat((totalKills / totalDeaths).toFixed(2)) : 0;
    
    // ✅ NOVO: ADR correto (média dos ADRs individuais)
    const adr = matchADRs.length > 0 
      ? parseFloat((matchADRs.reduce((sum, adr) => sum + adr, 0) / matchADRs.length).toFixed(1))
      : 0;
    
    const kills = matchesPlayed > 0 ? parseFloat((totalKills / matchesPlayed).toFixed(1)) : 0;
    const deaths = matchesPlayed > 0 ? parseFloat((totalDeaths / matchesPlayed).toFixed(1)) : 0;

    // ✅ NOVO: HS% calculado das partidas
    const headshotPercentage = totalKills > 0 
      ? parseFloat(((totalHeadshots / totalKills) * 100).toFixed(1))
      : 0;

    // ✅ NOVO: WinStreak calculado da sequência de vitórias
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

    // ✅ NOVO: Calcular maior pontuação já alcançada (peak)
    // Simula o histórico de pontos partida por partida
    let currentPoints: number = RANKING_CONFIG.INITIAL_POINTS; // 1000
    let peakPoints: number = currentPoints;
    
    // Assume que matchResults está em ordem cronológica (mais antiga → mais recente)
    for (const won of matchResults.reverse()) { // Reverse porque API retorna mais recente primeiro
      currentPoints += won ? 3 : -3;
      peakPoints = Math.max(peakPoints, currentPoints);
    }
    const peakRankingPoints = peakPoints;

    const lifetime = stats?.lifetime as any;
    const assists = parseStatValue(lifetime?.['Average Assists']) || 0;
    const kr = parseStatValue(lifetime?.['K/R Ratio']) || 0;
    const currentStreak = parseStatValue(lifetime?.['Current Win Streak']) || 0;

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
      peakRankingPoints,  // ✅ NOVO: Maior pontuação histórica
      position: 0,
      matchesPlayed, wins, losses, winRate,
      kills, deaths, assists, kd, kr, adr,
      headshotPercentage, faceitElo, skillLevel,
      currentStreak, longestWinStreak, lastMatchId,
      totalKills, totalDeaths, totalDamage, totalRounds,  // ✅ ADICIONADO para salvar no Redis
      rivalNickname, rivalMatchCount, rivalWins, rivalLosses,  // ✅ NOVO: Maior rival
    });
  }

  /**
   * ✅ NOVO: Buscar jogador com suas partidas (até 200)
   * Suporta busca incremental a partir do lastMatchId
   * Aceita previousStats para acumular estatísticas
   */
  async fetchPlayerWithMatches(
    nickname: string,
    maxMatches: number = 200,
    lastMatchId?: string | null,
    queueId?: string, // ✅ Queue ID opcional (para seasons)
    previousStats?: PlayerStats | null // ✅ NOVO: Stats anteriores para acumular
  ): Promise<(PlayerStats & { lastMatchId?: string }) | null> {
    try {
      const playerInfo = await this.getPlayerByNickname(nickname);
      if (!playerInfo) return null;

      // ✅ Usar queue passada ou padrão
      const QUEUE_TO_USE = queueId || QUEUE_ID;

      const allMatches: any[] = [];
      let offset = 0;
      const limit = 100;
      let foundLastMatch = false;

      while (allMatches.length < maxMatches && !foundLastMatch) {
        const endpoint = `/players/${playerInfo.player_id}/history?game=cs2&offset=${offset}&limit=${limit}`;
        const matchesResponse: any = await this.request(endpoint);

        if (!matchesResponse?.items || matchesResponse.items.length === 0) break;

        // ✅ Filtrar pela queue correta
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
          await this.delay(500);
        }
      }

      console.log(`   Buscou ${allMatches.length} partidas NOVAS para ${nickname}`);
      
      // ✅ Se tem stats anteriores e não há partidas novas, retornar as antigas
      if (allMatches.length === 0 && previousStats) {
        console.log(`   ⚡ Sem partidas novas - Mantendo stats antigas (${previousStats.matchesPlayed} partidas)`);
        return {
          ...previousStats,
          lastMatchId: previousStats.lastMatchId,
        };
      }
      
      const newStats = await this.calculateStatsFromMatches(allMatches, playerInfo, nickname);

      // ✅ ACUMULAÇÃO: só acumula se:
      // 1. Tem stats anteriores (previousStats)
      // 2. Tem partidas novas (allMatches.length > 0)  
      // 3. Encontrou o ponto de parada (foundLastMatch) = só partidas realmente novas
      //    Se lastMatchId era null, foundLastMatch=false → recalcula do zero (correto)
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
          longestWinStreak: longestStreak,
          matchADRs:     combinedMatchADRs,
          matchResults:  combinedMatchResults,
          lastMatchId:   allMatches[0].match_id,
          // Rival mantém o do cache (tem histórico completo)
          rivalNickname:  previousStats.rivalNickname,
          rivalMatchCount: previousStats.rivalMatchCount,
          rivalWins:      previousStats.rivalWins,
          rivalLosses:    previousStats.rivalLosses,
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
   * ✅ NOVO: Calcular estatísticas a partir das partidas
   */
  private async calculateStatsFromMatches(
    matches: any[],
    playerInfo: FaceitPlayer,
    nickname: string
  ): Promise<PlayerStats> {
    let totalKills = 0, totalDeaths = 0, totalDamage = 0, totalRounds = 0, wins = 0, losses = 0;
    let totalHeadshots = 0;  // ✅ NOVO
    let matchADRs: number[] = [];  // ✅ NOVO
    let matchResults: boolean[] = [];  // ✅ NOVO
    
    // ✅ NOVO: Rastrear oponentes (maior rival)
    const opponentMap = new Map<string, {
      nickname: string;
      count: number;
      wins: number;
      losses: number;
    }>();

    if (matches.length === 0) {
      return this.buildPlayerStats(nickname, playerInfo, {
        wins: 0, losses: 0, matchesPlayed: 0, points: RANKING_CONFIG.INITIAL_POINTS,
        totalKills: 0, totalDeaths: 0, totalDamage: 0, totalRounds: 0,
        totalHeadshots: 0, matchADRs: [], matchResults: [],  // ✅ NOVO
        rivalNickname: undefined,
        rivalMatchCount: 0,
        rivalWins: 0,
        rivalLosses: 0,
      }, null);
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
          let matchKills = 0, matchDeaths = 0, matchDamage = 0, matchHeadshots = 0;  // ✅ NOVO
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
              matchKills += parseInt(playerStats.player_stats?.Kills || '0');
              matchDeaths += parseInt(playerStats.player_stats?.Deaths || '0');
              matchDamage += parseInt(playerStats.player_stats?.Damage || '0');
              matchHeadshots += parseInt(playerStats.player_stats?.Headshots || '0');  // ✅ NOVO
            }
          }
          
          const playerTeam = match.teams?.faction1?.players?.some((p: any) => p.player_id === playerInfo.player_id)
            ? 'faction1' : 'faction2';
          const won = match.results?.winner === playerTeam;

          // ✅ NOVO: Rastrear oponentes desta partida
          const opponentTeam = playerTeam === 'faction1' ? 'faction2' : 'faction1';
          const opponents = match.teams?.[opponentTeam]?.players || [];
          
          for (const opponent of opponents) {
            const oppNickname = opponent.nickname;
            
            if (!opponentMap.has(oppNickname)) {
              opponentMap.set(oppNickname, {
                nickname: oppNickname,
                count: 0,
                wins: 0,
                losses: 0
              });
            }
            
            const rivalStats = opponentMap.get(oppNickname)!;
            rivalStats.count++;
            
            if (won) {
              rivalStats.wins++;
            } else {
              rivalStats.losses++;
            }
          }

          // ✅ NOVO: Calcular ADR da partida
          const matchADR = matchRounds > 0 ? matchDamage / matchRounds : 0;
          
          return { kills: matchKills, deaths: matchDeaths, damage: matchDamage, rounds: matchRounds, headshots: matchHeadshots, adr: matchADR, won };  // ✅ MODIFICADO
        } catch (error) {
          return null;
        }
      });

      const chunkResults = await Promise.all(matchStatsPromises);
      for (const result of chunkResults) {
        if (result) {
          totalKills += result.kills;
          totalDeaths += result.deaths;
          totalDamage += result.damage;
          totalRounds += result.rounds;
          totalHeadshots += result.headshots;  // ✅ NOVO
          matchADRs.push(result.adr);  // ✅ NOVO
          matchResults.push(result.won);  // ✅ NOVO
          if (result.won) wins++; else losses++;
        }
      }
      if (chunkIndex < chunks.length - 1) await this.delay(DELAY_BETWEEN_CHUNKS);
    }

    const matchesPlayed = wins + losses;
    const points = RANKING_CONFIG.INITIAL_POINTS + (wins * 3) - (losses * 3);

    // ✅ NOVO: Encontrar maior rival (com desempate por ordem alfabética)
    let biggestRival = null;
    for (const rival of opponentMap.values()) {
      if (!biggestRival || 
          rival.count > biggestRival.count ||
          (rival.count === biggestRival.count && rival.nickname < biggestRival.nickname)) {
        biggestRival = rival;
      }
    }

    return this.buildPlayerStats(nickname, playerInfo, {
      wins, losses, matchesPlayed, points, totalKills, totalDeaths, totalDamage, totalRounds,
      totalHeadshots, matchADRs, matchResults,  // ✅ NOVO
      rivalNickname: biggestRival?.nickname,
      rivalMatchCount: biggestRival?.count || 0,
      rivalWins: biggestRival?.wins || 0,
      rivalLosses: biggestRival?.losses || 0,
    }, null);
  }

  /**
   * PROCESSAR UM BATCH DE JOGADORES
   * Retorna os jogadores processados
   */
  async fetchPlayersBatch(
    playerNicknames: string[],
    onProgress?: ProgressCallback
  ): Promise<PlayerStats[]> {
    console.log(`📦 Processando batch de ${playerNicknames.length} jogadores`);
    
    const players: PlayerStats[] = [];

    for (let i = 0; i < playerNicknames.length; i++) {
      const nickname = playerNicknames[i];
      
      console.log(`   [${i + 1}/${playerNicknames.length}] ${nickname}`);

      if (onProgress) {
        onProgress({
          total: playerNicknames.length,
          current: i + 1,
          currentPlayer: nickname,
          percentage: Math.round(((i + 1) / playerNicknames.length) * 100),
        });
      }

      const player = await this.getConsolidatedPlayerData(nickname);
      
      if (player) {
        players.push(player);
      }
    }

    return players;
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  resetRequestCount(): void {
    this.requestCount = 0;
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
export type { FaceitServiceConfig, FetchProgress, ProgressCallback };