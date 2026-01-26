/**
 * Rota com detector de novos jogadores + ultra safe
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { detectNewPlayers } from '@/services/new-players-detector';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';

function forceLog(message: string) {
  console.log(message);
  console.error(message);
  process.stdout.write(message + '\n');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  forceLog('🔐 [ADMIN] Requisição de atualização recebida');

  try {
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
      forceLog('❌ [ADMIN] Não autorizado');
      return NextResponse.json({
        success: false,
        error: 'Não autorizado',
      }, { status: 401 });
    }

    forceLog('✅ [ADMIN] Autenticado');

    if (!FACEIT_API_KEY) {
      forceLog('❌ [ADMIN] FACEIT_API_KEY não configurada');
      return NextResponse.json({
        success: false,
        error: 'FACEIT API Key não configurada',
      }, { status: 500 });
    }

    forceLog('🔄 [ADMIN] Iniciando processamento síncrono...');
    
    try {
      // 1. DETECTAR NOVOS JOGADORES PRIMEIRO
      forceLog('\n' + '='.repeat(60));
      const detection = await detectNewPlayers();
      forceLog('='.repeat(60) + '\n');
      
      if (detection.newPlayers.length > 0) {
        forceLog(`⚠️ ATENÇÃO: ${detection.newPlayers.length} NOVOS JOGADORES!`);
        forceLog('📝 Veja os logs acima para adicionar ao constants.ts');
      }
      
      // 2. PROCESSAR JOGADORES
      await processUpdateSync(FACEIT_API_KEY);
      
      forceLog('✅ [ADMIN] Processamento COMPLETO!');
      
      return NextResponse.json({
        success: true,
        message: 'Atualização concluída com sucesso',
        newPlayers: detection.newPlayers,
      });
    } catch (error) {
      forceLog(`❌ [ADMIN] Erro no processamento: ${error}`);
      throw error;
    }

  } catch (error) {
    forceLog(`❌ [ADMIN] Erro geral: ${error}`);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

async function processUpdateSync(apiKey: string): Promise<void> {
  const startTime = Date.now();
  
  forceLog('📊 [SYNC] Iniciando atualização...');
  
  try {
    const faceitService = getFaceitService(apiKey);
    
    forceLog('💾 [SYNC] Carregando cache do Redis...');
    const cached = await kvCacheService.getCache();
    const cachedPlayers = cached?.players || [];
    
    forceLog(`💾 [SYNC] Cache carregado: ${cachedPlayers.length} jogadores`);
    
    forceLog('⚠️ [SYNC] Fazendo atualização COMPLETA (ultra safe)...');
    
    const players = await faceitService.fetchAllPlayersStats((progress) => {
      if (progress.current % 5 === 0 || progress.current === progress.total) {
        forceLog(`📊 [SYNC] Progresso: ${progress.current}/${progress.total} (${progress.percentage}%)`);
      }
    });

    forceLog(`📊 [SYNC] Recebeu ${players.length} jogadores`);

    if (players.length === 0) {
      forceLog('⚠️ [SYNC] AVISO: Nenhum jogador retornado!');
      return;
    }

    forceLog('💾 [SYNC] Salvando no Redis...');
    await kvCacheService.saveCache(players);
    forceLog('✅ [SYNC] Salvo no Redis com sucesso!');

    const duration = Date.now() - startTime;
    const requestCount = faceitService.getRequestCount();

    forceLog(`✅ [SYNC] Concluído em ${(duration / 1000).toFixed(1)}s`);
    forceLog(`📊 [SYNC] ${players.length} jogadores | ${requestCount} requisições`);

  } catch (error) {
    forceLog(`❌ [SYNC] Erro crítico: ${error}`);
    if (error instanceof Error) {
      forceLog(`❌ [SYNC] Stack: ${error.stack}`);
    }
    throw error;
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;