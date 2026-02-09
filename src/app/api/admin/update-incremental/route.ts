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
    const currentCache = await kvCacheService.getCache(seasonId);

    if (!currentCache || currentCache.players.length === 0) {
      console.log('⚠️ [UPDATE-INCREMENTAL] Cache vazio, use batch-update primeiro');
      return NextResponse.json({
        success: false,
        error: 'Cache vazio. Execute batch-update primeiro.',
      }, { status: 400 });
    }

    console.log(`   ✅ Cache encontrado: ${currentCache.players.length} jogadores`);
    const cacheTimestamp = new Date(currentCache.lastUpdated).getTime();

    // ✅ PASSO 2: Buscar últimas 100 partidas do hub
    console.log('🎮 [UPDATE-INCREMENTAL] Buscando últimas partidas do hub...');
    const hubMatches: any = await faceitService['request'](
      `/hubs/${queueId}/matches?type=past&offset=0&limit=100`
    );

    const allMatches = hubMatches.items || [];
    console.log(`   ✅ ${allMatches.length} partidas encontradas`);

    // ✅ PASSO 3: Filtrar apenas partidas NOVAS (após lastUpdated)
    const newMatches = allMatches.filter((match: any) => {
      const matchTime = new Date(match.finished_at || match.started_at).getTime();
      return matchTime > cacheTimestamp;
    });

    console.log(`   🆕 ${newMatches.length} partidas novas desde ${new Date(cacheTimestamp).toISOString()}`);

    if (newMatches.length === 0) {
      console.log('✅ [UPDATE-INCREMENTAL] Nenhuma partida nova. Cache permanece igual.');
      
      // ✅ SALVAR TIMESTAMP DE VERIFICAÇÃO
      const lastCheckKey = `last-check:${seasonId}`;
      await kvCacheService.setRaw(lastCheckKey, new Date().toISOString());
      console.log('   ✅ Timestamp de verificação salvo');

      return NextResponse.json({
        success: true,
        message: 'Nenhuma partida nova encontrada',
        playersUpdated: 0,
        totalPlayers: currentCache.players.length,
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
        timestamp: new Date().toISOString(),
      });
    }

    // ✅ PASSO 4: Extrair player_ids únicos das partidas novas
    const playerIdsToUpdate = new Set<string>();
    newMatches.forEach((match: any) => {
      const teams = match.teams || {};
      Object.values(teams).forEach((team: any) => {
        const roster = team.roster || [];
        roster.forEach((player: any) => {
          if (player.player_id) {
            playerIdsToUpdate.add(player.player_id);
          }
        });
      });
    });

    console.log(`   👥 ${playerIdsToUpdate.size} jogadores únicos com partidas novas`);

    // ✅ PASSO 5: Atualizar apenas jogadores com partidas novas
    console.log('🔄 [UPDATE-INCREMENTAL] Processando jogadores...');
    const processedPlayers: PlayerStats[] = [];

    let processed = 0;
    for (const playerId of Array.from(playerIdsToUpdate)) {
      try {
        processed++;
        console.log(`   [${processed}/${playerIdsToUpdate.size}] Processando ${playerId}...`);

        const playerStats = await faceitService.getPlayerHubStats(playerId, queueId);
        if (playerStats) {
          processedPlayers.push(playerStats);
        }

        // Delay entre requests (evitar rate limit)
        if (processed < playerIdsToUpdate.size) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`   ❌ Erro ao processar ${playerId}:`, error);
        continue;
      }
    }

    console.log(`   ✅ ${processedPlayers.length} jogadores atualizados com sucesso`);

    // ✅ PASSO 6: Mesclar com cache existente
    console.log('🔀 [UPDATE-INCREMENTAL] Mesclando com cache...');
    const playerMap = new Map(currentCache.players.map(p => [p.playerId, p]));

    // Atualizar jogadores processados
    processedPlayers.forEach(player => {
      playerMap.set(player.playerId, player);
    });

    // Converter de volta para array e ordenar
    const mergedPlayers = Array.from(playerMap.values())
      .sort((a, b) => b.rankingPoints - a.rankingPoints)
      .map((player, index) => ({
        ...player,
        position: index + 1,
      }));

    console.log(`   ✅ Total após merge: ${mergedPlayers.length} jogadores`);

    // ✅ PASSO 7: Salvar no cache
    console.log('💾 [UPDATE-INCREMENTAL] Salvando cache atualizado...');
    await kvCacheService.saveCache(mergedPlayers, seasonId);

    // ✅ SALVAR TIMESTAMP DE VERIFICAÇÃO
    const lastCheckKey = `last-check:${seasonId}`;
    await kvCacheService.setRaw(lastCheckKey, new Date().toISOString());
    console.log('   ✅ Timestamp de verificação salvo');

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