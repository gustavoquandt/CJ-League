/**
 * /api/admin/update-player?nickname=NICK&season=SEASON_1
 *
 * Batch-update de UM jogador específico.
 * Útil para debug e testes sem rodar o batch completo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { SEASONS, type SeasonId } from '@/config/constants';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';
const MAX_MATCHES = 200;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth
  const authHeader = request.headers.get('authorization');
  const secret = authHeader?.replace('Bearer ', '');
  if (!secret || secret !== ADMIN_SECRET) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  if (!FACEIT_API_KEY) {
    return NextResponse.json({ success: false, error: 'FACEIT API Key não configurada' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const nickname = searchParams.get('nickname');
  const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';

  if (!nickname) {
    return NextResponse.json({ success: false, error: 'Parâmetro "nickname" é obrigatório' }, { status: 400 });
  }

  const queueId = SEASONS[seasonId].id;
  const startTime = Date.now();

  console.log(`\n🎯 [UPDATE-PLAYER] Processando ${nickname} (${SEASONS[seasonId].name})...`);

  try {
    const faceitService = getFaceitService(FACEIT_API_KEY);

    const playerData = await faceitService.fetchPlayerWithMatches(
      nickname,
      MAX_MATCHES,
      null,
      queueId,
      null,
    );

    if (!playerData) {
      return NextResponse.json({ success: false, error: `Jogador "${nickname}" não encontrado` }, { status: 404 });
    }

    // Salvar cache individual
    await kvCacheService.savePlayerCache(nickname, playerData, seasonId);

    // Atualizar no ranking geral
    const cache = await kvCacheService.getCache(seasonId);
    if (cache) {
      const idx = cache.players.findIndex(
        (p) => p.nickname.toLowerCase() === nickname.toLowerCase(),
      );
      if (idx >= 0) {
        cache.players[idx] = playerData;
      } else {
        cache.players.push(playerData);
      }

      // Re-sort & re-position
      cache.players.sort((a, b) => {
        if (a.rankingPoints !== b.rankingPoints) return b.rankingPoints - a.rankingPoints;
        if (a.wins !== b.wins) return b.wins - a.wins;
        return a.matchesPlayed - b.matchesPlayed;
      });
      cache.players.forEach((p, i) => { p.position = i + 1; });

      await kvCacheService.saveCache(cache.players, seasonId);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ [UPDATE-PLAYER] ${nickname}: ${playerData.matchesPlayed} partidas em ${duration}s`);
    console.log(`   totalFirstKills: ${playerData.totalFirstKills}`);
    console.log(`   totalFirstDeaths: ${playerData.totalFirstDeaths}`);
    console.log(`   totalFlashSuccesses: ${playerData.totalFlashSuccesses}`);
    console.log(`   totalKnifeKills: ${playerData.totalKnifeKills}`);

    return NextResponse.json({
      success: true,
      nickname,
      seasonId,
      duration: `${duration}s`,
      stats: {
        matchesPlayed: playerData.matchesPlayed,
        wins: playerData.wins,
        losses: playerData.losses,
        totalFirstKills: playerData.totalFirstKills,
        totalFirstDeaths: playerData.totalFirstDeaths,
        totalFlashSuccesses: playerData.totalFlashSuccesses,
        totalKnifeKills: playerData.totalKnifeKills,
        pentaKills: playerData.pentaKills,
      },
    });
  } catch (error) {
    console.error(`❌ [UPDATE-PLAYER] Erro:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;
