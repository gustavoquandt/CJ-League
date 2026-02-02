'use client';

import { PlayerStats } from '@/types/app.types';

interface StatsCardsProps {
  players: PlayerStats[];
  seasonName: string;
  mapStats?: any;
  minGamesFilter?: number;
  isVisible?: boolean;
}

interface StatLeader {
  player: PlayerStats;
  value: number;
  label: string;
}

export default function StatsCards({ 
  players, 
  seasonName, 
  minGamesFilter = 0, 
  isVisible = true 
}: StatsCardsProps) {
  // Se não for visível, não renderizar
  if (!isVisible) {
    return null;
  }

  // Filtrar jogadores com partidas mínimas
  const eligiblePlayers = players.filter(p => p.matchesPlayed >= minGamesFilter);

  if (eligiblePlayers.length === 0) {
    return null;
  }

  // Encontrar líderes
  const kdLeader = eligiblePlayers.reduce((max, p) => 
    p.kd > max.kd ? p : max
  );

  const adrLeader = eligiblePlayers.reduce((max, p) => 
    p.adr > max.adr ? p : max
  );

  const hsLeader = eligiblePlayers.reduce((max, p) => 
    p.headshotPercentage > max.headshotPercentage ? p : max
  );

  const leaders: StatLeader[] = [
    {
      player: kdLeader,
      value: kdLeader.kd,
      label: 'Maior K/D',
    },
    {
      player: adrLeader,
      value: adrLeader.adr,
      label: 'Maior ADR',
    },
    {
      player: hsLeader,
      value: hsLeader.headshotPercentage,
      label: 'Melhor HS%',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {leaders.map((leader, index) => (
        <div
          key={index}
          className="card bg-faceit-dark border border-faceit-light-gray hover:border-faceit-orange transition-all p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-faceit-light-gray font-medium">
              {leader.label}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-bold text-white mb-1">
                {leader.player.nickname}
              </p>
              <p className="text-3xl font-bold text-faceit-orange">
                {leader.value.toFixed(leader.label.includes('HS') ? 1 : 2)}
                {leader.label.includes('HS') && '%'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}