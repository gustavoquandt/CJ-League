/**
 * Rota: /api/admin/update-all
 * ENDPOINT UNIFICADO PARA CRON JOB
 * Atualiza TODOS os jogadores + mapas de uma season
 */

import { NextRequest, NextResponse } from 'next/server';
import { PLAYER_NICKNAMES, type SeasonId } from '@/config/constants';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('\n🚀 [UPDATE-ALL] Iniciando atualização completa');
  const startTime = Date.now();

  try {
    // 🔐 Autenticação
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
      console.log('❌ [UPDATE-ALL] Não autorizado');
      return NextResponse.json({
        success: false,
        error: 'Não autorizado',
      }, { status: 401 });
    }

    // 📋 Parâmetros
    const { searchParams } = new URL(request.url);
    const seasonId: SeasonId = (searchParams.get('season') as SeasonId) || 'SEASON_1';

    console.log(`📊 [UPDATE-ALL] Season: ${seasonId}`);
    console.log(`📊 [UPDATE-ALL] Total de jogadores: ${PLAYER_NICKNAMES.length}`);

    // ✅ FASE 1: Atualizar TODOS os jogadores
    console.log('\n📦 [FASE 1] Atualizando jogadores...');
    
    let existingPlayers: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < PLAYER_NICKNAMES.length; i++) {
      const batchNumber = i;
      const nickname = PLAYER_NICKNAMES[i];
      
      console.log(`\n📦 [${i + 1}/${PLAYER_NICKNAMES.length}] Processando ${nickname}...`);

      try {
        // Chamar batch-update para este jogador
        const response = await fetch(`${BASE_URL}/api/admin/batch-update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_SECRET}`,
          },
          body: JSON.stringify({
            batchNumber,
            existingPlayers,
            seasonId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.players) {
          existingPlayers = data.players;
          successCount++;
          console.log(`   ✅ ${nickname}: ${data.batch?.totalPlayers || 0} jogadores no ranking`);
        } else {
          errorCount++;
          console.log(`   ⚠️ ${nickname}: Sem sucesso na resposta`);
        }

      } catch (error) {
        errorCount++;
        console.error(`   ❌ ${nickname}: Erro -`, error instanceof Error ? error.message : 'Erro desconhecido');
      }

      // Delay entre jogadores (evitar sobrecarga)
      if (i < PLAYER_NICKNAMES.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
      }
    }

    console.log(`\n✅ [FASE 1] Jogadores concluídos: ${successCount}/${PLAYER_NICKNAMES.length}`);
    if (errorCount > 0) {
      console.log(`⚠️ [FASE 1] Erros: ${errorCount}`);
    }

    // ✅ FASE 2: Atualizar estatísticas de mapas
    console.log('\n🗺️ [FASE 2] Atualizando mapas...');
    
    let mapsUpdated = false;
    try {
      const mapsResponse = await fetch(`${BASE_URL}/api/admin/update-maps?season=${seasonId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ADMIN_SECRET}`,
        },
      });

      if (mapsResponse.ok) {
        const mapsData = await mapsResponse.json();
        mapsUpdated = mapsData.success;
        console.log(`✅ [FASE 2] Mapas atualizados: ${mapsData.totalMatches || 0} partidas analisadas`);
      } else {
        console.log(`⚠️ [FASE 2] Erro ao atualizar mapas: HTTP ${mapsResponse.status}`);
      }
    } catch (error) {
      console.error(`❌ [FASE 2] Erro ao atualizar mapas:`, error instanceof Error ? error.message : 'Erro desconhecido');
    }

    // 📊 Resultado final
    const duration = Date.now() - startTime;
    const durationMinutes = (duration / 1000 / 60).toFixed(1);

    console.log(`\n✅ [UPDATE-ALL] Finalizado em ${durationMinutes} minutos`);

    return NextResponse.json({
      success: true,
      seasonId,
      players: {
        total: PLAYER_NICKNAMES.length,
        success: successCount,
        errors: errorCount,
        finalCount: existingPlayers.length,
      },
      maps: {
        updated: mapsUpdated,
      },
      duration: `${durationMinutes}min`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ [UPDATE-ALL] Erro geral:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos