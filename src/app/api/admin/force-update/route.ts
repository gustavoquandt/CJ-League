/**
 * API Route: /api/admin/force-update
 * 
 * Endpoint admin para forçar atualização manual
 * Requer autenticação via ADMIN_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import type { HubStatsResponse } from '@/types/app.types';
import { getFaceitService } from '@/services/faceit.service';
import { saveCacheEverywhere } from '@/services/cache.service';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';

export async function POST(request: NextRequest): Promise<NextResponse<HubStatsResponse>> {
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

    // 3. Forçar busca de dados frescos
    console.log('🔄 [ADMIN] Iniciando busca forçada de dados...');
    const startTime = Date.now();

    const faceitService = getFaceitService(FACEIT_API_KEY);
    
    const players = await faceitService.fetchAllPlayersStats((progress) => {
      if (progress.current % 10 === 0 || progress.current === progress.total) {
        console.log(
          `📊 [ADMIN] Progresso: ${progress.current}/${progress.total} ` +
          `(${progress.percentage}%)`
        );
      }
    });

    if (players.length === 0) {
      console.warn('⚠️ [ADMIN] Nenhum jogador retornado');
      return NextResponse.json({
        success: false,
        error: 'Nenhum jogador encontrado',
        cache: {
          lastUpdated: new Date().toISOString(),
          nextUpdate: new Date().toISOString(),
          fromCache: false,
        },
      }, { status: 404 });
    }

    // 4. Atualizar cache
    const newCacheData = saveCacheEverywhere(players, () => {});

    const duration = Date.now() - startTime;
    const requestCount = faceitService.getRequestCount();

    console.log(`✅ [ADMIN] Atualização forçada concluída em ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 [ADMIN] ${players.length} jogadores | ${requestCount} requisições`);

    // 5. Retornar resposta
    return NextResponse.json({
      success: true,
      data: players,
      cache: {
        lastUpdated: newCacheData.lastUpdated,
        nextUpdate: newCacheData.nextUpdate,
        fromCache: false,
      },
      meta: {
        totalPlayers: players.length,
        updateDuration: duration,
        apiCalls: requestCount,
      },
    });

  } catch (error) {
    console.error('❌ [ADMIN] Erro ao forçar atualização:', error);
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

// Configuração da rota
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos