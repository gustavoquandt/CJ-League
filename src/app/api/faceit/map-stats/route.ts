// ✅ CRIAR ARQUIVO: src/app/api/faceit/map-stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { SEASONS, type SeasonId } from '@/config/constants';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY || '';

// Criar instância do Redis (mesmo padrão do resto do projeto)
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    const seasonId = (request.nextUrl.searchParams.get('season') as SeasonId) || 'SEASON_1';
    const force = request.nextUrl.searchParams.get('force') === 'true'; // ✅ NOVO
    const queueId = SEASONS[seasonId].id;
    
    console.log(`📊 [MAP STATS] Buscando stats de mapas para ${SEASONS[seasonId].name}`);
    if (force) {
      console.log(`⚡ [MAP STATS] Modo FORCE - Ignorando cache`);
    }

    // Tentar cache primeiro (só se não for force)
    if (!force) {
      const cacheKey = `cj-stats:mapstats:${seasonId}`;
      
      try {
        const cached = await redis.get(cacheKey);
        
        if (cached) {
          console.log(`✅ [MAP STATS] Retornando do cache`);
          return NextResponse.json({
            success: true,
            data: cached,
            fromCache: true,
          });
        }
      } catch (redisError) {
        console.warn('⚠️ Erro ao acessar Redis, continuando sem cache:', redisError);
      }
    }

    // Se não tem cache, buscar da API
    console.log(`🔍 [MAP STATS] Buscando da API...`);
    
    const maps: Record<string, number> = {};
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    let totalMatches = 0;

    while (hasMore) {
      const url = `https://open.faceit.com/data/v4/championships/${queueId}/matches?offset=${offset}&limit=${limit}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${FACEIT_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data?.items || data.items.length === 0) break;

      for (const match of data.items) {
        if (match.status !== 'finished') continue;
        
        const mapName = match.voting?.map?.name || match.voting?.map?.pick?.[0];
        
        if (mapName) {
          maps[mapName] = (maps[mapName] || 0) + 1;
          totalMatches++;
        }
      }

      console.log(`   📊 Processados ${offset + data.items.length} matches...`);
      
      offset += limit;
      hasMore = data.items.length === limit;
      
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Processar resultados
    const sortedMaps = Object.entries(maps).sort(([, a], [, b]) => b - a);

    const mapStats = sortedMaps.length > 0 ? {
      mostPlayed: {
        map: sortedMaps[0][0],
        count: sortedMaps[0][1],
        percentage: (sortedMaps[0][1] / totalMatches) * 100,
      },
      leastPlayed: {
        map: sortedMaps[sortedMaps.length - 1][0],
        count: sortedMaps[sortedMaps.length - 1][1],
        percentage: (sortedMaps[sortedMaps.length - 1][1] / totalMatches) * 100,
      },
      totalMatches,
      mapDistribution: maps,
    } : {
      mostPlayed: null,
      leastPlayed: null,
      totalMatches: 0,
      mapDistribution: {},
    };

    // Tentar salvar no cache (1 dia)
    const cacheKey = `cj-stats:mapstats:${seasonId}`;
    try {
      await redis.set(cacheKey, mapStats, { ex: 86400 });
      console.log(`✅ [MAP STATS] ${totalMatches} partidas analisadas e salvas no cache`);
    } catch (redisError) {
      console.warn('⚠️ Erro ao salvar no Redis:', redisError);
      console.log(`✅ [MAP STATS] ${totalMatches} partidas analisadas (sem cache)`);
    }

    return NextResponse.json({
      success: true,
      data: mapStats,
      fromCache: false,
    });

  } catch (error) {
    console.error('❌ [MAP STATS] Erro:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}