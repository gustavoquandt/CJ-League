/**
 * Rota: /api/admin/check-new-matches
 * Verifica se há partidas novas (RÁPIDO - 2s)
 * Retorna playerIds e matchIds para processamento
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { SEASONS, type SeasonId } from '@/config/constants';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;

export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('🔍 [CHECK] Verificando partidas novas...');
  const startTime = Date.now();

  try {
    if (!FACEIT_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'FACEIT API Key não configurada',
      }, { status: 500 });
    }

    // Parâmetros
    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';
    const queueId = SEASONS[seasonId].id;

    console.log(`📊 Season: ${SEASONS[seasonId].name} (${queueId})`);

    const faceitService = getFaceitService(FACEIT_API_KEY);

    // ✅ PASSO 1: Buscar cache atual
    const currentCache = await kvCacheService.getCache(seasonId);

    if (!currentCache) {
      return NextResponse.json({
        success: false,
        error: 'Cache não encontrado. Execute batch-update primeiro.',
      }, { status: 404 });
    }

    const cacheTimestamp = new Date(currentCache.lastUpdated).getTime();
    console.log(`   Cache lastUpdated: ${currentCache.lastUpdated}`);

    // ✅ PASSO 2: Buscar últimas partidas
    const hubMatches: any = await faceitService['request'](
      `/hubs/${queueId}/matches?type=past&offset=0&limit=100`
    );

    const allMatches = hubMatches.items || [];

    // ✅ PASSO 3: Filtrar partidas novas (converter segundos → milissegundos)
    const newMatches = allMatches.filter((match: any) => {
      const matchTimestamp = match.finished_at || match.started_at;
      const matchTime = typeof matchTimestamp === 'number' && matchTimestamp < 10000000000
        ? matchTimestamp * 1000
        : matchTimestamp;
      return matchTime > cacheTimestamp;
    });

    console.log(`   🆕 ${newMatches.length} partidas novas`);

    // ✅ Salvar timestamp de verificação
    await kvCacheService.setLastCheck(seasonId);

    if (newMatches.length === 0) {
      const duration = Date.now() - startTime;
      console.log(`✅ Nenhuma partida nova (${(duration / 1000).toFixed(1)}s)`);
      
      return NextResponse.json({
        success: true,
        hasNewMatches: false,
        message: 'Nenhuma partida nova encontrada',
        duration: `${(duration / 1000).toFixed(1)}s`,
      });
    }

    // ✅ PASSO 4: Extrair playerIds únicos
    const playerIdsSet = new Set<string>();
    const playerNicknamesMap = new Map<string, string>();

    newMatches.forEach((match: any) => {
      const teams = match.teams || {};
      Object.values(teams).forEach((team: any) => {
        const roster = team.roster || [];
        roster.forEach((player: any) => {
          if (player.player_id && player.nickname) {
            playerIdsSet.add(player.player_id);
            playerNicknamesMap.set(player.player_id, player.nickname);
          }
        });
      });
    });

    const playerIds = Array.from(playerIdsSet);
    const playerNicknames = playerIds.map(id => playerNicknamesMap.get(id)).filter(Boolean);
    const matchIds = newMatches.map((m: any) => m.match_id);

    const duration = Date.now() - startTime;
    console.log(`✅ ${newMatches.length} partidas, ${playerIds.length} jogadores (${(duration / 1000).toFixed(1)}s)`);

    return NextResponse.json({
      success: true,
      hasNewMatches: true,
      newMatchesCount: newMatches.length,
      playerIds,
      playerNicknames,
      matchIds,
      seasonId,
      cacheLastUpdated: currentCache.lastUpdated,
      duration: `${(duration / 1000).toFixed(1)}s`,
    });

  } catch (error) {
    console.error('❌ [CHECK] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';