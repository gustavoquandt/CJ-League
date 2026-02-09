/**
 * Rota: /api/admin/update-status
 * Retorna timestamp da última atualização e total de partidas
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvCacheService } from '@/services/kv-cache.service';
import type { SeasonId } from '@/config/constants';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';

    // Buscar cache de players e maps
    const playersCache = await kvCacheService.getCache(seasonId);
    const mapsCache = await kvCacheService.getMapStats(seasonId);

    return NextResponse.json({
      success: true,
      seasonId,
      playersLastUpdated: playersCache?.lastUpdated || null,
      mapsLastUpdated: mapsCache ? new Date().toISOString() : null,
      totalPlayers: playersCache?.players?.length || 0,
      totalMatches: mapsCache?.totalMatches || 0,
      hasData: !!(playersCache && mapsCache),
    });

  } catch (error) {
    console.error('❌ [UPDATE-STATUS] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';