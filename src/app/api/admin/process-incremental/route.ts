/**
 * Rota: /api/admin/process-incremental
 * Processa APENAS jogadores com partidas novas (5-10min)
 * Usa no GitHub Actions (sem timeout de 10s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { SEASONS, type SeasonId } from '@/config/constants';
import type { PlayerStats } from '@/types/app.types';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('\n⚡ [PROCESS-INCREMENTAL] Iniciando processamento incremental');
  const startTime = Date.now();

  try {
    // 🔐 Autenticação
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
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

    // ✅ Ler dados do check-new-matches
    const body = await request.json();
    const { playerNicknames, seasonId } = body;

    if (!playerNicknames || !Array.isArray(playerNicknames) || playerNicknames.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'playerNicknames é obrigatório e deve ser um array não vazio',
      }, { status: 400 });
    }

    const queueId = SEASONS[seasonId as SeasonId].id;

    console.log(`📊 Season: ${SEASONS[seasonId as SeasonId].name}`);
    console.log(`👥 Jogadores para processar: ${playerNicknames.length}`);
    console.log(`📋 Lista: ${playerNicknames.join(', ')}`);

    const faceitService = getFaceitService(FACEIT_API_KEY);

    // ✅ PASSO 1: Buscar cache atual
    console.log('📦 Buscando cache atual...');
    const currentCache = await kvCacheService.getCache(seasonId as SeasonId);

    if (!currentCache) {
      return NextResponse.json({
        success: false,
        error: 'Cache não encontrado',
      }, { status: 404 });
    }

    console.log(`   ✅ ${currentCache.players.length} jogadores no cache`);

    // ✅ PASSO 2: Processar APENAS jogadores com partidas novas
    console.log('\n🔄 Processando jogadores...');
    const updatedPlayers: PlayerStats[] = [];
    let processed = 0;

    for (const nickname of playerNicknames) {
      try {
        processed++;
        console.log(`   [${processed}/${playerNicknames.length}] ${nickname}...`);

        const playerData = await faceitService.getConsolidatedPlayerData(nickname);
        
        if (playerData) {
          updatedPlayers.push(playerData);
          console.log(`      ✅ ${playerData.matchesPlayed} partidas, ${playerData.rankingPoints} pts`);
        } else {
          console.warn(`      ⚠️ Sem dados para ${nickname}`);
        }

        // Delay entre requests
        if (processed < playerNicknames.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`      ❌ Erro ao processar ${nickname}:`, error);
        continue;
      }
    }

    console.log(`\n   ✅ ${updatedPlayers.length} jogadores processados com sucesso`);

    // ✅ PASSO 3: Mesclar com cache existente
    console.log('🔀 Mesclando com cache...');
    const playerMap = new Map(currentCache.players.map(p => [p.playerId, p]));

    // Atualizar jogadores processados
    updatedPlayers.forEach(player => {
      playerMap.set(player.playerId, player);
    });

    // Converter de volta para array e ordenar
    const mergedPlayers = Array.from(playerMap.values())
      .sort((a, b) => {
        if (a.rankingPoints !== b.rankingPoints) return b.rankingPoints - a.rankingPoints;
        if (a.wins !== b.wins) return b.wins - a.wins;
        return b.matchesPlayed - a.matchesPlayed;
      })
      .map((player, index) => ({
        ...player,
        position: index + 1,
      }));

    console.log(`   ✅ Total após merge: ${mergedPlayers.length} jogadores`);

    // ✅ PASSO 4: Salvar no cache
    console.log('💾 Salvando cache atualizado...');
    await kvCacheService.saveCache(mergedPlayers, seasonId as SeasonId);

    // ✅ PASSO 5: Atualizar mapas
    console.log('🗺️ Atualizando estatísticas de mapas...');
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

      await kvCacheService.saveMapStats(mapStats, seasonId as SeasonId);
      console.log('   ✅ Mapas atualizados');
    } catch (error) {
      console.error('   ⚠️ Erro ao atualizar mapas (não crítico):', error);
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ [PROCESS-INCREMENTAL] Finalizado em ${(duration / 1000).toFixed(1)}s`);

    return NextResponse.json({
      success: true,
      seasonId,
      playersUpdated: updatedPlayers.length,
      totalPlayers: mergedPlayers.length,
      duration: `${(duration / 1000).toFixed(1)}s`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ [PROCESS-INCREMENTAL] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos