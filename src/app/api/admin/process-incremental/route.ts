/**
 * Rota: /api/admin/process-incremental
 * Processa 1 JOGADOR POR VEZ (evita timeout)
 * Sistema recursivo igual batch-update
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
      return NextResponse.json({
        success: false,
        error: 'Não autorizado',
      }, { status: 401 });
    }

    if (!FACEIT_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'FACEIT API Key não configurada',
      }, { status: 500 });
    }

    // ✅ Ler dados
    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';
    
    // Body pode ter: playerNicknames (primeira chamada) OU playerIndex (recursivo)
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Sem body
    }

    const playerNicknames: string[] = body.playerNicknames || [];
    const playerIndex: number = body.playerIndex || 0;
    const existingPlayers: PlayerStats[] = body.existingPlayers || [];

    console.log(`\n⚡ [INCREMENTAL ${playerIndex + 1}/${playerNicknames.length}]`);

    // ✅ Validação
    if (playerNicknames.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'playerNicknames é obrigatório',
      }, { status: 400 });
    }

    // ✅ Verificar se terminou
    if (playerIndex >= playerNicknames.length) {
      console.log(`✅ Todos os ${playerNicknames.length} jogadores processados!`);
      
      // Salvar cache final
      await kvCacheService.saveCache(existingPlayers, seasonId);
      
      return NextResponse.json({
        success: true,
        message: 'Todos os jogadores processados',
        playersUpdated: existingPlayers.length,
        totalPlayers: existingPlayers.length,
        hasMore: false,
      });
    }

    const nickname = playerNicknames[playerIndex];
    const queueId = SEASONS[seasonId].id;

    console.log(`   Processando: ${nickname}`);

    const faceitService = getFaceitService(FACEIT_API_KEY);

    // ✅ Buscar cache atual
    const currentCache = await kvCacheService.getCache(seasonId);
    if (!currentCache) {
      return NextResponse.json({
        success: false,
        error: 'Cache não encontrado',
      }, { status: 404 });
    }

    try {
      // ✅ Buscar lastMatchId do cache individual do jogador
      const cachedPlayer = await kvCacheService.getPlayerCache(nickname, seasonId);
      const lastMatchId = cachedPlayer?.lastMatchId || null;

      console.log(`   lastMatchId: ${lastMatchId ? lastMatchId.substring(0, 8) + '...' : 'nenhum'}`);

      // ✅ CORRETO: fetchPlayerWithMatches com queueId da Season correta
      // Garante que só busca partidas da Season 1, não da Season 0!
      const playerData = await faceitService.fetchPlayerWithMatches(
        nickname,
        200,
        lastMatchId,  // Para na última partida conhecida
        queueId,      // ← queueId da Season 1 (bcbe03eb...)
        null          // Season 1 = sem acumulação de cache
      );
      
      if (playerData) {
        console.log(`      ✅ ${playerData.matchesPlayed} partidas, ${playerData.rankingPoints} pts`);

        // Salvar cache individual atualizado
        await kvCacheService.savePlayerCache(nickname, playerData, seasonId);
        
        // Adicionar ou atualizar
        const existingIndex = existingPlayers.findIndex(
          p => p.playerId === playerData.playerId
        );

        if (existingIndex >= 0) {
          existingPlayers[existingIndex] = playerData;
        } else {
          existingPlayers.push(playerData);
        }
      } else {
        console.warn(`      ⚠️ Sem dados para ${nickname}`);
      }
    } catch (error) {
      console.error(`      ❌ Erro ao processar ${nickname}:`, error);
    }

    // ✅ Mesclar com cache
    const playerMap = new Map(currentCache.players.map(p => [p.playerId, p]));
    
    existingPlayers.forEach(player => {
      playerMap.set(player.playerId, player);
    });

    const mergedPlayers = Array.from(playerMap.values())
      .sort((a, b) => {
        if (a.rankingPoints !== b.rankingPoints) return b.rankingPoints - a.rankingPoints;
        if (a.wins !== b.wins) return b.wins - a.wins;
        return b.matchesPlayed - a.matchesPlayed;
      })
      .map((player, index) => ({
        ...player,
        position: index + 1,
      }));

    // ✅ Salvar cache parcial
    await kvCacheService.saveCache(mergedPlayers, seasonId);

    const duration = Date.now() - startTime;
    const hasMore = playerIndex + 1 < playerNicknames.length;

    console.log(`   ⏱️ Concluído em ${(duration / 1000).toFixed(1)}s`);
    console.log(`   Progresso: ${playerIndex + 1}/${playerNicknames.length}`);

    return NextResponse.json({
      success: true,
      seasonId,
      currentPlayer: nickname,
      playersUpdated: existingPlayers.length,
      totalPlayers: mergedPlayers.length,
      hasMore,
      nextPlayerIndex: hasMore ? playerIndex + 1 : null,
      existingPlayers,
      playerNicknames,
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
export const maxDuration = 300; // 5 minutos