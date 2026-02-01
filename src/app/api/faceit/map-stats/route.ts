import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { SEASONS, type SeasonId } from '@/config/constants';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY || '';

// Criar instância do Redis
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    const seasonId = (request.nextUrl.searchParams.get('season') as SeasonId) || 'SEASON_1';
    const force = request.nextUrl.searchParams.get('force') === 'true';
    const queueId = SEASONS[seasonId].id;
    
    console.log(`📊 [MAP STATS] Buscando stats de mapas para ${SEASONS[seasonId].name}`);
    if (force) {
      console.log(`⚡ [MAP STATS] Modo FORCE - Deletando cache e buscando fresh`);
      // ✅ DELETAR cache quando force=true
      const cacheKey = `cj-stats:mapstats:${seasonId}`;
      try {
        await redis.del(cacheKey);
        console.log(`🗑️ Cache deletado`);
      } catch (e) {
        console.warn('⚠️ Erro ao deletar cache:', e);
      }
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
    console.log(`🔍 [MAP STATS] Buscando da API FACEIT...`);
    
    const maps: Record<string, number> = {};
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    let totalMatches = 0;
    const maxPages = 10; // Limitar a 1000 matches (10 * 100)
    let currentPage = 0;

    // ✅ CORREÇÃO: Usar endpoint de HUB, não championship
    while (hasMore && currentPage < maxPages) {
      const url = `https://open.faceit.com/data/v4/hubs/${queueId}/matches?offset=${offset}&limit=${limit}`;
      
      console.log(`   🔍 Buscando página ${currentPage + 1}/${maxPages}...`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${FACEIT_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`❌ Erro na API: ${response.status}`);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data?.items || data.items.length === 0) {
        console.log(`   ℹ️ Sem mais matches na página ${currentPage + 1}`);
        break;
      }

      console.log(`   📊 Processando ${data.items.length} matches...`);

      for (const match of data.items) {
        if (match.status !== 'finished') continue;
        
        // Tentar pegar o mapa de diferentes lugares
        const mapName = match.voting?.map?.name || 
                       match.voting?.map?.pick?.[0] ||
                       match.game_mode;
        
        if (mapName && typeof mapName === 'string') {
          maps[mapName] = (maps[mapName] || 0) + 1;
          totalMatches++;
        }
      }

      console.log(`   ✅ Total acumulado: ${totalMatches} partidas`);
      
      offset += limit;
      currentPage++;
      hasMore = data.items.length === limit;
      
      // Delay entre requests
      if (hasMore && currentPage < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`🎯 [MAP STATS] Total processado: ${totalMatches} partidas`);
    console.log(`📊 [MAP STATS] Mapas encontrados:`, maps);

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

    // Salvar no cache (1 dia)
    const cacheKey = `cj-stats:mapstats:${seasonId}`;
    try {
      await redis.set(cacheKey, mapStats, { ex: 86400 });
      console.log(`💾 [MAP STATS] Salvo no cache`);
    } catch (error) {
      console.warn('⚠️ Erro ao salvar no cache:', error);
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
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          mostPlayed: null,
          leastPlayed: null,
          totalMatches: 0,
          mapDistribution: {},
        }
      },
      { status: 500 }
    );
  }
}