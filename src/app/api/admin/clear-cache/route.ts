import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { type SeasonId } from '@/config/constants';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ✅ Aceitar GET para facilitar uso via browser
export async function GET(request: NextRequest) {
  return handleClearCache(request);
}

// ✅ Aceitar DELETE para API REST
export async function DELETE(request: NextRequest) {
  return handleClearCache(request);
}

async function handleClearCache(request: NextRequest) {
  try {
    const seasonId = (request.nextUrl.searchParams.get('season') as SeasonId) || 'SEASON_1';
    const confirm = request.nextUrl.searchParams.get('confirm');
    
    // ✅ Segurança: Requer confirmação
    if (confirm !== 'yes') {
      return NextResponse.json({
        success: false,
        message: 'Por favor, adicione ?confirm=yes para confirmar a exclusão',
        example: `/api/admin/clear-cache?season=${seasonId}&confirm=yes`,
      }, { status: 400 });
    }
    
    const cacheKey = `cj-stats:players:${seasonId}`;
    
    console.log(`🗑️ Deletando cache da ${seasonId}: ${cacheKey}`);
    
    // Deletar do Redis
    const deleted = await redis.del(cacheKey);
    
    console.log(`✅ Cache deletado com sucesso (${deleted} chaves)`);
    
    return NextResponse.json({
      success: true,
      message: `Cache da ${seasonId} deletado com sucesso!`,
      key: cacheKey,
      deleted: deleted,
      nextStep: 'Agora vá ao Admin Panel e clique em "Atualizar Players Season 1"',
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