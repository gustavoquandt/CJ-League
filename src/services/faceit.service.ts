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

const QUEUE_ID = process.env.NEXT_PUBLIC_COMPETITION_ID || 'f2dec63c-b3c1-4df6-8193-0b83fc6640ef';

// CONFIGURAÇÕES CONSERVADORAS
const HISTORY_PAGES = 5;              // 5 páginas = 100 partidas
const PARALLEL_MATCHES = 3;           // 3 partidas em paralelo
const REQUEST_TIMEOUT = 20000;        // 20s timeout
const MIN_DELAY_BETWEEN_REQUESTS = 1200; // 1.2s entre requests
const DELAY_BETWEEN_CHUNKS = 1500;    // 1.5s entre chunks

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
            const matchRounds = rounds.length;
            
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

      console.log(`   ✅ ${nickname}: ${wins}W/${losses}L (${queueMatches.length} partidas)`);

      return { 
        wins, losses, matchesPlayed, points, lastMatchId,
        totalKills, totalDeaths, totalDamage, totalRounds,
        totalHeadshots, matchADRs, matchResults  // ✅ NOVO
      };
      
    } catch (error) {
      console.error(`   ❌ ${nickname}: Erro`);
      return { 
        wins: 0, losses: 0, matchesPlayed: 0, points: RANKING_CONFIG.INITIAL_POINTS,
        totalKills: 0, totalDeaths: 0, totalDamage: 0, totalRounds: 0,
        totalHeadshots: 0, matchADRs: [], matchResults: []  // ✅ NOVO
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
      totalHeadshots, matchADRs, matchResults  // ✅ NOVO
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

    const lifetime = stats?.lifetime as any;
    const assists = parseStatValue(lifetime?.['Average Assists']) || 0;
    const kr = parseStatValue(lifetime?.['K/R Ratio']) || 0;
    const currentStreak = parseStatValue(lifetime?.['Current Win Streak']) || 0;

    const winRate = matchesPlayed > 0 
      ? parseFloat(((wins / matchesPlayed) * 100).toFixed(1))
      : 0;

    const pot = PLAYER_POTS[nickname];

    return sanitizePlayer({
      playerId, nickname, avatar, country, pot,
      rankingPoints: points, position: 0,
      matchesPlayed, wins, losses, winRate,
      kills, deaths, assists, kd, kr, adr,
      headshotPercentage, faceitElo, skillLevel,
      currentStreak, longestWinStreak, lastMatchId,
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
          await this.delay(800);
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

      // ✅ Se tem stats anteriores, ACUMULAR com as novas
      if (previousStats && allMatches.length > 0) {
        console.log(`   📊 Acumulando: ${previousStats.matchesPlayed} antigas + ${allMatches.length} novas`);
        
        // Acumular totais
        const totalKills = (previousStats.totalKills || previousStats.kills || 0) + (newStats.totalKills || newStats.kills || 0);
        const totalDeaths = (previousStats.totalDeaths || previousStats.deaths || 0) + (newStats.totalDeaths || newStats.deaths || 0);
        const totalDamage = (previousStats.totalDamage || 0) + (newStats.totalDamage || 0);
        const totalRounds = (previousStats.totalRounds || 0) + (newStats.totalRounds || 0);
        const totalMatches = previousStats.matchesPlayed + newStats.matchesPlayed;
        
        return {
          ...newStats,
          matchesPlayed: totalMatches,
          wins: previousStats.wins + newStats.wins,
          losses: previousStats.losses + newStats.losses,
          totalKills,
          totalDeaths,
          totalDamage,
          totalRounds,
          // Recalcular médias com totais acumulados
          kd: totalDeaths > 0 ? parseFloat((totalKills / totalDeaths).toFixed(2)) : totalKills,
          adr: totalRounds > 0 ? parseFloat((totalDamage / totalRounds).toFixed(1)) : 0,
          winRate: totalMatches > 0 ? parseFloat(((previousStats.wins + newStats.wins) / totalMatches * 100).toFixed(1)) : 0,
          rankingPoints: previousStats.rankingPoints + newStats.rankingPoints,
          lastMatchId: allMatches.length > 0 ? allMatches[0].match_id : previousStats.lastMatchId,
        };
      }

      // ✅ Se não tem stats anteriores, retornar as novas normalmente
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

    if (matches.length === 0) {
      return this.buildPlayerStats(nickname, playerInfo, {
        wins: 0, losses: 0, matchesPlayed: 0, points: RANKING_CONFIG.INITIAL_POINTS,
        totalKills: 0, totalDeaths: 0, totalDamage: 0, totalRounds: 0,
        totalHeadshots: 0, matchADRs: [], matchResults: [],  // ✅ NOVO
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
          const matchRounds = rounds.length;
          
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

    return this.buildPlayerStats(nickname, playerInfo, {
      wins, losses, matchesPlayed, points, totalKills, totalDeaths, totalDamage, totalRounds,
      totalHeadshots, matchADRs, matchResults,  // ✅ NOVO
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