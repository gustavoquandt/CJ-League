/**
 * /api/admin/update-ratings
 *
 * Recalcula o rating de todos os jogadores usando os dados já no cache.
 * Não faz nenhuma chamada à API da FACEIT — é instantâneo.
 *
 * Requer: totalKills, totalDeaths, totalDamage, totalRounds, totalHeadshots
 * no cache do jogador (populados pelo batch-update ou incremental).
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvCacheService } from '@/services/kv-cache.service';
import { calculateSimplifiedRating } from '@/utils/rating.utils';
import { type SeasonId } from '@/config/constants';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const secret = authHeader?.replace('Bearer ', '');
  if (!secret || secret !== ADMIN_SECRET) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';

  const startTime = Date.now();

  const cache = await kvCacheService.getCache(seasonId);
  if (!cache || cache.players.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'Cache vazio. Execute batch-update primeiro.',
    }, { status: 400 });
  }

  let updated = 0;
  let skipped = 0;

  const updatedPlayers = cache.players.map(player => {
    const { totalKills, totalDeaths, totalDamage, totalRounds, totalHeadshots } = player;

    if (!totalRounds || totalRounds === 0) {
      skipped++;
      return player;
    }

    const rating = calculateSimplifiedRating({
      totalKills:    totalKills    ?? 0,
      totalDeaths:   totalDeaths   ?? 0,
      totalDamage:   totalDamage   ?? 0,
      totalRounds:   totalRounds,
      totalHeadshots: totalHeadshots ?? 0,
    });

    updated++;
    return { ...player, rating };
  });

  await kvCacheService.saveCache(updatedPlayers, seasonId);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  return NextResponse.json({
    success: true,
    updated,
    skipped,
    total: cache.players.length,
    duration: `${duration}s`,
  });
}

export const dynamic    = 'force-dynamic';
export const runtime    = 'nodejs';
