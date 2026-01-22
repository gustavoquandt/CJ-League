/**
 * API Route: /api/admin/force-update
 * 
 * VERSÃO COM ATUALIZAÇÃO INCREMENTAL
 * Atualiza apenas jogadores com partidas novas
 */

import { NextRequest, NextResponse } from 'next/server';
import type { HubStatsResponse } from '@/types/app.types';
import { getFaceitService } from '@/services/faceit.service';
import { saveCacheEverywhere } from '@/services/cache.service';
import { storageService } from '@/services/storage.service';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🔐 [ADMIN] Requisição de atualização recebida');

  try {
    // 1. Autenticação
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
      console.log('❌ [ADMIN] Não autorizado');
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

    console.log('✅ [ADMIN] Autenticado');

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

    // 3. INICIAR PROCESSAMENTO EM BACKGROUND
    console.log('🔄 [ADMIN] Iniciando atualização incremental em background...');
    
    processIncrementalUpdate(FACEIT_API_KEY).catch((error) => {
      console.error('❌ [ADMIN] Erro no background:', error);
    });

    // 4. RETORNAR RESPOSTA IMEDIATA
    console.log('✅ [ADMIN] Resposta enviada, processamento em background');
    
    return NextResponse.json({
      success: true,
      message: 'Atualização incremental iniciada',
      data: [],
      cache: {
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        fromCache: false,
      },
      meta: {
        totalPlayers: 0,
        status: 'processing',
        mode: 'incremental',
        estimatedDuration: '10-60 segundos (depende de quantos jogaram)',
      },
    });

  } catch (error) {
    console.error('❌ [ADMIN] Erro:', error);
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
 * Processamento em background com atualização incremental
 */
async function processIncrementalUpdate(apiKey: string): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log('📊 [BACKGROUND] Iniciando atualização incremental...');
    
    const faceitService = getFaceitService(apiKey);
    
    // Carregar cache atual usando storageService
    const cachedData = storageService.getCache();
    const cachedPlayers = cachedData?.players || [];
    
    console.log(`💾 [BACKGROUND] Cache carregado: ${cachedPlayers.length} jogadores`);
    
    let players;
    
    // Se não tem cache, fazer atualização completa
    if (cachedPlayers.length === 0) {
      console.log('⚠️ [BACKGROUND] Sem cache, fazendo atualização COMPLETA...');
      
      players = await faceitService.fetchAllPlayersStats((progress) => {
        if (progress.current % 10 === 0 || progress.current === progress.total) {
          console.log(
            `📊 [BACKGROUND] Progresso: ${progress.current}/${progress.total} ` +
            `(${progress.percentage}%)`
          );
        }
      });
    } else {
      // Fazer atualização INCREMENTAL
      console.log('🔄 [BACKGROUND] Fazendo atualização INCREMENTAL...');
      
      players = await faceitService.fetchAllPlayersStatsIncremental(
        cachedPlayers,
        (progress) => {
          if (progress.current % 5 === 0 || progress.current === progress.total) {
            console.log(
              `📊 [BACKGROUND] Atualizando: ${progress.current}/${progress.total} ` +
              `(${progress.percentage}%)`
            );
          }
        }
      );
    }

    if (players.length === 0) {
      console.warn('⚠️ [BACKGROUND] Nenhum jogador retornado');
      return;
    }

    // Salvar cache atualizado
    saveCacheEverywhere(players, () => {});

    const duration = Date.now() - startTime;
    const requestCount = faceitService.getRequestCount();

    console.log(`✅ [BACKGROUND] Concluído em ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 [BACKGROUND] ${players.length} jogadores | ${requestCount} requisições`);

  } catch (error) {
    console.error('❌ [BACKGROUND] Erro:', error);
    throw error;
  }
}

// Configuração
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;