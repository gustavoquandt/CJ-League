/**
 * Serviço FACEIT - 100 PARTIDAS COM MÁXIMO PARALELISMO
 * Meta: < 300 segundos processando TUDO em paralelo
 */

import type {
  FaceitPlayer,
  FaceitPlayerStats,
  FaceitMatch,
  FaceitApiError,
} from '@/types/faceit.types';
import type { PlayerStats } from '@/types/app.types';
import {
  FACEIT_API,
  HUB_CONFIG,
  PLAYER_POTS,
  PLAYER_NICKNAMES,
  RANKING_CONFIG,
} from '@/config/constants';
import {
  parseStatValue,
  parsePercentage,
  calculateKD,
  sanitizePlayer,
} from '@/utils/stats.utils';

const CLUB_ID = process.env.NEXT_PUBLIC_HUB_ID || '42393c93-5da0-4a6b-bcda-32de8d727658';
const QUEUE_ID = process.env.NEXT_PUBLIC_COMPETITION_ID || 'f2dec63c-b3c1-4df6-8193-0b83fc6640ef';

// CONFIGURAÇÕES DE MÁXIMO DESEMPENHO
const HISTORY_PAGES = 5; // 5 páginas × 20 = 100 partidas
const PARALLEL_PAGES = 5; // Buscar TODAS as 5 páginas ao mesmo tempo
const PARALLEL_MATCHES = 10; // Buscar 10 partidas em paralelo
const PARALLEL_PLAYERS = 5; // Processar 5 jogadores ao mesmo tempo
const REQUEST_TIMEOUT = 6000; // 6s timeout (rápido)

interface FaceitServiceConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  retries?: number;
  delay?: number;
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
}

class FaceitService {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private defaultRetries: number;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor(config: FaceitServiceConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || FACEIT_API.BASE_URL;
    this.timeout = REQUEST_TIMEOUT;
    this.defaultRetries = 1; // Falha rápido
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = 50; // MUITO rápido: 50ms

    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest;
      await this.delay(waitTime);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      retries = this.defaultRetries,
      delay = 300,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.waitForRateLimit();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Not found: ${endpoint}`);
          }

          if (response.status === 429) {
            await this.delay(1000);
            continue;
          }

          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        return data as T;

      } catch (error) {
        lastError = error as Error;
        if (attempt === retries) break;
        await this.delay(delay);
      }
    }

    throw lastError || new Error('Request failed');
  }

  async getPlayerByNickname(nickname: string): Promise<FaceitPlayer | null> {
    try {
      const endpoint = `${FACEIT_API.ENDPOINTS.PLAYERS}?nickname=${encodeURIComponent(nickname)}&game=cs2`;
      return await this.request<FaceitPlayer>(endpoint);
    } catch (error) {
      console.error(`❌ ${nickname}: Não encontrado`);
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

  /**
   * VERSÃO ULTRA OTIMIZADA - 100 partidas em paralelo máximo
   */
  async getPlayerMatchesInQueue(playerId: string, nickname: string): Promise<QueuePlayerStats> {
    console.log(`   🔍 ${nickname}...`);
    
    let wins = 0;
    let losses = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalDamage = 0;
    let totalRounds = 0;
    let lastMatchId: string | undefined = undefined;
    
    try {
      // FASE 1: Buscar TODAS as 5 páginas EM PARALELO (não sequencial!)
      const pagePromises = [];
      for (let page = 0; page < HISTORY_PAGES; page++) {
        const offset = page * 20;
        const endpoint = `/players/${playerId}/history?game=cs2&offset=${offset}&limit=20`;
        pagePromises.push(this.request(endpoint).catch(() => ({ items: [] })));
      }

      const pageResults: any[] = await Promise.all(pagePromises);
      
      // Juntar todas as partidas
      const allMatches = pageResults.flatMap(result => result.items || []);
      
      if (allMatches.length === 0) {
        return {
          wins: 0, losses: 0, matchesPlayed: 0, points: RANKING_CONFIG.INITIAL_POINTS,
          totalKills: 0, totalDeaths: 0, totalDamage: 0, totalRounds: 0
        };
      }

      // Filtrar apenas partidas da queue
      const queueMatches = allMatches.filter((match: any) => match.competition_id === QUEUE_ID);

      if (queueMatches.length === 0) {
        return {
          wins: 0, losses: 0, matchesPlayed: 0, points: RANKING_CONFIG.INITIAL_POINTS,
          totalKills: 0, totalDeaths: 0, totalDamage: 0, totalRounds: 0
        };
      }

      lastMatchId = queueMatches[0]?.match_id;

      // FASE 2: Buscar stats de TODAS as partidas EM PARALELO
      // Dividir em chunks de 10 para não sobrecarregar
      const chunks = [];
      for (let i = 0; i < queueMatches.length; i += PARALLEL_MATCHES) {
        chunks.push(queueMatches.slice(i, i + PARALLEL_MATCHES));
      }

      for (const chunk of chunks) {
        const matchStatsPromises = chunk.map(async (match: any) => {
          try {
            const matchStats: any = await this.request(`/matches/${match.match_id}/stats`);
            
            let matchKills = 0;
            let matchDeaths = 0;
            let matchDamage = 0;
            let matchRounds = 0;
            
            const rounds = matchStats.rounds || [];
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
                matchRounds++;
              }
            }
            
            const playerTeam = match.teams?.faction1?.players?.some((p: any) => p.player_id === playerId)
              ? 'faction1'
              : 'faction2';
            
            const won = match.results?.winner === playerTeam;
            
            return { kills: matchKills, deaths: matchDeaths, damage: matchDamage, rounds: matchRounds, won };
            
          } catch (error) {
            return null; // Falha silenciosa
          }
        });

        const chunkResults = await Promise.all(matchStatsPromises);
        
        // Somar resultados deste chunk
        for (const result of chunkResults) {
          if (result) {
            totalKills += result.kills;
            totalDeaths += result.deaths;
            totalDamage += result.damage;
            totalRounds += result.rounds;
            if (result.won) wins++;
            else losses++;
          }
        }
      }

      const matchesPlayed = wins + losses;
      const points = RANKING_CONFIG.INITIAL_POINTS + (wins * 3) - (losses * 3);

      console.log(`   ✅ ${nickname}: ${wins}W/${losses}L (${queueMatches.length} partidas)`);

      return { 
        wins, losses, matchesPlayed, points, lastMatchId,
        totalKills, totalDeaths, totalDamage, totalRounds
      };
      
    } catch (error) {
      console.error(`   ❌ ${nickname}: erro`);
      return { 
        wins: 0, losses: 0, matchesPlayed: 0, points: RANKING_CONFIG.INITIAL_POINTS,
        totalKills: 0, totalDeaths: 0, totalDamage: 0, totalRounds: 0
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

    const { wins, losses, matchesPlayed, points, lastMatchId, totalKills, totalDeaths, totalDamage, totalRounds } = queueStats;
    
    const kd = totalDeaths > 0 ? parseFloat((totalKills / totalDeaths).toFixed(2)) : 0;
    const adr = totalRounds > 0 ? parseFloat((totalDamage / totalRounds).toFixed(1)) : 0;
    const kills = matchesPlayed > 0 ? parseFloat((totalKills / matchesPlayed).toFixed(1)) : 0;
    const deaths = matchesPlayed > 0 ? parseFloat((totalDeaths / matchesPlayed).toFixed(1)) : 0;

    const lifetime = stats?.lifetime as any;
    const assists = parseStatValue(lifetime?.['Average Assists']) || 0;
    const kr = parseStatValue(lifetime?.['K/R Ratio']) || 0;
    const headshotPercentage = parsePercentage(lifetime?.['Average Headshots %']) || 0;
    const longestWinStreak = parseStatValue(lifetime?.['Longest Win Streak']) || 0;
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

  async fetchAllPlayersStats(onProgress?: ProgressCallback): Promise<PlayerStats[]> {
    console.log('🚀 MÁXIMO PARALELISMO - 100 partidas por jogador');
    console.log(`🎯 Queue: ${QUEUE_ID}`);
    console.log(`📋 ${PLAYER_NICKNAMES.length} jogadores`);
    console.log(`⚡ ${PARALLEL_PLAYERS} jogadores em paralelo`);
    console.log('⏱️ Meta: < 300s');
    console.log('');
    
    const startTime = Date.now();
    const players: PlayerStats[] = [];

    // PROCESSAR 5 JOGADORES EM PARALELO
    for (let i = 0; i < PLAYER_NICKNAMES.length; i += PARALLEL_PLAYERS) {
      const batch = PLAYER_NICKNAMES.slice(i, i + PARALLEL_PLAYERS);
      
      const batchPromises = batch.map(async (nickname, index) => {
        const globalIndex = i + index;
        console.log(`📊 [${globalIndex + 1}/${PLAYER_NICKNAMES.length}] ${nickname}`);

        if (onProgress) {
          onProgress({
            total: PLAYER_NICKNAMES.length,
            current: globalIndex + 1,
            currentPlayer: nickname,
            percentage: Math.round(((globalIndex + 1) / PLAYER_NICKNAMES.length) * 100),
          });
        }

        return await this.getConsolidatedPlayerData(nickname);
      });

      const batchResults = await Promise.all(batchPromises);
      players.push(...batchResults.filter((p): p is PlayerStats => p !== null));
    }

    players.sort((a, b) => {
      if (a.rankingPoints !== b.rankingPoints) return b.rankingPoints - a.rankingPoints;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.matchesPlayed - a.matchesPlayed;
    });

    players.forEach((player, index) => {
      player.position = index + 1;
    });

    const duration = Date.now() - startTime;
    console.log('');
    console.log(`✅ Concluído em ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 ${players.length}/${PLAYER_NICKNAMES.length} jogadores`);
    console.log(`🔢 ${this.requestCount} requisições`);

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