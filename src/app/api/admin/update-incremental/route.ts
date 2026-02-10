/**
 * Rota: /api/admin/process-incremental
 * VERSÃO RÁPIDA: Usa fetchPlayerWithMatches com lastMatchId
 * Busca APENAS partidas novas → soma com cache → salva
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { SEASONS, type SeasonId } from '@/config/constants';
import type { PlayerStats } from '@/types/app.types';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // ✅ Ler parâmetros
    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';

    let body: any = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch (e) {}

    const playerNicknames: string[] = body.playerNicknames || [];
    const playerIndex: number = body.playerIndex || 0;
    const existingUpdates: Partial<PlayerStats>[] = body.existingUpdates || [];

    console.log(`\n⚡ [INCREMENTAL ${playerIndex + 1}/${playerNicknames.length}]`);

    if (playerNicknames.length === 0) {
      return NextResponse.json({ success: false, error: 'playerNicknames é obrigatório' }, { status: 400 });
    }

    // ✅ Buscar cache atual (onde estão os dados completos)
    const currentCache = await kvCacheService.getCache(seasonId);
    if (!currentCache) {
      return NextResponse.json({ success: false, error: 'Cache não encontrado. Execute batch-update primeiro.' }, { status: 404 });
    }

    // ✅ Verificar se terminou
    if (playerIndex >= playerNicknames.length) {
      console.log(`✅ Todos os ${playerNicknames.length} jogadores processados!`);
      return NextResponse.json({
        success: true,
        message: 'Todos os jogadores processados',
        hasMore: false,
        playersUpdated: playerNicknames.length,
      });
    }

    const nickname = playerNicknames[playerIndex];
    const queueId = SEASONS[seasonId].id;
    const faceitService = getFaceitService(FACEIT_API_KEY);

    console.log(`   Jogador: ${nickname}`);

    // ✅ Pegar cache individual do jogador (tem o lastMatchId)
    const cachedPlayer = await kvCacheService.getPlayerCache(nickname, seasonId);
    const lastMatchId = cachedPlayer?.lastMatchId || null;

    console.log(`   lastMatchId: ${lastMatchId ? lastMatchId.substring(0, 8) + '...' : 'nenhum'}`);

    try {
      // ✅ CHAVE: Usar fetchPlayerWithMatches COM lastMatchId
      // Busca APENAS partidas novas (após lastMatchId)
      // Season 1 = SEMPRE recalcular do zero (shouldUseCache = false)
      const playerData = await faceitService.fetchPlayerWithMatches(
        nickname,
        200,
        lastMatchId,    // ← Para na última partida conhecida
        queueId,
        null            // Season 1 não usa cache incremental
      );

      if (playerData && playerData.matchesPlayed > 0) {
        console.log(`   ✅ ${playerData.matchesPlayed} partidas processadas`);

        // Salvar cache individual atualizado
        await kvCacheService.savePlayerCache(nickname, playerData, seasonId);

        // Atualizar no cache geral
        const playerMap = new Map(currentCache.players.map(p => [p.playerId, p]));
        playerMap.set(playerData.playerId, playerData);

        const mergedPlayers = Array.from(playerMap.values())
          .sort((a, b) => {
            if (a.rankingPoints !== b.rankingPoints) return b.rankingPoints - a.rankingPoints;
            if (a.wins !== b.wins) return b.wins - a.wins;
            return b.matchesPlayed - a.matchesPlayed;
          })
          .map((p, i) => ({ ...p, position: i + 1 }));

        await kvCacheService.saveCache(mergedPlayers, seasonId);
        console.log(`   💾 Cache atualizado (${mergedPlayers.length} jogadores)`);
      } else {
        console.log(`   ⚡ Sem partidas novas para ${nickname}`);
      }
    } catch (error) {
      console.error(`   ❌ Erro ao processar ${nickname}:`, error);
    }

    const duration = Date.now() - startTime;
    const hasMore = playerIndex + 1 < playerNicknames.length;

    console.log(`   ⏱️ ${(duration / 1000).toFixed(1)}s | hasMore: ${hasMore}`);

    return NextResponse.json({
      success: true,
      seasonId,
      currentPlayer: nickname,
      playerIndex,
      hasMore,
      nextPlayerIndex: hasMore ? playerIndex + 1 : null,
      playerNicknames,
      existingUpdates,
      duration: `${(duration / 1000).toFixed(1)}s`,
    });

  } catch (error) {
    console.error('❌ [INCREMENTAL] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;