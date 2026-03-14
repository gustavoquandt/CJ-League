/**
 * Rota: /api/admin/backfill-match-ids
 * Busca apenas os match IDs para todos os jogadores e atualiza o cache.
 * Não re-processa stats — só adiciona matchIds ao cache existente.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { PLAYER_NICKNAMES, SEASONS, type SeasonId } from '@/config/constants';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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

    const faceitService = getFaceitService(FACEIT_API_KEY);
    const results: { nickname: string; status: string; matchIds?: number }[] = [];

    for (const nickname of PLAYER_NICKNAMES) {
      try {
        const cached = await kvCacheService.getPlayerCache(nickname, seasonId);
        if (!cached || !cached.matchesPlayed) {
          results.push({ nickname, status: 'skipped (no cache)' });
          continue;
        }

        if (cached.matchIds && cached.matchIds.length > 0) {
          results.push({ nickname, status: 'already has matchIds', matchIds: cached.matchIds.length });
          continue;
        }

        const matchIds = await faceitService.fetchMatchIds(nickname, cached.matchesPlayed, queueId);
        if (!matchIds) {
          results.push({ nickname, status: 'player not found' });
          continue;
        }

        // Atualizar cache individual
        const updated = { ...cached, matchIds };
        await kvCacheService.savePlayerCache(nickname, updated, seasonId);

        // Atualizar no ranking geral
        const cacheData = await kvCacheService.getCache(seasonId);
        if (cacheData) {
          const idx = cacheData.players.findIndex(
            (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
          );
          if (idx >= 0) {
            cacheData.players[idx] = { ...cacheData.players[idx], matchIds };
            await kvCacheService.saveCache(cacheData.players, seasonId);
          }
        }

        console.log(`✅ ${nickname}: ${matchIds.length} matchIds`);
        results.push({ nickname, status: 'ok', matchIds: matchIds.length });

      } catch (error) {
        console.error(`❌ ${nickname}:`, error);
        results.push({ nickname, status: `error: ${error instanceof Error ? error.message : 'unknown'}` });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;
