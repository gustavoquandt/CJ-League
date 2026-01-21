/**
 * API Route: /api/faceit/hub-stats
 * 
 * Endpoint principal que:
 * 1. Verifica cache em memória
 * 2. Se cache inválido, busca dados da FACEIT
 * 3. Atualiza cache
 * 4. Retorna dados + metadados
 * 
 * Implementa atualização diária às 02:00
 */

import { NextRequest, NextResponse } from 'next/server';
import type { HubStatsResponse } from '@/types/app.types';
import { getFaceitService } from '@/services/faceit.service';
import {
  memoryCache,
  cacheService,
  saveCacheEverywhere,
} from '@/services/cache.service';

// ==================== CONFIGURATION ====================

/**
 * IMPORTANTE: Configure variáveis de ambiente
 * FACEIT_API_KEY=sua_chave_aqui
 */
const FACEIT_API_KEY = process.env.FACEIT_API_KEY;

// ==================== ROUTE HANDLER ====================

/**
 * GET /api/faceit/hub-stats
 * Retorna estatísticas consolidadas de todos os jogadores do hub
 */
export async function GET(request: NextRequest): Promise<NextResponse<HubStatsResponse>> {
  const startTime = Date.now();
  
  console.log('📥 [API] Nova requisição recebida');

  // ==================== 1. VALIDATION ====================

  if (!FACEIT_API_KEY) {
    console.error('❌ [API] FACEIT_API_KEY não configurada');
    return NextResponse.json({
      success: false,
      error: 'FACEIT API Key não configurada. Configure FACEIT_API_KEY nas variáveis de ambiente.',
      cache: {
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date().toISOString(),
        fromCache: false,
      },
    }, { status: 500 });
  }

  // ==================== 2. CHECK CACHE ====================

  try {
    // Verifica cache em memória
    const cachedData = memoryCache.get();
    
    if (cachedData && !cacheService.shouldUpdate(cachedData)) {
      console.log('✅ [API] Retornando dados do cache em memória');
      
      const duration = Date.now() - startTime;
      
      return NextResponse.json({
        success: true,
        data: cachedData.players,
        cache: {
          lastUpdated: cachedData.lastUpdated,
          nextUpdate: cachedData.nextUpdate,
          fromCache: true,
        },
        meta: {
          totalPlayers: cachedData.players.length,
          updateDuration: duration,
        },
      });
    }

    console.log('🔄 [API] Cache inválido ou inexistente, buscando dados frescos...');

    // ==================== 3. FETCH FRESH DATA ====================

    const faceitService = getFaceitService(FACEIT_API_KEY);
    
    // Busca todos os dados
    const players = await faceitService.fetchAllPlayersStats((progress) => {
      // Log de progresso (pode ser usado para SSE no futuro)
      if (progress.current % 10 === 0 || progress.current === progress.total) {
        console.log(
          `📊 [API] Progresso: ${progress.current}/${progress.total} ` +
          `(${progress.percentage}%) - ${progress.currentPlayer}`
        );
      }
    });

    if (players.length === 0) {
      console.warn('⚠️ [API] Nenhum jogador retornado pela API');
      
      // Tenta retornar cache antigo se existir
      if (cachedData && cachedData.players.length > 0) {
        console.log('📦 [API] Retornando cache antigo como fallback');
        return NextResponse.json({
          success: true,
          data: cachedData.players,
          error: 'Aviso: usando dados em cache pois a atualização falhou',
          cache: {
            lastUpdated: cachedData.lastUpdated,
            nextUpdate: cachedData.nextUpdate,
            fromCache: true,
          },
          meta: {
            totalPlayers: cachedData.players.length,
          },
        });
      }

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

    // ==================== 4. UPDATE CACHE ====================

    const newCacheData = saveCacheEverywhere(
      players,
      () => {} // localStorage não disponível no servidor
    );

    // ==================== 5. RETURN RESPONSE ====================

    const duration = Date.now() - startTime;
    const requestCount = faceitService.getRequestCount();

    console.log(`✅ [API] Dados atualizados com sucesso em ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 [API] ${players.length} jogadores | ${requestCount} requisições à FACEIT`);

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
    console.error('❌ [API] Erro ao processar requisição:', error);

    // Tenta retornar cache como fallback
    const cachedData = memoryCache.get();
    if (cachedData && cachedData.players.length > 0) {
      console.log('📦 [API] Retornando cache como fallback após erro');
      return NextResponse.json({
        success: true,
        data: cachedData.players,
        error: 'Aviso: usando dados em cache devido a um erro na atualização',
        cache: {
          lastUpdated: cachedData.lastUpdated,
          nextUpdate: cachedData.nextUpdate,
          fromCache: true,
        },
        meta: {
          totalPlayers: cachedData.players.length,
        },
      });
    }

    // Erro fatal - sem cache disponível
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao buscar dados',
      cache: {
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date().toISOString(),
        fromCache: false,
      },
    }, { status: 500 });
  }
}

// ==================== ROUTE CONFIG ====================

/**
 * Configuração do Next.js para esta rota
 * - dynamic: 'force-dynamic' = nunca cacheia (sempre executa)
 * - runtime: 'nodejs' = usa Node.js runtime (não Edge)
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Timeout de 5 minutos (para buscar muitos jogadores)
export const maxDuration = 300;
