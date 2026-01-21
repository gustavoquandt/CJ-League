/**
 * Serviço FACEIT - VERSÃO CORRIGIDA FINAL
 * K/D e ADR usando os campos corretos
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

// Stats específicas da queue
interface QueuePlayerStats {
  wins: number;
  losses: number;
  matchesPlayed: number;
  points: number;
}

class FaceitService {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private defaultRetries: number;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private queueMatchesCache: Map<string, QueuePlayerStats> = new Map();

  constructor(config: FaceitServiceConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || FACEIT_API.BASE_URL;
    this.timeout = config.timeout || 15000;
    this.defaultRetries = config.retries || 3;
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = FACEIT_API.RATE_LIMIT.DELAY_MS;

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
      delay = 1000,
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
          const errorData = await response.json().catch(() => ({})) as FaceitApiError;
          
          if (response.status === 404) {
            throw new Error(`Not found: ${endpoint}`);
          }

          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
            console.log(`⏳ Rate limit, aguardando ${waitTime}ms...`);
            await this.delay(waitTime);
            continue;
          }

          throw new Error(
            errorData.message || `API Error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        return data as T;

      } catch (error) {
        lastError = error as Error;

        if (attempt === retries) {
          break;
        }

        const backoffDelay = delay * Math.pow(2, attempt);
        await this.delay(backoffDelay);
      }
    }

    throw new Error(
      `Failed after ${retries} retries: ${lastError?.message || 'Unknown error'}`
    );
  }

  async getPlayerByNickname(nickname: string): Promise<FaceitPlayer | null> {
    try {
      const endpoint = `${FACEIT_API.ENDPOINTS.PLAYERS}?nickname=${encodeURIComponent(nickname)}&game=cs2`;
      return await this.request<FaceitPlayer>(endpoint);
    } catch (error) {
      console.error(`❌ Erro ao buscar jogador ${nickname}:`, error);
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
   * Busca PARTIDAS do jogador e filtra pela queue
   */
  async getPlayerMatchesInQueue(playerId: string, nickname: string): Promise<QueuePlayerStats> {
    console.log(`   🔍 Buscando partidas de ${nickname} na queue...`);
    
    let wins = 0;
    let losses = 0;
    let offset = 0;
    const limit = 20;
    let foundMatches = 0;
    
    try {
      // Busca últimas 100 partidas (5 páginas de 20)
      for (let page = 0; page < 5; page++) {
        const endpoint = `/players/${playerId}/history?game=cs2&offset=${offset}&limit=${limit}`;
        
        try {
          const response: any = await this.request(endpoint);
          
          if (!response.items || response.items.length === 0) {
            break;
          }

          // Filtra partidas da queue/competition
          const queueMatches = response.items.filter((match: any) => 
            match.competition_id === QUEUE_ID
          );

          foundMatches += queueMatches.length;

          // Conta wins/losses
          queueMatches.forEach((match: any) => {
            // Verifica se jogador ganhou
            const playerTeam = match.teams?.faction1?.players?.some((p: any) => p.player_id === playerId)
              ? 'faction1'
              : 'faction2';
            
            if (match.results?.winner === playerTeam) {
              wins++;
            } else {
              losses++;
            }
          });

          offset += limit;
          
          // Para se encontrou menos que o limite (última página)
          if (response.items.length < limit) {
            break;
          }
          
        } catch (error) {
          console.error(`   ⚠️ Erro ao buscar página ${page + 1}:`, error);
          break;
        }
      }

      const matchesPlayed = wins + losses;
      const points = RANKING_CONFIG.INITIAL_POINTS + (wins * 3) - (losses * 3);

      console.log(`   ✅ ${nickname}: ${wins}W/${losses}L = ${points} pts (${foundMatches} partidas da queue)`);

      return { wins, losses, matchesPlayed, points };
      
    } catch (error) {
      console.error(`   ❌ Erro ao buscar partidas de ${nickname}:`, error);
      return { wins: 0, losses: 0, matchesPlayed: 0, points: RANKING_CONFIG.INITIAL_POINTS };
    }
  }

  async getConsolidatedPlayerData(nickname: string): Promise<PlayerStats | null> {
    try {
      // 1. Buscar info do jogador
      const playerInfo = await this.getPlayerByNickname(nickname);
      if (!playerInfo) {
        console.log(`⚠️ ${nickname}: Não encontrado na FACEIT`);
        return null;
      }

      // 2. Buscar partidas da queue (wins/losses/points)
      const queueStats = await this.getPlayerMatchesInQueue(playerInfo.player_id, nickname);

      // 3. Buscar stats gerais CS2 (K/D, ADR, HS%, etc)
      const stats = await this.getPlayerStats(playerInfo.player_id);

      // 4. Montar PlayerStats
      return this.buildPlayerStats(nickname, playerInfo, queueStats, stats);

    } catch (error) {
      console.error(`❌ Erro ao buscar dados de ${nickname}:`, error);
      return null;
    }
  }

  // VERSÃO COM LOGS DETALHADOS
// Substitua apenas a função buildPlayerStats

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

  // Stats gerais do CS2
  const lifetime = stats?.lifetime as any;
  
  // ========== LOGS DETALHADOS ==========
  console.log(`\n🔍 ========== ${nickname} ==========`);
  
  // Mostra se stats existem
  if (!stats || !lifetime) {
    console.log('⚠️ STATS NÃO ENCONTRADAS!');
    console.log('stats:', stats);
    console.log('lifetime:', lifetime);
  } else {
    console.log('✅ Stats encontradas');
    
    // Lista TODOS os campos disponíveis
    console.log('📋 Campos disponíveis:', Object.keys(lifetime));
    
    // Mostra os campos que estamos tentando usar
    console.log('\n🎯 Campos específicos:');
    console.log('  Average K/D Ratio:', lifetime['Average K/D Ratio']);
    console.log('  K/D Ratio:', lifetime['K/D Ratio']);
    console.log('  ADR:', lifetime['ADR']);
    console.log('  Average ADR:', lifetime['Average ADR']);
  }
  
  // ========== K/D ==========
  const kdValue = lifetime?.['Average K/D Ratio'];
  console.log('\n📊 K/D:');
  console.log('  Raw value:', kdValue);
  console.log('  Type:', typeof kdValue);
  
  const kd = parseStatValue(kdValue) || 0;
  console.log('  Parsed:', kd);
  
  // ========== ADR ==========
  const adrValue = lifetime?.['ADR'];
  console.log('\n💥 ADR:');
  console.log('  Raw value:', adrValue);
  console.log('  Type:', typeof adrValue);
  
  const adr = parseStatValue(adrValue) || 0;
  console.log('  Parsed:', adr);
  
  // ========== OUTRAS STATS ==========
  const estimatedDeaths = 15;
  const kills = kd * estimatedDeaths;
  const deaths = estimatedDeaths;
  
  const assists = parseStatValue(lifetime?.['Average Assists']) || 0;
  const kr = parseStatValue(lifetime?.['K/R Ratio']) || 0;
  const headshotPercentage = parsePercentage(lifetime?.['Average Headshots %']) || 0;
  const longestWinStreak = parseStatValue(lifetime?.['Longest Win Streak']) || 0;
  const currentStreak = parseStatValue(lifetime?.['Current Win Streak']) || 0;

  // Dados DA QUEUE
  const { wins, losses, matchesPlayed, points } = queueStats;
  const winRate = matchesPlayed > 0 
    ? parseFloat(((wins / matchesPlayed) * 100).toFixed(1))
    : 0;

  const pot = PLAYER_POTS[nickname];
  
  console.log('\n✅ Resultado final:');
  console.log('  K/D:', kd);
  console.log('  ADR:', adr);
  console.log('  Kills:', kills.toFixed(1));
  console.log('  Deaths:', deaths);
  console.log('==================\n');

  return sanitizePlayer({
    playerId,
    nickname,
    avatar,
    country,
    pot,
    rankingPoints: points,
    position: 0,
    matchesPlayed,
    wins,
    losses,
    winRate,
    kills,
    deaths,
    assists,
    kd,
    kr,
    adr,
    headshotPercentage,
    faceitElo,
    skillLevel,
    currentStreak,
    longestWinStreak,
  });
}

  /**
   * MÉTODO PRINCIPAL
   */
  async fetchAllPlayersStats(
    onProgress?: ProgressCallback
  ): Promise<PlayerStats[]> {
    console.log('🚀 Iniciando busca de jogadores DA QUEUE...');
    console.log(`🎯 Queue/Competition ID: ${QUEUE_ID}`);
    console.log(`📋 Total de ${PLAYER_NICKNAMES.length} jogadores configurados`);
    console.log('⏱️ Tempo estimado: 1-2 minutos (buscando partidas individuais)');
    console.log('');
    
    const startTime = Date.now();
    const players: PlayerStats[] = [];

    for (let i = 0; i < PLAYER_NICKNAMES.length; i++) {
      const nickname = PLAYER_NICKNAMES[i];
      
      console.log(`📊 [${i + 1}/${PLAYER_NICKNAMES.length}] ${nickname}`);

      if (onProgress) {
        onProgress({
          total: PLAYER_NICKNAMES.length,
          current: i + 1,
          currentPlayer: nickname,
          percentage: Math.round(((i + 1) / PLAYER_NICKNAMES.length) * 100),
        });
      }

      const playerData = await this.getConsolidatedPlayerData(nickname);
      
      if (playerData) {
        players.push(playerData);
      }
    }

    // ORDENAÇÃO CORRETA: Pontos > Vitórias > Partidas Jogadas
    players.sort((a, b) => {
      // 1º critério: Pontos (descendente)
      if (a.rankingPoints !== b.rankingPoints) {
        return b.rankingPoints - a.rankingPoints;
      }
      
      // 2º critério: Vitórias (descendente)
      if (a.wins !== b.wins) {
        return b.wins - a.wins;
      }
      
      // 3º critério: Partidas jogadas (descendente)
      return b.matchesPlayed - a.matchesPlayed;
    });

    // Atualiza positions
    players.forEach((player, index) => {
      player.position = index + 1;
    });

    const duration = Date.now() - startTime;
    console.log('');
    console.log(`✅ Busca concluída em ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 ${players.length}/${PLAYER_NICKNAMES.length} jogadores processados`);
    console.log(`🔢 Total de requisições: ${this.requestCount}`);
    console.log('');
    console.log('🏆 TOP 5:');
    players.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.nickname}: ${p.rankingPoints} pts (${p.wins}W/${p.losses}L)`);
    });

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