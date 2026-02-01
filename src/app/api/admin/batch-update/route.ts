/**
 * Rota: /api/admin/batch-update
 * 1 JOGADOR POR BATCH (evita timeout de 300s)
 * Sistema otimizado com cache incremental + Suporte a seasons
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { PLAYER_NICKNAMES, SEASONS, type SeasonId } from '@/config/constants';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';
const BATCH_SIZE = 1; // ✅ 1 JOGADOR POR BATCH (seguro para 300s)
const MAX_MATCHES_PER_PLAYER = 200; // ✅ Até 200 partidas

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('📦 [BATCH] Requisição recebida');

  try {
    // Autenticação
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

    // ✅ Ler parâmetros do batch + season
    const body = await request.json();
    const batchNumber = body.batchNumber || 0;
    const existingPlayers = body.existingPlayers || [];
    const seasonId: SeasonId = body.seasonId || 'SEASON_1';
    const queueId = SEASONS[seasonId].id; // ✅ Queue da season

    console.log(`📊 [BATCH] Season: ${SEASONS[seasonId].name} (${queueId})`);

    const totalBatches = Math.ceil(PLAYER_NICKNAMES.length / BATCH_SIZE);
    const playerIndex = batchNumber; // 1 jogador = 1 batch
    
    // Verificar se já processou todos
    if (playerIndex >= PLAYER_NICKNAMES.length) {
      return NextResponse.json({
        success: true,
        message: 'Todos os jogadores já foram processados',
        batch: {
          current: totalBatches,
          total: totalBatches,
          processed: 0,
          totalPlayers: existingPlayers.length,
        },
        hasMore: false,
        players: existingPlayers,
      });
    }

    const nickname = PLAYER_NICKNAMES[playerIndex];

    console.log(`📊 [BATCH ${batchNumber + 1}/${totalBatches}] Processando ${nickname}`);

    const faceitService = getFaceitService(FACEIT_API_KEY);
    const startTime = Date.now();

    try {
      // ✅ Verificar cache do jogador (com season)
      const cachedPlayer = await kvCacheService.getPlayerCache(nickname, seasonId);
      const lastMatchId = cachedPlayer?.lastMatchId || null;

      console.log(`   Cache: ${cachedPlayer ? '✅ Encontrado' : '⚠️ Não encontrado'}`);
      if (lastMatchId) {
        console.log(`   Último match: ${lastMatchId.substring(0, 8)}...`);
      }

      // ✅ Buscar dados atualizados (passando queueId)
      const playerData = await faceitService.fetchPlayerWithMatches(
        nickname,
        MAX_MATCHES_PER_PLAYER,
        lastMatchId,
        queueId // ✅ Usar queue da season
      );

      if (playerData) {
        // ✅ Salvar cache individual do jogador (com season)
        await kvCacheService.savePlayerCache(nickname, playerData, seasonId);
        
        // Atualizar ou adicionar no ranking geral
        const existingIndex = existingPlayers.findIndex(
          (p: any) => p.nickname.toLowerCase() === nickname.toLowerCase()
        );

        if (existingIndex >= 0) {
          existingPlayers[existingIndex] = playerData;
        } else {
          existingPlayers.push(playerData);
        }

        console.log(`   ✅ ${nickname}: ${playerData.matchesPlayed} partidas`);
      } else {
        console.log(`   ⚠️ Sem dados para ${nickname}`);
      }

    } catch (error) {
      console.error(`   ❌ Erro ao processar ${nickname}:`, error);
    }

    // Ordenar e posicionar
    existingPlayers.sort((a: any, b: any) => {
      if (a.rankingPoints !== b.rankingPoints) return b.rankingPoints - a.rankingPoints;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.matchesPlayed - a.matchesPlayed;
    });

    existingPlayers.forEach((player: any, index: number) => {
      player.position = index + 1;
    });

    // ✅ Salvar ranking geral no Redis (com season)
    await kvCacheService.saveCache(existingPlayers, seasonId);
    
    const duration = Date.now() - startTime;
    const hasMore = playerIndex + 1 < PLAYER_NICKNAMES.length;

    console.log(`⏱️ [BATCH ${batchNumber + 1}] Concluído em ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Progresso: ${existingPlayers.length}/${PLAYER_NICKNAMES.length} jogadores`);

    return NextResponse.json({
      success: true,
      batch: {
        current: batchNumber + 1,
        total: totalBatches,
        processed: 1,
        totalPlayers: existingPlayers.length,
        currentPlayer: nickname,
      },
      hasMore,
      nextBatch: hasMore ? batchNumber + 1 : null,
      players: existingPlayers,
    });

  } catch (error) {
    console.error('❌ [BATCH] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos (300s)