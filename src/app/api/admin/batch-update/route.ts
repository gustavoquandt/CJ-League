/**
 * Rota: /api/admin/batch-update
 * 1 JOGADOR POR BATCH (evita timeout de 300s)
 * Sistema otimizado com cache incremental + Suporte a seasons
 * ✅ CORRIGIDO: Funciona sem body (pega season do query param)
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

    // ✅ CORRIGIDO: Ler season do query param
    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';
    const queueId = SEASONS[seasonId].id;
    
    // ✅ Body é opcional (só usado em chamadas recursivas internas)
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Sem body, tudo bem - primeira chamada do GitHub Actions
    }
    
    const batchNumber = body.batchNumber || 0;
    const existingPlayers = body.existingPlayers || [];

    // 🔍 LOG CRÍTICO: Quantos jogadores estão chegando?
    console.log(`\n📦 [BATCH ${batchNumber}] RECEBENDO REQUEST`);
    console.log(`   🔍 existingPlayers recebido: ${existingPlayers.length} jogadores`);
    console.log(`   🔍 Season: ${SEASONS[seasonId].name} (${queueId})`);
    console.log(`   🔍 Batch number: ${batchNumber}`);

    const totalBatches = Math.ceil(PLAYER_NICKNAMES.length / BATCH_SIZE);
    const playerIndex = batchNumber; // 1 jogador = 1 batch
    
    // Verificar se já processou todos
    if (playerIndex >= PLAYER_NICKNAMES.length) {
      console.log(`✅ Todos os ${PLAYER_NICKNAMES.length} jogadores processados!`);
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

      // 🔍 DEBUG: Log antes de buscar
      console.log(`   🔍 Buscando dados para ${nickname}...`);
      console.log(`   🔍 Queue ID: ${queueId}`);
      console.log(`   🔍 Max matches: ${MAX_MATCHES_PER_PLAYER}`);
      if (cachedPlayer) {
        console.log(`   🔍 Cache anterior: ${cachedPlayer.matchesPlayed} partidas`);
      }

      // ✅ Buscar dados atualizados
      // 🚨 CORRIGIDO: Para Season 1, NUNCA passar previousStats (forçar recalculo do zero)
      const shouldUseCache = seasonId === 'SEASON_0'; // Apenas Season 0 usa cache incremental
      
      console.log(`   🔧 Modo: ${shouldUseCache ? 'INCREMENTAL (Season 0)' : 'FULL REFRESH (Season 1)'}`);
      
      const playerData = await faceitService.fetchPlayerWithMatches(
        nickname,
        MAX_MATCHES_PER_PLAYER,
        shouldUseCache ? lastMatchId : null, // Season 1 = sempre null
        queueId,
        shouldUseCache ? cachedPlayer : null // Season 1 = sempre null (força recalculo)
      );

      // 🔍 DEBUG: Log resultado
      console.log(`   🔍 Resultado: ${playerData ? 'SUCESSO' : 'NULL'}`);
      if (playerData) {
        console.log(`   🔍 Total de partidas: ${playerData.matchesPlayed}`);
        console.log(`   🔍 Último match retornado: ${playerData.lastMatchId?.substring(0, 8) || 'nenhum'}`);
      }

      if (playerData) {
        // ✅ Salvar cache individual do jogador (com season)
        await kvCacheService.savePlayerCache(nickname, playerData, seasonId);
        console.log(`   💾 Cache salvo`);
        
        // Atualizar ou adicionar no ranking geral
        const existingIndex = existingPlayers.findIndex(
          (p: any) => p.nickname.toLowerCase() === nickname.toLowerCase()
        );

        // 🔍 DEBUG: Log antes de adicionar
        console.log(`   🔍 Jogadores no array ANTES: ${existingPlayers.length}`);
        console.log(`   🔍 Índice existente: ${existingIndex}`);

        if (existingIndex >= 0) {
          existingPlayers[existingIndex] = playerData;
          console.log(`   🔄 Atualizado jogador existente`);
        } else {
          existingPlayers.push(playerData);
          console.log(`   ➕ Adicionado novo jogador`);
        }

        console.log(`   🔍 Jogadores no array DEPOIS: ${existingPlayers.length}`);
        console.log(`   ✅ ${nickname}: ${playerData.matchesPlayed} partidas`);
      } else {
        console.log(`   ⚠️ Sem dados para ${nickname} - playerData é NULL`);
      }

    } catch (error) {
      console.error(`   ❌ Erro ao processar ${nickname}:`, error);
      console.error(`   ❌ Stack:`, error instanceof Error ? error.stack : 'N/A');
    }

    // Ordenar e posicionar
    console.log(`\n   🔍 ANTES DE ORDENAR: ${existingPlayers.length} jogadores`);
    existingPlayers.sort((a: any, b: any) => {
      if (a.rankingPoints !== b.rankingPoints) return b.rankingPoints - a.rankingPoints;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.matchesPlayed - a.matchesPlayed;
    });

    existingPlayers.forEach((player: any, index: number) => {
      player.position = index + 1;
    });
    console.log(`   🔍 DEPOIS DE ORDENAR: ${existingPlayers.length} jogadores`);

    // ✅ Salvar ranking geral no Redis (com season)
    console.log(`   💾 Salvando ${existingPlayers.length} jogadores no Redis...`);
    await kvCacheService.saveCache(existingPlayers, seasonId);
    
    const duration = Date.now() - startTime;
    const hasMore = playerIndex + 1 < PLAYER_NICKNAMES.length;

    console.log(`⏱️ [BATCH ${batchNumber + 1}] Concluído em ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Progresso: ${existingPlayers.length}/${PLAYER_NICKNAMES.length} jogadores`);
    console.log(`📊 hasMore: ${hasMore}, nextBatch: ${hasMore ? batchNumber + 1 : null}\n`);

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