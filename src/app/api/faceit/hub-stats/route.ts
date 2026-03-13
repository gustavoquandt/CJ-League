/**
 * API Route: /api/faceit/hub-stats
 * 
 * VERSÃO COM VERCEL KV + Suporte a múltiplas seasons
 * Lê APENAS do Redis - Zero chamadas à API FACEIT
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvCacheService } from '@/services/kv-cache.service';
import type { HubStatsResponse } from '@/types/app.types';
import type { SeasonId } from '@/config/constants';

export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('📥 [API] Requisição de usuário recebida');

  try {
    const seasonId = (request.nextUrl.searchParams.get('season') as SeasonId) || 'SEASON_1';
    
    console.log(`📊 [API] Season solicitada: ${seasonId}`);

    const cached = await kvCacheService.getCache(seasonId);

    if (!cached || !cached.players || cached.players.length === 0) {
      console.log(`⚠️ [API] Cache vazio ou inexistente (${seasonId})`);
      
      return NextResponse.json({
        success: false,
        error: 'Dados ainda não disponíveis. Aguarde alguns minutos para a primeira atualização.',
        data: [],
        cache: {
          lastUpdated: new Date().toISOString(),
          nextUpdate: new Date().toISOString(),
          fromCache: false,
        },
      } as HubStatsResponse, { status: 503 });
    }

    console.log(`✅ [API] Retornando ${cached.players.length} jogadores do cache (${seasonId})`);

    const response: HubStatsResponse = {
      success: true,
      data: cached.players,
      cache: {
        lastUpdated: cached.lastUpdated,
        nextUpdate: new Date(new Date(cached.lastUpdated).getTime() + 60 * 60 * 1000).toISOString(),
        fromCache: true,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('❌ [API] Erro ao buscar cache:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar dados do servidor',
      data: [],
      cache: {
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date().toISOString(),
        fromCache: false,
      },
    } as HubStatsResponse, { status: 500 });
  }
}

// Configurações
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';