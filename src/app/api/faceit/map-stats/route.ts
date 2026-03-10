/**
 * Rota: /api/faceit/map-stats
 * Retorna estatísticas de mapas do Redis (read-only)
 * Para atualizar, usar POST /api/admin/update-map-stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvCacheService } from '@/services/kv-cache.service';
import { type SeasonId } from '@/config/constants';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';

    const mapStats = await kvCacheService.getMapStats(seasonId);

    if (!mapStats) {
      return NextResponse.json({ success: false, error: 'Map stats não encontradas. Execute /api/admin/update-map-stats.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: mapStats });

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