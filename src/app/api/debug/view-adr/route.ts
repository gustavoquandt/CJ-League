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
  
  // Pegar primeiro jogador
  const firstPlayer = players[0];
  
  return NextResponse.json({
    playerWithBug: playerWithHighADR ? {
      nickname: playerWithHighADR.nickname,
      adr: playerWithHighADR.adr,
      totalDamage: playerWithHighADR.totalDamage,
      totalRounds: playerWithHighADR.totalRounds,
      matchesPlayed: playerWithHighADR.matchesPlayed,
      calculatedADR: playerWithHighADR.totalRounds > 0 
        ? (playerWithHighADR.totalDamage / playerWithHighADR.totalRounds).toFixed(1)
        : 0,
    } : null,
    
    firstPlayer: {
      nickname: firstPlayer.nickname,
      adr: firstPlayer.adr,
      totalDamage: firstPlayer.totalDamage,
      totalRounds: firstPlayer.totalRounds,
      matchesPlayed: firstPlayer.matchesPlayed,
    },
    
    // Lista todos com ADR > 200
    playersWithHighADR: players
      .filter((p: any) => p.adr > 200)
      .map((p: any) => ({
        nickname: p.nickname,
        adr: p.adr,
        totalDamage: p.totalDamage,
        totalRounds: p.totalRounds,
      })),
  });
}

export const dynamic = 'force-dynamic';