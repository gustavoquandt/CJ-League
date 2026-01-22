/**
 * API Route: /api/faceit/check-new-matches
 * 
 * Verifica se há novos jogos desde a última atualização
 * Retorna: { hasNewMatches: boolean, playersWithNewMatches: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryCache } from '@/services/cache.service';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;

interface CheckNewMatchesResponse {
  success: boolean;
  hasNewMatches: boolean;
  playersWithNewMatches?: string[];
  totalNewMatches?: number;
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<CheckNewMatchesResponse>> {
  console.log('🔍 [CHECK] Verificando novos jogos...');

  try {
    if (!FACEIT_API_KEY) {
      return NextResponse.json({
        success: false,
        hasNewMatches: false,
        error: 'FACEIT_API_KEY não configurada',
      }, { status: 500 });
    }

    // 1. Pegar cache atual
    const cache = memoryCache.get();
    if (!cache || cache.players.length === 0) {
      console.log('⚠️ [CHECK] Cache vazio, atualização necessária');
      return NextResponse.json({
        success: true,
        hasNewMatches: true,
        playersWithNewMatches: [],
        totalNewMatches: 0,
      });
    }

    console.log(`📊 [CHECK] Cache tem ${cache.players.length} jogadores`);

    // 2. Verificar último jogo de cada jogador no cache
    const playersWithNewMatches: string[] = [];
    let totalNewMatches = 0;

    // Pegar apenas uma amostra de jogadores (primeiros 10) para verificação rápida
    const samplePlayers = cache.players.slice(0, 10);

    for (const player of samplePlayers) {
      try {
        // Buscar último jogo do jogador na API
        const response = await fetch(
          `https://open.faceit.com/data/v4/players/${player.playerId}/history?game=cs2&offset=0&limit=1`,
          {
            headers: {
              'Authorization': `Bearer ${FACEIT_API_KEY}`,
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) continue;

        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          const lastMatchId = data.items[0].match_id;
          
          // Comparar com último jogo no cache
          // (Assumindo que salvamos o lastMatchId no cache - vamos adicionar isso)
          if (player.lastMatchId && lastMatchId !== player.lastMatchId) {
            playersWithNewMatches.push(player.nickname);
            totalNewMatches++;
            console.log(`✨ [CHECK] Novo jogo encontrado: ${player.nickname}`);
          }
        }
      } catch (err) {
        console.error(`❌ [CHECK] Erro ao verificar ${player.nickname}:`, err);
        continue;
      }
    }

    const hasNewMatches = playersWithNewMatches.length > 0;

    console.log(
      hasNewMatches 
        ? `✅ [CHECK] ${totalNewMatches} novos jogos encontrados!`
        : `✅ [CHECK] Nenhum jogo novo encontrado`
    );

    return NextResponse.json({
      success: true,
      hasNewMatches,
      playersWithNewMatches,
      totalNewMatches,
    });

  } catch (error) {
    console.error('❌ [CHECK] Erro ao verificar novos jogos:', error);
    return NextResponse.json({
      success: false,
      hasNewMatches: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minuto