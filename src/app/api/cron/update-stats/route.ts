/**
 * Rota: /api/cron/update-stats
 * Para uso com cron-job.org (GET request)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PLAYER_NICKNAMES } from '@/config/constants';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

function forceLog(message: string) {
  console.log(message);
  console.error(message); // Garantir visibilidade nos logs
}

// ✅ GET para cron-job.org
export async function GET(request: NextRequest): Promise<NextResponse> {
  forceLog('⏰ [CRON] Atualização automática iniciada');
  forceLog(`⏰ [CRON] Timestamp: ${new Date().toISOString()}`);

  try {
    // Verificar autenticação (opcional, via query param ou header)
    if (CRON_SECRET) {
      const urlSecret = request.nextUrl.searchParams.get('secret');
      const headerSecret = request.headers.get('x-cron-secret');
      
      if (urlSecret !== CRON_SECRET && headerSecret !== CRON_SECRET) {
        forceLog('❌ [CRON] Não autorizado');
        return NextResponse.json({
          success: false,
          error: 'Não autorizado',
        }, { status: 401 });
      }
    }

    forceLog('✅ [CRON] Autenticado');

    if (!FACEIT_API_KEY) {
      forceLog('❌ [CRON] FACEIT_API_KEY não configurada');
      return NextResponse.json({
        success: false,
        error: 'FACEIT API Key não configurada',
      }, { status: 500 });
    }

    const startTime = Date.now();

    forceLog(`📊 [CRON] Processando ${PLAYER_NICKNAMES.length} jogadores...`);
    
    const faceitService = getFaceitService(FACEIT_API_KEY);
    
    const players = await faceitService.fetchPlayersBatch(
      PLAYER_NICKNAMES,
      (progress) => {
        // Log a cada 10 jogadores
        if (progress.current % 10 === 0 || progress.current === progress.total) {
          forceLog(`📊 [CRON] Progresso: ${progress.current}/${progress.total} (${progress.percentage}%)`);
        }
      }
    );

    forceLog(`📊 [CRON] Processou ${players.length} jogadores`);

    if (players.length === 0) {
      forceLog('⚠️ [CRON] AVISO: Nenhum jogador retornado!');
      
      return NextResponse.json({
        success: false,
        error: 'Nenhum jogador processado',
      }, { status: 500 });
    }

    // Ordenar e posicionar
    players.sort((a, b) => {
      if (a.rankingPoints !== b.rankingPoints) return b.rankingPoints - a.rankingPoints;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.matchesPlayed - a.matchesPlayed;
    });

    players.forEach((player, index) => {
      player.position = index + 1;
    });

    forceLog('💾 [CRON] Salvando no Redis...');
    await kvCacheService.saveCache(players);
    forceLog('✅ [CRON] Salvo no Redis com sucesso!');

    const duration = Date.now() - startTime;
    const requestCount = faceitService.getRequestCount();

    forceLog(`✅ [CRON] Concluído em ${(duration / 1000).toFixed(1)}s (${(duration / 60000).toFixed(1)} min)`);
    forceLog(`📊 [CRON] ${players.length} jogadores | ${requestCount} requisições`);

    return NextResponse.json({
      success: true,
      message: 'Atualização concluída com sucesso',
      duration: duration,
      playersProcessed: players.length,
      requests: requestCount,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    forceLog(`❌ [CRON] Erro: ${error}`);
    
    if (error instanceof Error) {
      forceLog(`❌ [CRON] Stack: ${error.stack}`);
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// CONFIGURAÇÕES
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos