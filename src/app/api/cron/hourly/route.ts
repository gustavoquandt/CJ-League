/**
 * API Route: /api/cron/hourly
 * 
 * Cron job que roda a cada 1h
 * 1. Verifica se há novos jogos
 * 2. Se SIM: atualiza tudo
 * 3. Se NÃO: não faz nada
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFaceitService } from '@/services/faceit.service';
import { saveCacheEverywhere } from '@/services/cache.service';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

interface CronResponse {
  success: boolean;
  message: string;
  stats?: {
    checked: boolean;
    hadNewMatches: boolean;
    updated: boolean;
    totalPlayers?: number;
    duration?: number;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<CronResponse>> {
  const startTime = Date.now();
  console.log('⏰ [CRON] Iniciando verificação horária...');

  try {
    // 1. Verificar autenticação do cron
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    // Vercel cron usa header específico também
    const vercelCronHeader = request.headers.get('x-vercel-cron');

    if (!CRON_SECRET && !vercelCronHeader) {
      console.log('⚠️ [CRON] Execução local permitida (sem CRON_SECRET)');
    } else if (providedSecret !== CRON_SECRET && !vercelCronHeader) {
      console.log('❌ [CRON] Autenticação falhou');
      return NextResponse.json({
        success: false,
        message: 'Não autorizado',
      }, { status: 401 });
    }

    if (!FACEIT_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'FACEIT_API_KEY não configurada',
      }, { status: 500 });
    }

    // 2. Verificar novos jogos
    console.log('🔍 [CRON] Verificando novos jogos...');
    
    const checkResponse = await fetch(
      `${request.nextUrl.origin}/api/faceit/check-new-matches`,
      {
        headers: {
          'Authorization': `Bearer ${FACEIT_API_KEY}`,
        },
      }
    );

    if (!checkResponse.ok) {
      throw new Error('Erro ao verificar novos jogos');
    }

    const checkData = await checkResponse.json();

    // 3. Se NÃO há novos jogos, retornar sem fazer nada
    if (!checkData.hasNewMatches) {
      const duration = Date.now() - startTime;
      console.log(`✅ [CRON] Nenhum jogo novo. Nada a fazer. (${duration}ms)`);
      
      return NextResponse.json({
        success: true,
        message: 'Nenhum jogo novo encontrado',
        stats: {
          checked: true,
          hadNewMatches: false,
          updated: false,
          duration,
        },
      });
    }

    // 4. Se TEM novos jogos, atualizar TUDO
    console.log(`🎮 [CRON] ${checkData.totalNewMatches} novos jogos encontrados!`);
    console.log(`👥 [CRON] Jogadores: ${checkData.playersWithNewMatches.join(', ')}`);
    console.log('🔄 [CRON] Iniciando atualização completa...');

    const faceitService = getFaceitService(FACEIT_API_KEY);
    
    const players = await faceitService.fetchAllPlayersStats((progress) => {
      if (progress.current % 10 === 0 || progress.current === progress.total) {
        console.log(
          `📊 [CRON] Progresso: ${progress.current}/${progress.total} (${progress.percentage}%)`
        );
      }
    });

    if (players.length === 0) {
      throw new Error('Nenhum jogador retornado');
    }

    // 5. Salvar cache
    saveCacheEverywhere(players, () => {});

    const duration = Date.now() - startTime;
    console.log(`✅ [CRON] Atualização completa em ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 [CRON] ${players.length} jogadores atualizados`);

    return NextResponse.json({
      success: true,
      message: 'Atualização completa realizada',
      stats: {
        checked: true,
        hadNewMatches: true,
        updated: true,
        totalPlayers: players.length,
        duration,
      },
    });

  } catch (error) {
    console.error('❌ [CRON] Erro:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos