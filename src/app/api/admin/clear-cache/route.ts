import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { type SeasonId } from '@/config/constants';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function DELETE(request: NextRequest) {
  try {
    const seasonId = (request.nextUrl.searchParams.get('season') as SeasonId) || 'SEASON_1';
    const cacheKey = `cj-stats:players:${seasonId}`;
    
    console.log(`🗑️ Deletando cache da ${seasonId}: ${cacheKey}`);
    
    // Deletar do Redis
    await redis.del(cacheKey);
    
    console.log(`✅ Cache deletado com sucesso`);
    
    return NextResponse.json({
      success: true,
      message: `Cache da ${seasonId} deletado com sucesso`,
      key: cacheKey,
    });
  } catch (error) {
    console.error('❌ Erro ao deletar cache:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}