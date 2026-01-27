/**
 * Rota: /api/admin/compare-queue-redis
 * Lista jogadores da FILA e compara com o REDIS
 */

import { NextRequest, NextResponse } from 'next/server';
import { kvCacheService } from '@/services/kv-cache.service';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';
const QUEUE_ID = process.env.NEXT_PUBLIC_COMPETITION_ID || 'f2dec63c-b3c1-4df6-8193-0b83fc6640ef';

interface QueuePlayer {
  player_id: string;
  nickname: string;
  position: number;
  points: number;
  played: number;
  wins: number;
  losses: number;
}

interface ComparisonResult {
  nickname: string;
  position: number;
  inQueue: boolean;
  inRedis: boolean;
  status: 'missing' | 'present' | 'extra';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🔍 [COMPARE] Comparando fila com Redis...');

  try {
    // Autenticação
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
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

    // 1. Buscar jogadores da FILA
    console.log('📋 Buscando jogadores da fila...');
    const queuePlayers: QueuePlayer[] = [];
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
        console.error(`❌ Erro: ${response.status}`);
        break;
      }

      const data = await response.json();
      const players = data.items || [];

      players.forEach((player: any) => {
        queuePlayers.push({
          player_id: player.player_id,
          nickname: player.nickname,
          position: player.position,
          points: player.points || 0,
          played: player.played || 0,
          wins: player.wins || 0,
          losses: player.losses || 0,
        });
      });

      hasMore = players.length === limit;
      offset += limit;

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Fila: ${queuePlayers.length} jogadores`);

    // 2. Buscar jogadores do REDIS
    console.log('💾 Buscando jogadores do Redis...');
    const cached = await kvCacheService.getCache();
    const redisPlayers = cached?.players || [];
    
    console.log(`✅ Redis: ${redisPlayers.length} jogadores`);

    // 3. Criar Sets para comparação (case-insensitive)
    const queueNicknames = new Set(queuePlayers.map(p => p.nickname.toLowerCase()));
    const redisNicknames = new Set(redisPlayers.map((p: any) => p.nickname.toLowerCase()));

    // 4. Comparar
    const comparison: ComparisonResult[] = [];
    const missing: string[] = [];
    const extra: string[] = [];

    // Jogadores na FILA
    queuePlayers.forEach(player => {
      const isInRedis = redisNicknames.has(player.nickname.toLowerCase());
      
      comparison.push({
        nickname: player.nickname,
        position: player.position,
        inQueue: true,
        inRedis: isInRedis,
        status: isInRedis ? 'present' : 'missing',
      });

      if (!isInRedis) {
        missing.push(player.nickname);
      }
    });

    // Jogadores no REDIS mas não na FILA
    redisPlayers.forEach((player: any) => {
      if (!queueNicknames.has(player.nickname.toLowerCase())) {
        comparison.push({
          nickname: player.nickname,
          position: 0,
          inQueue: false,
          inRedis: true,
          status: 'extra',
        });
        extra.push(player.nickname);
      }
    });

    console.log(`\n📊 RESULTADO:`);
    console.log(`   Total na fila: ${queuePlayers.length}`);
    console.log(`   Total no Redis: ${redisPlayers.length}`);
    console.log(`   Faltando no Redis: ${missing.length}`);
    console.log(`   Extras no Redis: ${extra.length}`);

    if (missing.length > 0) {
      console.log(`\n⚠️ FALTANDO NO REDIS (estão na fila):`);
      missing.forEach(nick => console.log(`   - ${nick}`));
    }

    if (extra.length > 0) {
      console.log(`\n⚠️ EXTRAS NO REDIS (não estão na fila):`);
      extra.forEach(nick => console.log(`   - ${nick}`));
    }

    return NextResponse.json({
      success: true,
      totalInQueue: queuePlayers.length,
      totalInRedis: redisPlayers.length,
      missing,
      extra,
      comparison: comparison.sort((a, b) => {
        if (a.status === 'missing' && b.status !== 'missing') return -1;
        if (a.status !== 'missing' && b.status === 'missing') return 1;
        return a.position - b.position;
      }),
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;