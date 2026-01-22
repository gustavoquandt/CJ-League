/**
 * API Route: /api/admin/force-update
 * 
 * Endpoint admin para forçar atualização manual
 * Versão com resposta rápida para cron-job.org
 * 
 * Retorna 200 OK imediatamente e processa em background
 */

import { NextRequest, NextResponse } from 'next/server';
import type { HubStatsResponse } from '@/types/app.types';
import { getFaceitService } from '@/services/faceit.service';
import { saveCacheEverywhere } from '@/services/cache.service';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🔐 [ADMIN] Requisição de atualização forçada recebida');

  try {
    // 1. Verificar autenticação
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
      console.log('❌ [ADMIN] Senha incorreta ou ausente');
      return NextResponse.json({
        success: false,
        error: 'Não autorizado',
        cache: {
          lastUpdated: new Date().toISOString(),
          nextUpdate: new Date().toISOString(),
          fromCache: false,
        },
      }, { status: 401 });
    }

    console.log('✅ [ADMIN] Autenticação bem-sucedida');

    // 2. Validar API key
    if (!FACEIT_API_KEY) {
      console.error('❌ [ADMIN] FACEIT_API_KEY não configurada');
      return NextResponse.json({
        success: false,
        error: 'FACEIT API Key não configurada',
        cache: {
          lastUpdated: new Date().toISOString(),
          nextUpdate: new Date().toISOString(),
          fromCache: false,
        },
      }, { status: 500 });
    }

    // 3. INICIAR PROCESSAMENTO EM BACKGROUND (não espera terminar!)
    console.log('🔄 [ADMIN] Iniciando atualização em background...');
    
    // Processa em background sem bloquear a resposta
    processUpdateInBackground(FACEIT_API_KEY).catch((error) => {
      console.error('❌ [ADMIN] Erro no background:', error);
    });

    // 4. RETORNAR RESPOSTA IMEDIATA (antes de terminar a atualização!)
    console.log('✅ [ADMIN] Resposta enviada, processamento continua em background');
    
    return NextResponse.json({
      success: true,
      message: 'Atualização iniciada em background',
      data: [], // Array vazio enquanto processa
      cache: {
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1 hora
        fromCache: false,
      },
      meta: {
        totalPlayers: 0, // Será atualizado quando processar
        status: 'processing',
        estimatedDuration: '5-10 minutos',
      },
    });

  } catch (error) {
    console.error('❌ [ADMIN] Erro ao iniciar atualização:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      cache: {
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date().toISOString(),
        fromCache: false,
      },
    }, { status: 500 });
  }
}

/**
 * Processa a atualização em background
 * Esta função roda DEPOIS da resposta ser enviada
 */
async function processUpdateInBackground(apiKey: string): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log('📊 [BACKGROUND] Iniciando busca de dados...');
    
    const faceitService = getFaceitService(apiKey);
    
    const players = await faceitService.fetchAllPlayersStats((progress) => {
      if (progress.current % 10 === 0 || progress.current === progress.total) {
        console.log(
          `📊 [BACKGROUND] Progresso: ${progress.current}/${progress.total} ` +
          `(${progress.percentage}%)`
        );
      }
    });

    if (players.length === 0) {
      console.warn('⚠️ [BACKGROUND] Nenhum jogador retornado');
      return;
    }

    // Atualizar cache
    saveCacheEverywhere(players, () => {});

    const duration = Date.now() - startTime;
    const requestCount = faceitService.getRequestCount();

    console.log(`✅ [BACKGROUND] Atualização concluída em ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 [BACKGROUND] ${players.length} jogadores | ${requestCount} requisições`);

  } catch (error) {
    console.error('❌ [BACKGROUND] Erro durante atualização:', error);
    throw error;
  }
}

// Configuração da rota
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos (para o background job)