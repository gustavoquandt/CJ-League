/**
 * Rota: /api/faceit/map-stats
 * Retorna estatísticas de mapas do Redis
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvCacheService } from '@/services/kv-cache.service';
import type { SeasonId } from '@/config/constants';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';

    console.log(`🗺️ [MAP-STATS] Buscando stats de mapas (${seasonId})`);

    // Buscar do Redis
    const mapStats = await kvCacheService.getMapStats(seasonId);

    if (!mapStats) {
      console.log(`⚠️ [MAP-STATS] Nenhum map stat encontrado (${seasonId})`);
      return NextResponse.json({
        success: false,
        error: 'Map stats não encontradas',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: mapStats,
    });

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