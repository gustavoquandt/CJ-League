/**
 * Rota: /api/admin/update-map-stats
 * Busca partidas do hub FACEIT, calcula stats de mapa e salva no Redis
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { SEASONS, type SeasonId } from '@/config/constants';
import type { MapStats } from '@/types/app.types';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🗺️ [UPDATE-MAP-STATS] Iniciando...');
  const startTime = Date.now();

  try {
    // 🔐 Autenticação
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    if (!FACEIT_API_KEY) {
      return NextResponse.json({ success: false, error: 'FACEIT API Key não configurada' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';
    const queueId = SEASONS[seasonId].id;

    console.log(`   Season: ${SEASONS[seasonId].name} (${queueId})`);

    const faceitService = getFaceitService(FACEIT_API_KEY);

    // ✅ Buscar partidas do hub (até 100)
    console.log('   Buscando partidas do hub...');
    const hubMatches: any = await faceitService['request'](
      `/hubs/${queueId}/matches?type=past&offset=0&limit=100`
    );

    const matches = hubMatches.items || [];
    console.log(`   ${matches.length} partidas encontradas`);

    if (matches.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma partida encontrada no hub',
      }, { status: 404 });
    }

    // ✅ Calcular distribuição de mapas
    const mapCounts: Record<string, number> = {};

    for (const match of matches) {
      // FACEIT retorna o mapa votado em voting.map.pick[0]
      const mapName = match.voting?.map?.pick?.[0] || null;
      if (mapName) {
        mapCounts[mapName] = (mapCounts[mapName] || 0) + 1;
      }
    }

    console.log(`   Mapas encontrados: ${Object.keys(mapCounts).join(', ')}`);

    const totalMatches = matches.length;
    const sortedMaps = Object.entries(mapCounts).sort((a, b) => b[1] - a[1]);

    // ✅ Montar objeto MapStats
    const mapStats: MapStats = {
      mostPlayed: sortedMaps.length > 0
        ? {
            map: sortedMaps[0][0],
            count: sortedMaps[0][1],
            percentage: parseFloat(((sortedMaps[0][1] / totalMatches) * 100).toFixed(1)),
          }
        : null,
      leastPlayed: sortedMaps.length > 0
        ? {
            map: sortedMaps[sortedMaps.length - 1][0],
            count: sortedMaps[sortedMaps.length - 1][1],
            percentage: parseFloat(((sortedMaps[sortedMaps.length - 1][1] / totalMatches) * 100).toFixed(1)),
          }
        : null,
      totalMatches,
      mapDistribution: mapCounts,
    };

    // ✅ Salvar no Redis
    console.log('   Salvando no Redis...');
    await kvCacheService.saveMapStats(mapStats, seasonId);

    const duration = Date.now() - startTime;
    console.log(`✅ [UPDATE-MAP-STATS] Concluído em ${(duration / 1000).toFixed(1)}s`);
    console.log(`   Mapa mais jogado: ${mapStats.mostPlayed?.map} (${mapStats.mostPlayed?.count}x)`);
    console.log(`   Mapa menos jogado: ${mapStats.leastPlayed?.map} (${mapStats.leastPlayed?.count}x)`);

    return NextResponse.json({
      success: true,
      seasonId,
      totalMatches,
      mapDistribution: mapCounts,
      mostPlayed: mapStats.mostPlayed,
      leastPlayed: mapStats.leastPlayed,
      duration: `${(duration / 1000).toFixed(1)}s`,
    });

  } catch (error) {
    console.error('❌ [UPDATE-MAP-STATS] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;