/**
 * API Route: /api/admin/player-management
 * 
 * Gerenciar jogadores e potes
 * VERSÃO CORRIGIDA + Gerenciamento de Potes
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

interface PlayerManagementResponse {
  success: boolean;
  players?: Array<{ nickname: string; pot: number }>;
  message?: string;
  error?: string;
}

// Caminho do arquivo constants.ts
const CONSTANTS_PATH = path.join(process.cwd(), 'src/config/constants.ts');

// Função para ler jogadores E potes do arquivo
async function readPlayersAndPotsFromFile(): Promise<Array<{ nickname: string; pot: number }>> {
  try {
    const fileContent = await fs.readFile(CONSTANTS_PATH, 'utf-8');
    
    console.log('📄 [DEBUG] Lendo arquivo constants.ts...');
    
    // Extrair PLAYER_NICKNAMES
    const nicknamesMatch = fileContent.match(/export const PLAYER_NICKNAMES\s*=\s*\[([\s\S]*?)\];/);
    if (!nicknamesMatch) {
      console.error('❌ [DEBUG] PLAYER_NICKNAMES não encontrado');
      throw new Error('PLAYER_NICKNAMES não encontrado');
    }

    const arrayContent = nicknamesMatch[1];
    const nicknames = arrayContent
      .split(',')
      .map(line => line.trim())
      .filter(line => line.startsWith("'") || line.startsWith('"'))
      .map(line => line.replace(/['"]/g, '').trim())
      .filter(Boolean);

    console.log(`✅ [DEBUG] ${nicknames.length} nicknames encontrados`);

    // Extrair PLAYER_POTS
    const potsMatch = fileContent.match(/export const PLAYER_POTS\s*:\s*Record<string,\s*number>\s*=\s*\{([\s\S]*?)\};/);
    
    let pots: Record<string, number> = {};
    
    if (potsMatch) {
      const potsContent = potsMatch[1];
      const potLines = potsContent.split(',').filter(line => line.includes(':'));
      
      potLines.forEach(line => {
        const match = line.match(/['"]([^'"]+)['"]\s*:\s*(\d+)/);
        if (match) {
          pots[match[1]] = parseInt(match[2]);
        }
      });
      
      console.log(`✅ [DEBUG] ${Object.keys(pots).length} potes encontrados`);
    } else {
      console.log('⚠️ [DEBUG] PLAYER_POTS não encontrado, usando pote 0 para todos');
    }

    // Combinar nicknames com potes
    const players = nicknames.map(nickname => ({
      nickname,
      pot: pots[nickname] || 0, // Pote 0 se não definido
    }));

    return players;
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao ler jogadores:', error);
    return [];
  }
}

// Função para salvar jogadores E potes no arquivo
async function savePlayersAndPotsToFile(players: Array<{ nickname: string; pot: number }>): Promise<void> {
  try {
    const fileContent = await fs.readFile(CONSTANTS_PATH, 'utf-8');
    
    // Criar array de nicknames
    const nicknames = players.map(p => p.nickname);
    const nicknamesArray = nicknames.map(n => `  '${n}'`).join(',\n');
    const newPlayerNicknames = `export const PLAYER_NICKNAMES = [\n${nicknamesArray},\n];`;
    
    // Criar objeto de potes (apenas jogadores com pote > 0)
    const potsEntries = players
      .filter(p => p.pot > 0)
      .map(p => `  '${p.nickname}': ${p.pot}`)
      .join(',\n');
    
    const newPlayerPots = `export const PLAYER_POTS: Record<string, number> = {\n${potsEntries},\n};`;
    
    // Substituir no arquivo
    let updatedContent = fileContent.replace(
      /export const PLAYER_NICKNAMES\s*=\s*\[[\s\S]*?\];/,
      newPlayerNicknames
    );
    
    updatedContent = updatedContent.replace(
      /export const PLAYER_POTS\s*:\s*Record<string,\s*number>\s*=\s*\{[\s\S]*?\};/,
      newPlayerPots
    );
    
    await fs.writeFile(CONSTANTS_PATH, updatedContent, 'utf-8');
    console.log('✅ [DEBUG] Arquivo salvo com sucesso');
  } catch (error) {
    console.error('❌ [DEBUG] Erro ao salvar jogadores:', error);
    throw error;
  }
}

// GET - Listar jogadores com potes
export async function GET(request: NextRequest): Promise<NextResponse<PlayerManagementResponse>> {
  console.log('📋 [ADMIN] Listando jogadores e potes...');

  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'Não autorizado',
      }, { status: 401 });
    }

    const players = await readPlayersAndPotsFromFile();
    
    console.log(`✅ [ADMIN] ${players.length} jogadores listados`);
    return NextResponse.json({
      success: true,
      players,
    });

  } catch (error) {
    console.error('❌ [ADMIN] Erro ao listar:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

// POST - Adicionar, remover ou atualizar pote
export async function POST(request: NextRequest): Promise<NextResponse<PlayerManagementResponse>> {
  console.log('✏️ [ADMIN] Modificando jogadores/potes...');

  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== ADMIN_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'Não autorizado',
      }, { status: 401 });
    }

    const body = await request.json();
    const { action, nickname, pot } = body;

    if (!action || !nickname) {
      return NextResponse.json({
        success: false,
        error: 'Ação e nickname são obrigatórios',
      }, { status: 400 });
    }

    // Ler jogadores atuais
    let players = await readPlayersAndPotsFromFile();

    if (action === 'add') {
      // Verificar se já existe
      if (players.some(p => p.nickname === nickname)) {
        return NextResponse.json({
          success: false,
          error: 'Jogador já existe',
        }, { status: 400 });
      }

      // Validar pote
      const potValue = pot || 0;
      if (potValue < 1 || potValue > 5) {
        return NextResponse.json({
          success: false,
          error: 'Pote deve ser entre 1 e 5',
        }, { status: 400 });
      }

      // Adicionar
      players.push({ nickname, pot: potValue });
      await savePlayersAndPotsToFile(players);
      
      console.log(`✅ [ADMIN] Jogador adicionado: ${nickname} (Pote ${potValue})`);
      return NextResponse.json({
        success: true,
        players,
        message: `Jogador "${nickname}" adicionado ao Pote ${potValue}!`,
      });

    } else if (action === 'remove') {
      // Verificar se existe
      if (!players.some(p => p.nickname === nickname)) {
        return NextResponse.json({
          success: false,
          error: 'Jogador não encontrado',
        }, { status: 404 });
      }

      // Remover
      players = players.filter(p => p.nickname !== nickname);
      await savePlayersAndPotsToFile(players);
      
      console.log(`✅ [ADMIN] Jogador removido: ${nickname}`);
      return NextResponse.json({
        success: true,
        players,
        message: `Jogador "${nickname}" removido com sucesso!`,
      });

    } else if (action === 'updatePot') {
      // Encontrar jogador
      const playerIndex = players.findIndex(p => p.nickname === nickname);
      
      if (playerIndex === -1) {
        return NextResponse.json({
          success: false,
          error: 'Jogador não encontrado',
        }, { status: 404 });
      }

      // Validar pote
      const potValue = pot || 0;
      if (potValue < 1 || potValue > 5) {
        return NextResponse.json({
          success: false,
          error: 'Pote deve ser entre 1 e 5',
        }, { status: 400 });
      }

      // Atualizar pote
      players[playerIndex].pot = potValue;
      await savePlayersAndPotsToFile(players);
      
      console.log(`✅ [ADMIN] Pote atualizado: ${nickname} → Pote ${potValue}`);
      return NextResponse.json({
        success: true,
        players,
        message: `Pote de "${nickname}" atualizado para ${potValue}!`,
      });

    } else {
      return NextResponse.json({
        success: false,
        error: 'Ação inválida. Use "add", "remove" ou "updatePot"',
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ [ADMIN] Erro ao modificar:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';