import { NextResponse } from 'next/server';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY || '';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId') || '1-70abb00b-419e-4e61-98f1-d871a1902ec5';
  
  try {
    const response = await fetch(
      `https://open.faceit.com/data/v4/matches/${matchId}/stats`,
      {
        headers: {
          'Authorization': `Bearer ${FACEIT_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    const data = await response.json();
    
    return NextResponse.json({
      matchId,
      hasRounds: !!data.rounds,
      roundsCount: data.rounds?.length || 0,
      roundsIsArray: Array.isArray(data.rounds),
      firstRound: data.rounds?.[0] || null,
      rawData: data,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';