import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET() {
  const data = await redis.get('cj-stats:players:SEASON_1');
  
  if (!data) {
    return NextResponse.json({ error: 'No data' });
  }

  const players = (data as any).players || [];
  
  // Pegar jogador com ADR alto
  const playerWithHighADR = players.find((p: any) => p.adr > 200);
  
  return NextResponse.json({
    playerWithBug: playerWithHighADR ? {
      nickname: playerWithHighADR.nickname,
      adr: playerWithHighADR.adr,
      totalDamage: playerWithHighADR.totalDamage,
      totalRounds: playerWithHighADR.totalRounds,
      totalKills: playerWithHighADR.totalKills,
      totalDeaths: playerWithHighADR.totalDeaths,
      matchesPlayed: playerWithHighADR.matchesPlayed,
      kills: playerWithHighADR.kills,
      deaths: playerWithHighADR.deaths,
      
      // Verificar se os campos existem
      hasFields: {
        totalDamage: 'totalDamage' in playerWithHighADR,
        totalRounds: 'totalRounds' in playerWithHighADR,
        totalKills: 'totalKills' in playerWithHighADR,
        totalDeaths: 'totalDeaths' in playerWithHighADR,
      },
      
      // Cálculos
      calculatedADR: playerWithHighADR.totalRounds > 0 
        ? (playerWithHighADR.totalDamage / playerWithHighADR.totalRounds).toFixed(1)
        : 'totalRounds é 0 ou null',
      
      calculatedKD: playerWithHighADR.totalDeaths > 0
        ? (playerWithHighADR.totalKills / playerWithHighADR.totalDeaths).toFixed(2)
        : 'totalDeaths é 0 ou null',
    } : null,
    
    // Pegar todos os campos do primeiro jogador
    firstPlayerAllFields: players[0],
  });
}

export const dynamic = 'force-dynamic';