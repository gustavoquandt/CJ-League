/**
 * Rota: /api/admin/batch-update
 * Processa 5 jogadores por vez e continua automaticamente
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { PLAYER_NICKNAMES } from '@/config/constants';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';
const BATCH_SIZE = 5; // 5 jogadores por batch

interface BatchState {
  currentBatch: number;
  totalBatches: number;
  processedPlayers: string[];
  allPlayers: any[];
  startTime: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('📦 [BATCH] Requisição recebida');

  try {
    // Autenticação
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
      console.log('❌ [BATCH] Não autorizado');
      return NextResponse.json({
        success: false,
        error: 'Não autorizado',
      }, { status: 401 });
    }

    if (!FACEIT_API_KEY) {
      console.log('❌ [BATCH] FACEIT_API_KEY não configurada');
      return NextResponse.json({
        success: false,
        error: 'FACEIT API Key não configurada',
      }, { status: 500 });
    }

    // Ler parâmetros do batch
    const body = await request.json();
    const batchNumber = body.batchNumber || 0;
    const existingPlayers = body.existingPlayers || [];

    const totalBatches = Math.ceil(PLAYER_NICKNAMES.length / BATCH_SIZE);
    const startIndex = batchNumber * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, PLAYER_NICKNAMES.length);
    const batchNicknames = PLAYER_NICKNAMES.slice(startIndex, endIndex);

    console.log(`📊 [BATCH ${batchNumber + 1}/${totalBatches}]`);
    console.log(`   Jogadores ${startIndex + 1}-${endIndex} de ${PLAYER_NICKNAMES.length}`);
    console.log(`   ${batchNicknames.join(', ')}`);

    // Processar batch
    const faceitService = getFaceitService(FACEIT_API_KEY);
    const startTime = Date.now();
    
    const newPlayers = await faceitService.fetchPlayersBatch(
      batchNicknames,
      (progress) => {
        console.log(`   [${progress.current}/${progress.total}] ${progress.currentPlayer}`);
      }
    );

    console.log(`✅ [BATCH ${batchNumber + 1}] Processou ${newPlayers.length}/${batchNicknames.length} jogadores`);

    // Combinar com jogadores existentes
    const allPlayers = [...existingPlayers, ...newPlayers];

    // Ordenar e posicionar
    allPlayers.sort((a, b) => {
      if (a.rankingPoints !== b.rankingPoints) return b.rankingPoints - a.rankingPoints;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.matchesPlayed - a.matchesPlayed;
    });

    allPlayers.forEach((player, index) => {
      player.position = index + 1;
    });

    // Salvar no Redis
    await kvCacheService.saveCache(allPlayers);
    console.log(`💾 [BATCH ${batchNumber + 1}] Salvou ${allPlayers.length} jogadores no Redis`);

    const duration = Date.now() - startTime;
    const hasMore = endIndex < PLAYER_NICKNAMES.length;

    console.log(`⏱️ [BATCH ${batchNumber + 1}] Concluído em ${(duration / 1000).toFixed(1)}s`);

    return NextResponse.json({
      success: true,
      batch: {
        current: batchNumber + 1,
        total: totalBatches,
        processed: newPlayers.length,
        totalPlayers: allPlayers.length,
      },
      hasMore,
      nextBatch: hasMore ? batchNumber + 1 : null,
      players: allPlayers, // Retornar para próximo batch
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
export const maxDuration = 300; // 5 minutos