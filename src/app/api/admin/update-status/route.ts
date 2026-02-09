/**
 * Rota: /api/admin/update-status
 * Retorna informações sobre última atualização E última verificação
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv'; // ✅ IMPORTAR KV DIRETAMENTE
import { kvCacheService } from '@/services/kv-cache.service';
import type { SeasonId } from '@/config/constants';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';

    // Buscar cache
    const cache = await kvCacheService.getCache(seasonId);
    const mapStats = await kvCacheService.getMapStats(seasonId);

    if (!cache) {
      return NextResponse.json({
        success: false,
        error: 'Cache não encontrado',
      }, { status: 404 });
    }

    // ✅ Buscar timestamp da última verificação
    const lastCheckKey = `last-check:${seasonId}`;
    const lastCheck = await kv.get<string>(lastCheckKey);

    return NextResponse.json({
      success: true,
      seasonId,
      // ✅ Quando os DADOS foram atualizados
      lastDataUpdate: cache.lastUpdated,
      // ✅ Quando foi VERIFICADO pela última vez
      lastCheck: lastCheck || cache.lastUpdated,
      totalPlayers: cache.players.length,
      totalMatches: mapStats?.totalMatches || 0,
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