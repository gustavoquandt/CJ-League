/**
 * Rota: /api/cron/webhook
 * Webhook simples que processa 1 jogador por chamada
 * Para usar com cron-job.org (timeout 30s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PLAYER_NICKNAMES } from '@/config/constants';
import { getFaceitService } from '@/services/faceit.service';
import { kvCacheService } from '@/services/kv-cache.service';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Autenticação
    const urlSecret = request.nextUrl.searchParams.get('secret');
    
    if (CRON_SECRET && urlSecret !== CRON_SECRET) {
      return NextResponse.json({ 
        success: false, 
        error: 'Não autorizado' 
      }, { status: 401 });
    }

    if (!FACEIT_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'FACEIT_API_KEY não configurada' 
      }, { status: 500 });
    }

    // Pegar índice (default 0)
    const playerIndex = parseInt(request.nextUrl.searchParams.get('index') || '0');
    const totalPlayers = PLAYER_NICKNAMES.length;

    // Validar índice
    if (playerIndex < 0 || playerIndex >= totalPlayers) {
      return NextResponse.json({
        success: false,
        error: `Índice inválido. Deve ser entre 0 e ${totalPlayers - 1}`,
      }, { status: 400 });
    }

    const playerNickname = PLAYER_NICKNAMES[playerIndex];
    console.log(`[CRON] Processando [${playerIndex + 1}/${totalPlayers}] ${playerNickname}`);

    // Buscar dados atuais do Redis
    const cached = await kvCacheService.getCache();
    let allPlayers = cached?.players || [];

    // Processar este jogador
    const faceitService = getFaceitService(FACEIT_API_KEY);
    const newPlayers = await faceitService.fetchPlayersBatch([playerNickname]);

    if (newPlayers.length > 0) {
      const newPlayer = newPlayers[0];
      
      // Atualizar ou adicionar
      const existingIndex = allPlayers.findIndex(
        (p: any) => p.nickname.toLowerCase() === newPlayer.nickname.toLowerCase()
      );

      if (existingIndex >= 0) {
        allPlayers[existingIndex] = newPlayer;
      } else {
        allPlayers.push(newPlayer);
      }

      // Ordenar por ranking
      allPlayers.sort((a: any, b: any) => {
        if (a.rankingPoints !== b.rankingPoints) return b.rankingPoints - a.rankingPoints;
        if (a.wins !== b.wins) return b.wins - a.wins;
        return b.matchesPlayed - a.matchesPlayed;
      });

      // Atualizar posições
      allPlayers.forEach((player: any, index: number) => {
        player.position = index + 1;
      });

      // Salvar no Redis
      await kvCacheService.saveCache(allPlayers);
      console.log(`[CRON] ✅ ${playerNickname} atualizado e salvo`);
    } else {
      console.log(`[CRON] ⚠️ Nenhum dado para ${playerNickname}`);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      player: {
        index: playerIndex,
        nickname: playerNickname,
        total: totalPlayers,
      },
      stats: {
        duration,
        totalInRedis: allPlayers.length,
      },
    });

  } catch (error) {
    console.error('[CRON] Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;