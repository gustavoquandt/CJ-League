/**
 * Rota: /api/admin/detect-new-players
 * Detecta jogadores novos no hub que não estão no constants.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { PLAYER_NICKNAMES } from '@/config/constants';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default_admin_secret_change_me';
const HUB_ID = process.env.NEXT_PUBLIC_HUB_ID || '42393c93-5da0-4a6b-bcda-32de8d727658';

interface HubMember {
  user_id: string;
  nickname: string;
  avatar: string;
  country: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🔍 [DETECT] Iniciando detecção de novos jogadores...');

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

    console.log(`📋 Hub ID: ${HUB_ID}`);
    console.log(`📝 Jogadores registrados: ${PLAYER_NICKNAMES.length}`);

    // Buscar TODOS os membros do hub
    const allMembers: string[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `https://open.faceit.com/data/v4/hubs/${HUB_ID}/members?offset=${offset}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${FACEIT_API_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ Erro ao buscar membros: ${response.status}`);
        break;
      }

      const data = await response.json();
      const members: HubMember[] = data.items || [];

      members.forEach((member) => {
        allMembers.push(member.nickname);
      });

      console.log(`   📊 Carregados: ${allMembers.length} membros`);

      hasMore = members.length === limit;
      offset += limit;

      // Delay para evitar rate limit
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n✅ Total de membros no hub: ${allMembers.length}`);

    // Comparar com PLAYER_NICKNAMES
    const newPlayers: string[] = [];
    const registeredSet = new Set(PLAYER_NICKNAMES.map(n => n.toLowerCase()));

    for (const member of allMembers) {
      if (!registeredSet.has(member.toLowerCase())) {
        newPlayers.push(member);
      }
    }

    if (newPlayers.length > 0) {
      console.log('\n🆕 NOVOS JOGADORES ENCONTRADOS:');
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
      console.log('\n✅ Nenhum jogador novo encontrado');
    }

    return NextResponse.json({
      success: true,
      totalMembers: allMembers.length,
      registeredPlayers: PLAYER_NICKNAMES.length,
      newPlayers,
      message: newPlayers.length > 0 
        ? `${newPlayers.length} novos jogadores encontrados!`
        : 'Nenhum jogador novo encontrado.',
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
export const maxDuration = 60; // 1 minuto é suficiente