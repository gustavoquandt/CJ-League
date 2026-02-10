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
    console.log(`   📅 Cache lastUpdated: ${currentCache.lastUpdated}`);
    console.log(`   📅 Cache timestamp: ${cacheTimestamp}`);

    // ✅ PASSO 2: Buscar últimas 100 partidas do hub
    console.log('🎮 [UPDATE-INCREMENTAL] Buscando últimas partidas do hub...');
    const hubMatches: any = await faceitService['request'](
      `/hubs/${queueId}/matches?type=past&offset=0&limit=100`
    );

    const allMatches = hubMatches.items || [];
    console.log(`   ✅ ${allMatches.length} partidas encontradas`);

    // 🔍 DEBUG: Mostrar as 3 partidas mais recentes
    if (allMatches.length > 0) {
      console.log('\n📊 [DEBUG] 3 partidas mais recentes:');
      allMatches.slice(0, 3).forEach((match: any, i: number) => {
        // ✅ FIX: API retorna em SEGUNDOS, precisamos multiplicar por 1000
        const matchTimestamp = match.finished_at || match.started_at;
        const matchTime = typeof matchTimestamp === 'number' && matchTimestamp < 10000000000
          ? matchTimestamp * 1000  // ✅ Converter segundos para milissegundos
          : matchTimestamp;
        const matchDate = new Date(matchTime).toISOString();
        const isNew = matchTime > cacheTimestamp;
        console.log(`   ${i + 1}. ${matchDate} - ${isNew ? '✅ NOVA' : '❌ ANTIGA'} (timestamp: ${matchTimestamp})`);
      });
      console.log('');
    }

    // ✅ PASSO 3: Filtrar apenas partidas NOVAS (após lastUpdated)
    const newMatches = allMatches.filter((match: any) => {
      // ✅ FIX: API retorna em SEGUNDOS, precisamos multiplicar por 1000
      const matchTimestamp = match.finished_at || match.started_at;
      const matchTime = typeof matchTimestamp === 'number' && matchTimestamp < 10000000000
        ? matchTimestamp * 1000  // ✅ Converter segundos para milissegundos
        : matchTimestamp;
      return matchTime > cacheTimestamp;
    });

    console.log(`   🆕 ${newMatches.length} partidas novas desde ${new Date(cacheTimestamp).toISOString()}`);

    // ✅ SALVAR TIMESTAMP DE VERIFICAÇÃO (SEMPRE)
    await kvCacheService.setLastCheck(seasonId);

    if (newMatches.length === 0) {
      console.log('✅ [UPDATE-INCREMENTAL] Nenhuma partida nova. Cache permanece igual.');

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

        // ✅ OTIMIZAÇÃO: Buscar jogador do cache existente
        const cachedPlayer = currentCache.players.find(p => p.playerId === playerId);
        
        if (cachedPlayer) {
          // ✅ Jogador já existe no cache, apenas atualizar suas stats
          console.log(`   ✅ Jogador encontrado no cache: ${cachedPlayer.nickname}`);
          
          // Buscar lastMatchId do cache individual
          const cachedIndividual = await kvCacheService.getPlayerCache(cachedPlayer.nickname, seasonId);
          const lastMatchId = cachedIndividual?.lastMatchId || null;

          // ✅ CORRETO: fetchPlayerWithMatches com queueId da Season correta
          const playerStats = await faceitService.fetchPlayerWithMatches(
            cachedPlayer.nickname,
            200,
            lastMatchId,
            queueId,
            null
          );
          if (playerStats) {
            await kvCacheService.savePlayerCache(cachedPlayer.nickname, playerStats, seasonId);
            processedPlayers.push(playerStats);
          }
        } else {
          // ✅ Jogador novo, buscar info completa
          const playerInfo: any = await faceitService['request'](`/players/${playerId}`);
          if (!playerInfo || !playerInfo.nickname) {
            console.warn(`   ⚠️ Player ${playerId} não encontrado`);
            continue;
          }

          console.log(`   🆕 Novo jogador: ${playerInfo.nickname}`);
          const playerStats = await faceitService.fetchPlayerWithMatches(
            playerInfo.nickname,
            200,
            null,
            queueId,
            null
          );
          if (playerStats) {
            await kvCacheService.savePlayerCache(playerInfo.nickname, playerStats, seasonId);
            processedPlayers.push(playerStats);
          }
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

    // ✅ PASSO 8: Atualizar mapas também
    console.log('🗺️ [UPDATE-INCREMENTAL] Atualizando estatísticas de mapas...');
    try {
      const mapMatches: any = await faceitService['request'](
        `/hubs/${queueId}/matches?type=past&offset=0&limit=100`
      );

      const mapCounts: Record<string, number> = {};
      for (const match of mapMatches.items || []) {
        const mapName = match.voting?.map?.pick?.[0] || null;
        if (mapName && mapName.startsWith('de_')) {
          mapCounts[mapName] = (mapCounts[mapName] || 0) + 1;
        }
      }

      const totalMatches = Object.values(mapCounts).reduce((sum, n) => sum + n, 0);
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