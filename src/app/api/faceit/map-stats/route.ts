/**
 * Rota: /api/faceit/map-stats
 * Retorna estatísticas de mapas do Redis
 * Com fallback: se Redis vazio, busca ao vivo e salva
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { SEASONS, type SeasonId } from '@/config/constants';
import type { MapStats } from '@/types/app.types';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';

    console.log(`🗺️ [MAP-STATS] Buscando stats de mapas (${seasonId})`);

    // ✅ Tentar buscar do Redis primeiro
    const mapStats = await kvCacheService.getMapStats(seasonId);

    if (mapStats) {
      console.log(`✅ [MAP-STATS] Retornando do Redis`);
      return NextResponse.json({ success: true, data: mapStats });
    }

    // ✅ FALLBACK: Redis vazio → buscar ao vivo e salvar
    console.log(`⚠️ [MAP-STATS] Redis vazio, buscando ao vivo...`);

    if (!FACEIT_API_KEY) {
      return NextResponse.json({ success: false, error: 'Map stats não encontradas' }, { status: 404 });
    }

    const queueId = SEASONS[seasonId].id;
    const faceitService = getFaceitService(FACEIT_API_KEY);

    const hubMatches: any = await faceitService['request'](
      `/hubs/${queueId}/matches?type=past&offset=0&limit=100`
    );

    const matches = hubMatches.items || [];

    if (matches.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhuma partida encontrada' }, { status: 404 });
    }

    // Calcular distribuição
    const mapCounts: Record<string, number> = {};
    for (const match of matches) {
      const mapName = match.voting?.map?.pick?.[0] || null;
      if (mapName) {
        mapCounts[mapName] = (mapCounts[mapName] || 0) + 1;
      }
    }

    const totalMatches = matches.length;
    const sortedMaps = Object.entries(mapCounts).sort((a, b) => b[1] - a[1]);

    const freshMapStats: MapStats = {
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

    // Salvar no Redis para próximas chamadas
    await kvCacheService.saveMapStats(freshMapStats, seasonId);
    console.log(`✅ [MAP-STATS] Salvo no Redis (fallback)`);

    return NextResponse.json({ success: true, data: freshMapStats });

  } catch (error) {
    console.error('❌ [MAP-STATS] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';