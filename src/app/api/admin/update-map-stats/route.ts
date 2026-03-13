/**
 * Rota: /api/admin/update-map-stats
 * Fetches all matches (paginated) to compute map distribution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';
import { SEASONS, type SeasonId } from '@/config/constants';
import type { MapStats } from '@/types/app.types';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';

const MATCHES_PER_PAGE = 100;
const MAX_PAGES = 5; // Up to 500 matches

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🗺️ [UPDATE-MAP-STATS] Iniciando...');
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    if (!FACEIT_API_KEY) {
      return NextResponse.json({ success: false, error: 'FACEIT API Key não configurada' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';
    const queueId = SEASONS[seasonId].id;

    console.log(`   Season: ${SEASONS[seasonId].name} (${queueId})`);

    const faceitService = getFaceitService(FACEIT_API_KEY);

    console.log(`   Buscando partidas do hub (até ${MAX_PAGES * MATCHES_PER_PAGE} partidas)...`);
    
    const allMatches: any[] = [];
    
    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * MATCHES_PER_PAGE;
      
      try {
        const hubMatches: any = await faceitService['request'](
          `/hubs/${queueId}/matches?type=past&offset=${offset}&limit=${MATCHES_PER_PAGE}`
        );

        const pageMatches = hubMatches.items || [];
        console.log(`   Página ${page + 1}: ${pageMatches.length} partidas`);
        
        allMatches.push(...pageMatches);
        
        if (pageMatches.length < MATCHES_PER_PAGE) {
          console.log(`   ℹ️ Última página alcançada`);
          break;
        }
        
        if (page < MAX_PAGES - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`   ⚠️ Erro ao buscar página ${page + 1}:`, error);
        break;
      }
    }

    console.log(`   ✅ Total de ${allMatches.length} partidas encontradas`);

    if (allMatches.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhuma partida encontrada' }, { status: 404 });
    }

    // Calcular distribuição de mapas
    const mapCounts: Record<string, number> = {};

    for (const match of allMatches) {
      const mapName = match.voting?.map?.pick?.[0] || null;
      if (mapName && mapName.startsWith('de_')) {
        mapCounts[mapName] = (mapCounts[mapName] || 0) + 1;
      }
    }

    const totalMatches = Object.values(mapCounts).reduce((sum, n) => sum + n, 0);
    const sortedMaps = Object.entries(mapCounts).sort((a, b) => b[1] - a[1]);

    const mapStats: MapStats = {
      mostPlayed: sortedMaps.length > 0
        ? { map: sortedMaps[0][0], count: sortedMaps[0][1], percentage: parseFloat(((sortedMaps[0][1] / totalMatches) * 100).toFixed(1)) }
        : null,
      leastPlayed: sortedMaps.length > 0
        ? { map: sortedMaps[sortedMaps.length - 1][0], count: sortedMaps[sortedMaps.length - 1][1], percentage: parseFloat(((sortedMaps[sortedMaps.length - 1][1] / totalMatches) * 100).toFixed(1)) }
        : null,
      totalMatches,
      mapDistribution: mapCounts,
    };

    await kvCacheService.saveMapStats(mapStats, seasonId);

    const duration = Date.now() - startTime;
    console.log(`✅ [UPDATE-MAP-STATS] Concluído em ${(duration / 1000).toFixed(1)}s`);
    console.log(`   Total de partidas: ${totalMatches}`);

    return NextResponse.json({
      success: true,
      seasonId,
      totalMatches,
      pagesSearched: Math.min(MAX_PAGES, Math.ceil(allMatches.length / MATCHES_PER_PAGE)),
      matchesFound: allMatches.length,
      mapDistribution: mapCounts,
      mostPlayed: mapStats.mostPlayed,
      leastPlayed: mapStats.leastPlayed,
      duration: `${(duration / 1000).toFixed(1)}s`,
    });

  } catch (error) {
    console.error('❌ [UPDATE-MAP-STATS] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;