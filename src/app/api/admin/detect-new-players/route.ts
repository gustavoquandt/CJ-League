/**
 * Rota: /api/admin/detect-new-players
 * Detecta jogadores novos NA FILA que não estão no constants.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { PLAYER_NICKNAMES } from '@/config/constants';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';
const QUEUE_ID = process.env.NEXT_PUBLIC_COMPETITION_ID || 'f2dec63c-b3c1-4df6-8193-0b83fc6640ef';

interface QueuePlayer {
  user_id: string;
  nickname: string;
  skill_level: number;
  elo: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🔍 [DETECT] Iniciando detecção de novos jogadores na FILA...');

  try {
    // Autenticação
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
      console.log('❌ [DETECT] Não autorizado');
      return NextResponse.json({
        success: false,
        error: 'Não autorizado',
      }, { status: 401 });
    }

    if (!FACEIT_API_KEY) {
      console.log('❌ [DETECT] FACEIT_API_KEY não configurada');
      return NextResponse.json({
        success: false,
        error: 'FACEIT API Key não configurada',
      }, { status: 500 });
    }

    console.log(`📋 Queue ID: ${QUEUE_ID}`);
    console.log(`📝 Jogadores registrados no constants.ts: ${PLAYER_NICKNAMES.length}`);

    // Buscar TODOS os jogadores da FILA
    console.log('\n⚡ Buscando jogadores da fila...');
    
    const allQueuePlayers: string[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `https://open.faceit.com/data/v4/leaderboards/competitions/${QUEUE_ID}?offset=${offset}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${FACEIT_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ Erro ao buscar jogadores da fila: ${response.status}`);
        break;
      }

      const data = await response.json();
      const players: QueuePlayer[] = data.items || [];

      players.forEach((player) => {
        allQueuePlayers.push(player.nickname);
      });

      console.log(`   📊 Carregados: ${allQueuePlayers.length} jogadores da fila`);

      hasMore = players.length === limit;
      offset += limit;

      // Delay para evitar rate limit
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n✅ Total de jogadores na FILA: ${allQueuePlayers.length}`);

    // Comparar com PLAYER_NICKNAMES
    const newPlayers: string[] = [];
    const registeredSet = new Set(PLAYER_NICKNAMES.map(n => n.toLowerCase()));

    for (const player of allQueuePlayers) {
      if (!registeredSet.has(player.toLowerCase())) {
        newPlayers.push(player);
      }
    }

    if (newPlayers.length > 0) {
      console.log('\n🆕 NOVOS JOGADORES NA FILA:');
      console.log('━'.repeat(50));
      newPlayers.forEach((nickname, index) => {
        console.log(`${index + 1}. ${nickname}`);
      });
      console.log('━'.repeat(50));
      console.log('\n📝 ADICIONE AO constants.ts:');
      console.log('export const PLAYER_NICKNAMES = [');
      console.log('  // ... jogadores existentes ...');
      newPlayers.forEach(nickname => {
        console.log(`  '${nickname}',`);
      });
      console.log('];');
      console.log('');
    } else {
      console.log('\n✅ Nenhum jogador novo encontrado na fila');
    }

    return NextResponse.json({
      success: true,
      totalInQueue: allQueuePlayers.length,
      registeredPlayers: PLAYER_NICKNAMES.length,
      newPlayers,
      message: newPlayers.length > 0 
        ? `${newPlayers.length} novos jogadores encontrados na fila!`
        : 'Nenhum jogador novo encontrado na fila.',
    });

  } catch (error) {
    console.error('❌ [DETECT] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;