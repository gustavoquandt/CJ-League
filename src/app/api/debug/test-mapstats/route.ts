import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Chamar a rota de mapstats internamente
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.statscj.com';
    const response = await fetch(
      `${baseUrl}/api/faceit/map-stats?season=SEASON_1&force=true`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const data = await response.json();
    
    return NextResponse.json({
      statusCode: response.status,
      success: data.success,
      hasData: !!data.data,
      mostPlayed: data.data?.mostPlayed,
      leastPlayed: data.data?.leastPlayed,
      totalMatches: data.data?.totalMatches,
      mapDistribution: data.data?.mapDistribution,
      fromCache: data.fromCache,
      raw: data,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : null,
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';