/**
 * DETECTOR DE NOVOS JOGADORES
 * Busca membros do hub e compara com PLAYER_NICKNAMES
 */

import { PLAYER_NICKNAMES } from '@/config/constants';

const HUB_ID = process.env.NEXT_PUBLIC_HUB_ID || '42393c93-5da0-4a6b-bcda-32de8d727658';
const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const FACEIT_API_BASE = 'https://open.faceit.com/data/v4';

interface HubMember {
  user_id: string;
  nickname: string;
  avatar: string;
  country: string;
}

export async function detectNewPlayers(): Promise<{
  newPlayers: string[];
  totalMembers: number;
  registeredPlayers: number;
}> {
  console.log('\n🔍 DETECTANDO NOVOS JOGADORES...');
  console.log(`📋 Hub ID: ${HUB_ID}`);
  console.log(`📝 Jogadores registrados: ${PLAYER_NICKNAMES.length}`);
  
  try {
    const allMembers: string[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    // Buscar TODOS os membros do hub
    while (hasMore) {
      const response = await fetch(
        `${FACEIT_API_BASE}/hubs/${HUB_ID}/members?offset=${offset}&limit=${limit}`,
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

    return {
      newPlayers,
      totalMembers: allMembers.length,
      registeredPlayers: PLAYER_NICKNAMES.length,
    };

  } catch (error) {
    console.error('❌ Erro ao detectar novos jogadores:', error);
    return {
      newPlayers: [],
      totalMembers: 0,
      registeredPlayers: PLAYER_NICKNAMES.length,
    };
  }
}