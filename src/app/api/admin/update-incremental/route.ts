/**
 * Rota: /api/admin/update-incremental
 * Atualiza apenas jogadores com partidas novas (rápido, ~2-5 min)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { SEASONS, type SeasonId } from '@/config/constants';
import type { PlayerStats } from '@/types/app.types';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('\n⚡ [UPDATE-INCREMENTAL] Iniciando atualização incremental');
  const startTime = Date.now();

  try {
    // 🔐 Autenticação
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
      console.log('❌ [UPDATE-INCREMENTAL] Não autorizado');
      return NextResponse.json({
        success: false,
        error: 'Não autorizado',
      }, { status: 401 });
    }

    if (!FACEIT_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'FACEIT API Key não configurada',
      }, { status: 500 });
    }

    // 📋 Parâmetros
    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';
    const queueId = SEASONS[seasonId].id;

    console.log(`📊 [UPDATE-INCREMENTAL] Season: ${SEASONS[seasonId].name}`);
    console.log(`📊 [UPDATE-INCREMENTAL] Queue ID: ${queueId}`);

    const faceitService = getFaceitService(FACEIT_API_KEY);

    // ✅ PASSO 1: Buscar cache atual
    console.log('📦 [UPDATE-INCREMENTAL] Buscando cache atual...');
    const cache = await kvCacheService.getCache(seasonId);
    const currentPlayers = cache?.players || [];
    
    console.log(`   ✅ Cache carregado: ${currentPlayers.length} jogadores`);

    // ✅ PASSO 2: Buscar partidas recentes (últimas 100)
    console.log('🔍 [UPDATE-INCREMENTAL] Buscando partidas recentes...');
    const recentMatches: any = await faceitService['request'](
      `/hubs/${queueId}/matches?type=past&offset=0&limit=100`
    );

    if (!recentMatches?.items || recentMatches.items.length === 0) {
      console.log('   ℹ️ Nenhuma partida nova encontrada');
      return NextResponse.json({
        success: true,
        seasonId,
        message: 'Nenhuma partida nova',
        playersUpdated: 0,
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      });
    }

    console.log(`   ✅ ${recentMatches.items.length} partidas encontradas`);

    // ✅ PASSO 3: Identificar jogadores com partidas novas
    const lastUpdateTime = cache?.lastUpdated ? new Date(cache.lastUpdated).getTime() : 0;
    const playersToUpdate = new Set<string>();

    for (const match of recentMatches.items) {
      const matchTime = new Date(match.finished_at || match.started_at).getTime();
      
      // Se partida é mais recente que último update
      if (matchTime > lastUpdateTime) {
        // Adicionar todos jogadores da partida
        if (match.teams?.faction1?.roster) {
          match.teams.faction1.roster.forEach((player: any) => {
            playersToUpdate.add(player.player_id);
          });
        }
        if (match.teams?.faction2?.roster) {
          match.teams.faction2.roster.forEach((player: any) => {
            playersToUpdate.add(player.player_id);
          });
        }
      }
    }

    console.log(`   ✅ ${playersToUpdate.size} jogadores com partidas novas`);

    // Se nenhum jogador precisa atualizar
    if (playersToUpdate.size === 0) {
      console.log('   ℹ️ Nenhum jogador precisa atualização');
      return NextResponse.json({
        success: true,
        seasonId,
        message: 'Nenhum jogador precisa atualização',
        playersUpdated: 0,
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      });
    }

    // ✅ PASSO 4: Buscar dados atualizados do leaderboard
    console.log('📊 [UPDATE-INCREMENTAL] Buscando leaderboard atualizado...');
    const leaderboardData: any = await faceitService['request'](
      `/leaderboards/hubs/${queueId}/general?offset=0&limit=1000`
    );

    if (!leaderboardData?.items) {
      throw new Error('Erro ao buscar leaderboard');
    }

    // Criar mapa de jogadores atualizados
    const updatedPlayersMap = new Map<string, any>();
    for (const player of leaderboardData.items) {
      if (playersToUpdate.has(player.player.player_id)) {
        updatedPlayersMap.set(player.player.player_id, player);
      }
    }

    console.log(`   ✅ ${updatedPlayersMap.size} jogadores atualizados no leaderboard`);

    // ✅ PASSO 5: Processar estatísticas dos jogadores atualizados
    console.log('⚙️ [UPDATE-INCREMENTAL] Processando estatísticas...');
    const processedPlayers: PlayerStats[] = [];

    for (const [playerId, leaderboardPlayer] of updatedPlayersMap) {
      try {
        // Buscar estatísticas do jogador
        const statsData: any = await faceitService['request'](
          `/players/${playerId}/stats/cs2`
        );

        const segments = statsData?.segments || [];
        const overallSegment = segments.find((s: any) => s.mode === '5v5' && s.label === 'Overall');

        if (!overallSegment) {
          console.log(`   ⚠️ Sem estatísticas para ${leaderboardPlayer.player.nickname}`);
          continue;
        }

        const stats = overallSegment.stats;

        // Calcular rival (jogador mais enfrentado)
        let biggestRival: { nickname: string; count: number; wins: number; losses: number } | null = null;
        
        if (overallSegment.opponents) {
          const opponents = Object.entries(overallSegment.opponents)
            .map(([nickname, data]: [string, any]) => ({
              nickname,
              count: data.Matches || 0,
              wins: data.Wins || 0,
              losses: data.Losses || 0,
            }))
            .filter(opp => opp.count >= 2);

          if (opponents.length > 0) {
            opponents.sort((a, b) => {
              if (b.count === a.count) {
                return a.nickname.localeCompare(b.nickname);
              }
              return b.count - a.count;
            });
            biggestRival = opponents[0];
          }
        }

        const playerStats: PlayerStats = {
          playerId: leaderboardPlayer.player.player_id,
          nickname: leaderboardPlayer.player.nickname,
          avatar: leaderboardPlayer.player.avatar || '',
          country: leaderboardPlayer.player.country || '',
          skillLevel: leaderboardPlayer.player.game_skill_level || 1,
          faceitElo: leaderboardPlayer.player.faceit_elo || 1000,
          rankingPoints: leaderboardPlayer.points || 0,
          position: leaderboardPlayer.position || 0,
          
          // Partidas
          matchesPlayed: parseInt(stats['Matches'] || '0'),
          wins: parseInt(stats['Wins'] || '0'),
          losses: parseInt(stats['Losses'] || '0'),
          winRate: parseFloat(stats['Win Rate %'] || '0'),
          
          // Kills/Deaths
          kills: parseFloat(stats['Average Kills'] || '0'),
          deaths: parseFloat(stats['Average Deaths'] || '0'),
          assists: parseFloat(stats['Average Assists'] || '0'),
          kd: parseFloat(stats['Average K/D Ratio'] || '0'),
          kr: parseFloat(stats['Average K/R Ratio'] || '0'),
          
          // Outros
          adr: parseFloat(stats['ADR'] || '0'),
          headshotPercentage: parseFloat(stats['Average Headshots %'] || '0'),
          
          // Streaks
          currentStreak: parseInt(stats['Current Win Streak'] || '0'),
          longestWinStreak: parseInt(stats['Longest Win Streak'] || '0'),
          
          // Rival
          rivalNickname: biggestRival?.nickname,
          rivalMatchCount: biggestRival?.count,
          rivalWins: biggestRival?.wins,
          rivalLosses: biggestRival?.losses,
        };

        processedPlayers.push(playerStats);
        console.log(`   ✅ ${playerStats.nickname} processado`);

        // Delay para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ Erro ao processar ${leaderboardPlayer.player.nickname}:`, error);
      }
    }

    // ✅ PASSO 6: Mesclar com cache atual
    console.log('🔄 [UPDATE-INCREMENTAL] Mesclando com cache...');
    const updatedPlayersMap2 = new Map(processedPlayers.map(p => [p.playerId, p]));
    
    const mergedPlayers = currentPlayers.map(player => {
      return updatedPlayersMap2.get(player.playerId) || player;
    });

    // Adicionar novos jogadores (caso existam)
    for (const newPlayer of processedPlayers) {
      if (!currentPlayers.find(p => p.playerId === newPlayer.playerId)) {
        mergedPlayers.push(newPlayer);
      }
    }

    // Ordenar por ranking points
    mergedPlayers.sort((a, b) => b.rankingPoints - a.rankingPoints);

    // ✅ PASSO 7: Salvar no cache
    console.log('💾 [UPDATE-INCREMENTAL] Salvando cache atualizado...');
    await kvCacheService.saveCache(mergedPlayers, seasonId);

    // ✅ PASSO 8: Atualizar mapas também
    console.log('🗺️ [UPDATE-INCREMENTAL] Atualizando estatísticas de mapas...');
    try {
      const mapMatches: any = await faceitService['request'](
        `/hubs/${queueId}/matches?type=past&offset=0&limit=100`
      );

      const mapCounts: Record<string, number> = {};
      for (const match of mapMatches.items || []) {
        const mapName = match.voting?.map?.pick?.[0] || 'Unknown';
        mapCounts[mapName] = (mapCounts[mapName] || 0) + 1;
      }

      const totalMatches = (mapMatches.items || []).length;
      const sortedMaps = Object.entries(mapCounts).sort((a, b) => b[1] - a[1]);

      const mapStats = {
        mostPlayed: sortedMaps.length > 0 ? {
          map: sortedMaps[0][0],
          count: sortedMaps[0][1],
          percentage: parseFloat(((sortedMaps[0][1] / totalMatches) * 100).toFixed(1)),
        } : null,
        leastPlayed: sortedMaps.length > 0 ? {
          map: sortedMaps[sortedMaps.length - 1][0],
          count: sortedMaps[sortedMaps.length - 1][1],
          percentage: parseFloat(((sortedMaps[sortedMaps.length - 1][1] / totalMatches) * 100).toFixed(1)),
        } : null,
        totalMatches,
        mapDistribution: mapCounts,
      };

      await kvCacheService.saveMapStats(mapStats, seasonId);
      console.log('   ✅ Mapas atualizados');
    } catch (error) {
      console.error('   ⚠️ Erro ao atualizar mapas (não crítico):', error);
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ [UPDATE-INCREMENTAL] Finalizado em ${(duration / 1000).toFixed(1)}s`);

    return NextResponse.json({
      success: true,
      seasonId,
      playersUpdated: processedPlayers.length,
      totalPlayers: mergedPlayers.length,
      duration: `${(duration / 1000).toFixed(1)}s`,
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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos