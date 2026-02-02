import { NextResponse } from 'next/server';
import { SEASONS } from '@/config/constants';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY || '';

export async function GET() {
  const queueId = SEASONS.SEASON_1.id;
  
  const url = `https://open.faceit.com/data/v4/hubs/${queueId}/matches?offset=0&limit=5`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${FACEIT_API_KEY}`,
      'Accept': 'application/json',
    },
  });

  const data = await response.json();
  
  return NextResponse.json({
    queueId,
    statusCode: response.status,
    itemsCount: data.items?.length || 0,
    firstMatch: data.items?.[0] || null,
    sampleMatches: data.items?.slice(0, 3).map((m: any) => ({
      match_id: m.match_id,
      status: m.status,
      voting: m.voting,
      game_mode: m.game_mode,
      map: m.voting?.map || m.game_mode || 'unknown',
    })) || [],
    raw: data,
  });
}

export const dynamic = 'force-dynamic';