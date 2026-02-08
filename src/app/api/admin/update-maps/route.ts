/**
 * Rota: /api/admin/update-maps
 * Atualiza estatísticas de mapas para uma season
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { SEASONS, type SeasonId } from '@/config/constants';
import type { MapStats } from '@/types/app.types';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';
const MAX_MATCHES_TO_ANALYZE = 1000; // Analisar até 1000 partidas

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('\n🗺️ [UPDATE-MAPS] Iniciando atualização de mapas');
  const startTime = Date.now();

  try {
    // 🔐 Autenticação
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
      console.log('❌ [UPDATE-MAPS] Não autorizado');
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

    console.log(`📊 [UPDATE-MAPS] Season: ${SEASONS[seasonId].name}`);
    console.log(`📊 [UPDATE-MAPS] Queue ID: ${queueId}`);

    const faceitService = getFaceitService(FACEIT_API_KEY);

    // ✅ Buscar partidas do hub
    console.log(`📦 [UPDATE-MAPS] Buscando partidas (max ${MAX_MATCHES_TO_ANALYZE})...`);
    
    const mapCounts: Record<string, number> = {};
    let totalMatches = 0;
    let offset = 0;
    const limit = 100;

    while (totalMatches < MAX_MATCHES_TO_ANALYZE) {
      try {
        const endpoint = `/hubs/${queueId}/matches?type=past&offset=${offset}&limit=${limit}`;
        const response: any = await faceitService['request'](endpoint);

        if (!response?.items || response.items.length === 0) {
          console.log(`   ✅ Não há mais partidas (offset ${offset})`);
          break;
        }

        // Contar mapas
        for (const match of response.items) {
          const mapName = match.voting?.map?.pick?.[0] || 'Unknown';
          mapCounts[mapName] = (mapCounts[mapName] || 0) + 1;
          totalMatches++;
        }

        console.log(`   📦 Processadas ${totalMatches} partidas...`);

        // Próxima página
        offset += limit;

        if (response.items.length < limit) {
          console.log(`   ✅ Última página alcançada`);
          break;
        }

        // Delay entre páginas
        await new Promise(resolve => setTimeout(resolve, 800));

      } catch (error) {
        console.error(`   ❌ Erro ao buscar partidas (offset ${offset}):`, error);
        break;
      }
    }

    console.log(`\n📊 [UPDATE-MAPS] Total de partidas analisadas: ${totalMatches}`);

    // ✅ Calcular estatísticas
    const sortedMaps = Object.entries(mapCounts).sort((a, b) => b[1] - a[1]);
    
    const mostPlayed = sortedMaps.length > 0 ? {
      map: sortedMaps[0][0],
      count: sortedMaps[0][1],
      percentage: parseFloat(((sortedMaps[0][1] / totalMatches) * 100).toFixed(1)),
    } : null;

    const leastPlayed = sortedMaps.length > 0 ? {
      map: sortedMaps[sortedMaps.length - 1][0],
      count: sortedMaps[sortedMaps.length - 1][1],
      percentage: parseFloat(((sortedMaps[sortedMaps.length - 1][1] / totalMatches) * 100).toFixed(1)),
    } : null;

    const mapStats: MapStats = {
      mostPlayed,
      leastPlayed,
      totalMatches,
      mapDistribution: mapCounts,
    };

    // ✅ Salvar no cache
    console.log(`💾 [UPDATE-MAPS] Salvando estatísticas no cache...`);
    await kvCacheService.saveMapStats(mapStats, seasonId);

    // Log dos resultados
    console.log(`\n📊 [UPDATE-MAPS] Estatísticas:`);
    if (mostPlayed) {
      console.log(`   🥇 Mais jogado: ${mostPlayed.map} (${mostPlayed.count}x - ${mostPlayed.percentage}%)`);
    }
    if (leastPlayed) {
      console.log(`   🥉 Menos jogado: ${leastPlayed.map} (${leastPlayed.count}x - ${leastPlayed.percentage}%)`);
    }
    console.log(`\n📊 [UPDATE-MAPS] Distribuição completa:`);
    sortedMaps.forEach(([map, count]) => {
      const percentage = ((count / totalMatches) * 100).toFixed(1);
      console.log(`   ${map}: ${count}x (${percentage}%)`);
    });

    const duration = Date.now() - startTime;
    console.log(`\n✅ [UPDATE-MAPS] Finalizado em ${(duration / 1000).toFixed(1)}s`);

    return NextResponse.json({
      success: true,
      seasonId,
      totalMatches,
      mapStats,
      duration: `${(duration / 1000).toFixed(1)}s`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ [UPDATE-MAPS] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos