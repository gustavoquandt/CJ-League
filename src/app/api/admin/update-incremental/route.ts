/**
 * /api/admin/update-incremental
 *
 * ABORDAGEM DELTA — reescrito do zero
 *
 * Fluxo:
 * 1. Lê cache atual → pega cacheTimestamp
 * 2. Busca partidas do hub → filtra só as NOVAS (após cacheTimestamp)
 * 3. Para cada partida nova → busca /matches/{id}/stats
 * 4. Acumula deltas por jogador (kills, deaths, damage, headshots, adr, won/lost)
 * 5. Para cada jogador afetado no cache → soma deltas e recalcula stats
 * 6. Salva cache atualizado
 * 7. Atualiza map stats
 *
 * Nunca re-processa o histórico inteiro → sempre correto e rápido
 */

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { kvCacheService } from '@/services/kv-cache.service';
import { SEASONS, RANKING_CONFIG, type SeasonId } from '@/config/constants';
import { calculateSimplifiedRating } from '@/utils/rating.utils';
import type { PlayerStats } from '@/types/app.types';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';
const FACEIT_BASE = 'https://open.faceit.com/data/v4';

// ── helpers ──────────────────────────────────────────────────────────────────

async function faceitGet(path: string): Promise<any> {
  const res = await fetch(`${FACEIT_BASE}${path}`, {
    headers: { Authorization: `Bearer ${FACEIT_API_KEY}` },
    // sem cache do Next (queremos dados frescos)
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`FACEIT ${res.status}: ${path}`);
  return res.json();
}

function toMs(ts: number): number {
  // FACEIT retorna segundos quando < 10^10, milissegundos caso contrário
  return ts < 10_000_000_000 ? ts * 1000 : ts;
}

// ── Delta por jogador ─────────────────────────────────────────────────────────

interface PlayerDelta {
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  damage: number;
  rounds: number;
  headshots: number;
  matchResults: boolean[];       // resultado de cada partida nova (true=win)
  lastMatchId: string | null;    // match_id mais recente
}

// ── Rota principal ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('\n⚡ [UPDATE-INCREMENTAL] Iniciando...');
  const startTime = Date.now();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  const secret = authHeader?.replace('Bearer ', '');
  if (!secret || secret !== ADMIN_SECRET) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }
  if (!FACEIT_API_KEY) {
    return NextResponse.json({ success: false, error: 'FACEIT API Key não configurada' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';
  const queueId = SEASONS[seasonId].id;

  console.log(`📊 Season: ${SEASONS[seasonId].name} (${queueId})`);

  try {
    // ── PASSO 1: Cache atual ────────────────────────────────────────────────
    const currentCache = await kvCacheService.getCache(seasonId);
    if (!currentCache || currentCache.players.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Cache vazio. Execute batch-update primeiro.',
      }, { status: 400 });
    }

    const cacheTimestamp = new Date(currentCache.lastUpdated).getTime();
    console.log(`📦 Cache: ${currentCache.players.length} jogadores, atualizado: ${currentCache.lastUpdated}`);

    // ── PASSO 2: Partidas novas ─────────────────────────────────────────────
    const hubData = await faceitGet(`/hubs/${queueId}/matches?type=past&offset=0&limit=100`);
    const allMatches: any[] = hubData.items || [];

    const newMatches = allMatches.filter((m: any) => {
      const ts = toMs(m.finished_at || m.started_at || 0);
      return ts > cacheTimestamp;
    });

    console.log(`🎮 ${allMatches.length} partidas no hub, ${newMatches.length} novas`);

    // Salvar timestamp de verificação independentemente do resultado
    await kvCacheService.setLastCheck(seasonId);

    if (newMatches.length === 0) {
      console.log('✅ Nenhuma partida nova — cache mantido');
      return NextResponse.json({
        success: true,
        message: 'Nenhuma partida nova',
        playersUpdated: 0,
        totalPlayers: currentCache.players.length,
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      });
    }

    // ── PASSO 3: Buscar stats de cada partida nova ──────────────────────────
    // Ordenar do mais antigo para o mais recente (para matchResults/streak corretos)
    newMatches.sort((a: any, b: any) =>
      toMs(a.finished_at || a.started_at || 0) - toMs(b.finished_at || b.started_at || 0)
    );

    // mapa: playerId → PlayerDelta
    const deltas = new Map<string, PlayerDelta>();

    // match_id mais recente por jogador (para salvar lastMatchId)
    const latestMatchByPlayer = new Map<string, string>();

    for (const match of newMatches) {
      const matchId: string = match.match_id;
      console.log(`   🔍 Processando match ${matchId.substring(0, 8)}...`);

      try {
        // ── Buscar stats detalhadas ──
        const statsData = await faceitGet(`/matches/${matchId}/stats`);
        const rounds: any[] = statsData.rounds || [];
        if (rounds.length === 0) continue;

        const firstRound = rounds[0];
        const totalRounds: number = firstRound?.round_stats?.Rounds
          ? parseInt(firstRound.round_stats.Rounds, 10)
          : rounds.length;

        // ✅ CORRIGIDO: Processar stats por player (uma vez por partida)
        // Primeiro: acumular stats de TODOS os rounds da partida
        const playerMatchStats = new Map<string, {
          kills: number; deaths: number; damage: number; 
          headshots: number; won: boolean;
        }>();

        for (const round of rounds) {
          const teams: any[] = round.teams || [];

          for (const team of teams) {
            const players: any[] = team.players || [];

            for (const player of players) {
              const playerId: string = player.player_id;
              const ps = player.player_stats || {};

              if (!playerMatchStats.has(playerId)) {
                playerMatchStats.set(playerId, {
                  kills: 0, deaths: 0, damage: 0, headshots: 0, won: false
                });
              }

              const matchStats = playerMatchStats.get(playerId)!;
              matchStats.kills     += parseInt(ps.Kills     || '0', 10);
              matchStats.deaths    += parseInt(ps.Deaths    || '0', 10);
              matchStats.damage    += parseInt(ps.Damage    || '0', 10);
              matchStats.headshots += parseInt(ps.Headshots || '0', 10);
              matchStats.won       = ps.Result === '1'; // Último round define
            }
          }
        }

        // Segundo: adicionar aos deltas GLOBAIS (uma vez por player)
        for (const [playerId, matchStats] of playerMatchStats) {
          if (!deltas.has(playerId)) {
            deltas.set(playerId, {
              wins: 0, losses: 0,
              kills: 0, deaths: 0, damage: 0, rounds: 0, headshots: 0,
              matchResults: [],
              lastMatchId: null,
            });
          }

          const d = deltas.get(playerId)!;
          d.kills     += matchStats.kills;
          d.deaths    += matchStats.deaths;
          d.damage    += matchStats.damage;
          d.rounds    += totalRounds;  // ✅ Só adiciona UMA VEZ por partida
          d.headshots += matchStats.headshots;
          d.matchResults.push(matchStats.won);
          d.lastMatchId = matchId;

          if (matchStats.won) d.wins++; else d.losses++;
        }

        // Delay leve entre requests de stats
        await new Promise(r => setTimeout(r, 200));

      } catch (err) {
        console.error(`   ⚠️ Erro ao buscar stats de ${matchId}:`, err);
        continue;
      }
    }

    console.log(`   ✅ ${deltas.size} jogadores com deltas calculados`);

    // ── PASSO 4: Aplicar deltas no cache ────────────────────────────────────
    const updatedPlayers: PlayerStats[] = [];
    let playersUpdated = 0;

    for (const cachedPlayer of currentCache.players) {
      const delta = deltas.get(cachedPlayer.playerId);

      if (!delta || (delta.wins === 0 && delta.losses === 0)) {
        // Sem partidas novas → mantém como está
        updatedPlayers.push(cachedPlayer);
        continue;
      }

      playersUpdated++;
      console.log(`   🔄 Atualizando ${cachedPlayer.nickname}: +${delta.wins}W/${delta.losses}L`);

      // ── Totais acumulados ──
      const oldMatches   = cachedPlayer.matchesPlayed || 0;
      const newMatches2  = delta.wins + delta.losses;
      const totalMatches = oldMatches + newMatches2;

      const totalWins   = cachedPlayer.wins   + delta.wins;
      const totalLosses = cachedPlayer.losses + delta.losses;

      const totalKills     = (cachedPlayer.totalKills     || cachedPlayer.kills  * oldMatches) + delta.kills;
      const totalDeaths    = (cachedPlayer.totalDeaths    || cachedPlayer.deaths * oldMatches) + delta.deaths;
      const totalDamage    = (cachedPlayer.totalDamage    || 0) + delta.damage;
      const totalRounds    = (cachedPlayer.totalRounds    || 0) + delta.rounds;
      const totalHeadshots = (cachedPlayer.totalHeadshots || Math.round((cachedPlayer.headshotPercentage / 100) * (cachedPlayer.kills * oldMatches))) + delta.headshots;

      // ── Histórico de resultados (para streaks) ──
      const prevMatchResults = (cachedPlayer as any).matchResults as boolean[] | undefined;
      const allMatchResults = [...delta.matchResults, ...(prevMatchResults || [])];

      // ── Stats derivadas ──
      const rankingPoints: number = RANKING_CONFIG.INITIAL_POINTS
        + totalWins   * RANKING_CONFIG.POINTS_PER_WIN
        - totalLosses * RANKING_CONFIG.POINTS_PER_LOSS;

      const kd  = totalDeaths > 0 ? parseFloat((totalKills  / totalDeaths).toFixed(2)) : totalKills;
      
      // ✅ ADR calculado dos totais (não depende de cache ter matchADRs)
      const adr = totalRounds > 0
        ? parseFloat((totalDamage / totalRounds).toFixed(1))
        : cachedPlayer.adr;

      const headshotPercentage = totalKills > 0
        ? parseFloat(((totalHeadshots / totalKills) * 100).toFixed(1))
        : cachedPlayer.headshotPercentage;

      const winRate = totalMatches > 0
        ? parseFloat(((totalWins / totalMatches) * 100).toFixed(1))
        : 0;

      const kills  = totalMatches > 0 ? parseFloat((totalKills  / totalMatches).toFixed(1)) : 0;
      const deaths = totalMatches > 0 ? parseFloat((totalDeaths / totalMatches).toFixed(1)) : 0;

      // ── Peak points ──
      let simPoints: number  = RANKING_CONFIG.INITIAL_POINTS;
      let peakPoints: number = simPoints;
      for (const won of [...allMatchResults].reverse()) {
        simPoints += won ? RANKING_CONFIG.POINTS_PER_WIN : -RANKING_CONFIG.POINTS_PER_LOSS;
        if (simPoints > peakPoints) peakPoints = simPoints;
      }

      // ── Streak ──
      let currentStreak  = 0;
      let longestStreak  = 0;
      let runningStreak  = 0;
      for (const won of allMatchResults) {
        if (won) {
          runningStreak  = runningStreak >= 0 ? runningStreak + 1 : 1;
          currentStreak  = allMatchResults.indexOf(won) === 0 ? runningStreak : currentStreak;
        } else {
          runningStreak  = runningStreak <= 0 ? runningStreak - 1 : -1;
          currentStreak  = allMatchResults.indexOf(won) === 0 ? runningStreak : currentStreak;
        }
        if (runningStreak > longestStreak) longestStreak = runningStreak;
      }
      // currentStreak = streak atual (positivo = wins seguidas, negativo = losses seguidas)
      let streak = 0;
      for (const won of allMatchResults) {
        if (streak === 0) { streak = won ? 1 : -1; continue; }
        if (won && streak > 0)  { streak++; continue; }
        if (!won && streak < 0) { streak--; continue; }
        break;
      }

      const updatedPlayer: PlayerStats = {
        ...cachedPlayer,
        wins: totalWins,
        losses: totalLosses,
        matchesPlayed: totalMatches,
        rankingPoints,
        peakRankingPoints: Math.max(peakPoints, cachedPlayer.peakRankingPoints || 0),
        winRate,
        kills,
        deaths,
        kd,
        adr,
        headshotPercentage,
        currentStreak: streak,
        longestWinStreak: Math.max(longestStreak, cachedPlayer.longestWinStreak || 0),
        totalKills,
        totalDeaths,
        totalDamage,
        totalRounds,
        totalHeadshots,
        rating: calculateSimplifiedRating({ totalKills, totalDeaths, totalDamage, totalRounds, totalHeadshots }),
        // ✅ Preservar dados de rival do cache
        rivalNickname: cachedPlayer.rivalNickname,
        rivalMatchCount: cachedPlayer.rivalMatchCount,
        rivalWins: cachedPlayer.rivalWins,
        rivalLosses: cachedPlayer.rivalLosses,
        // histórico de resultados para streak calculation
        ...({ matchResults: allMatchResults } as any),
        lastMatchId: delta.lastMatchId || cachedPlayer.lastMatchId,
      };

      updatedPlayers.push(updatedPlayer);
    }

    // ── PASSO 5: Re-ordenar e salvar ────────────────────────────────────────
    const sorted = updatedPlayers
      .sort((a, b) => {
        if (a.rankingPoints !== b.rankingPoints) return b.rankingPoints - a.rankingPoints;
        if (a.wins !== b.wins) return b.wins - a.wins;
        return b.matchesPlayed - a.matchesPlayed;
      })
      .map((p, i) => ({ ...p, position: i + 1 }));

    await kvCacheService.saveCache(sorted, seasonId);
    console.log(`💾 Cache salvo: ${sorted.length} jogadores`);

    // Salvar cache individual por jogador (para admin panel / future use)
    for (const player of sorted) {
      const delta = deltas.get(player.playerId);
      if (delta) {
        await kvCacheService.savePlayerCache(player.nickname, player, seasonId);
      }
    }

    // ✅ CORRIGIDO: MapStats removido - use update-map-stats separadamente


    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ [UPDATE-INCREMENTAL] Concluído em ${duration}s — ${playersUpdated} jogadores atualizados`);

    return NextResponse.json({
      success: true,
      seasonId,
      newMatches: newMatches.length,
      playersUpdated,
      totalPlayers: sorted.length,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ [UPDATE-INCREMENTAL] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic    = 'force-dynamic';
export const runtime    = 'nodejs';
export const maxDuration = 300;