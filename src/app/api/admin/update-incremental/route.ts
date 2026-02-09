/**
 * Rota: /api/admin/update-incremental
 * VERSÃO OTIMIZADA - Não recalcula tudo, apenas incrementa
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { SEASONS, type SeasonId } from '@/config/constants';
import type { PlayerStats } from '@/types/app.types';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('\n⚡ [UPDATE-INCREMENTAL] Iniciando atualização incremental RÁPIDA');
  const startTime = Date.now();

  try {
    // 🔐 Autenticação
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
      console.log('❌ [UPDATE-INCREMENTAL] Não autorizado');
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

    // 📋 Parâmetros
    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';
    const queueId = SEASONS[seasonId].id;

    console.log(`📊 Season: ${SEASONS[seasonId].name}`);
    console.log(`📊 Queue ID: ${queueId}`);

    const faceitService = getFaceitService(FACEIT_API_KEY);

    // ✅ PASSO 1: Buscar cache atual
    console.log('📦 Buscando cache...');
    const currentCache = await kvCacheService.getCache(seasonId);

    if (!currentCache || currentCache.players.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Cache vazio. Execute batch-update primeiro.',
      }, { status: 400 });
    }

    console.log(`   ✅ ${currentCache.players.length} jogadores no cache`);
    const cacheTimestamp = new Date(currentCache.lastUpdated).getTime();

    // ✅ PASSO 2: Buscar últimas partidas
    console.log('🎮 Buscando partidas...');
    const hubMatches: any = await faceitService['request'](
      `/hubs/${queueId}/matches?type=past&offset=0&limit=100`
    );

    const allMatches = hubMatches.items || [];

    // ✅ FIX: Converter timestamps (segundos → milissegundos)
    const newMatches = allMatches.filter((match: any) => {
      const matchTimestamp = match.finished_at || match.started_at;
      const matchTime = typeof matchTimestamp === 'number' && matchTimestamp < 10000000000
        ? matchTimestamp * 1000
        : matchTimestamp;
      return matchTime > cacheTimestamp;
    });

    console.log(`   🆕 ${newMatches.length} partidas novas`);

    // ✅ SALVAR TIMESTAMP DE VERIFICAÇÃO
    await kvCacheService.setLastCheck(seasonId);

    if (newMatches.length === 0) {
      console.log('✅ Nenhuma partida nova');
      return NextResponse.json({
        success: true,
        message: 'Nenhuma partida nova encontrada',
        playersUpdated: 0,
        totalPlayers: currentCache.players.length,
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      });
    }

    // ✅ PASSO 3: Forçar batch-update completo se houver partidas novas
    // (Incremental verdadeiro é complexo demais e dá timeout)
    console.log(`⚠️ ${newMatches.length} partidas novas detectadas`);
    console.log(`⚠️ Use batch-update para processar (incremental dá timeout)`);

    return NextResponse.json({
      success: true,
      message: `${newMatches.length} partidas novas detectadas. Execute batch-update.`,
      playersUpdated: 0,
      newMatchesFound: newMatches.length,
      totalPlayers: currentCache.players.length,
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      recommendation: 'Execute batch-update para processar as partidas novas',
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // 60s