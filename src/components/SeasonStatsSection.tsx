'use client';

import { useState } from 'react';
import { PlayerStats, MapStats } from '@/types/app.types';
import Image from 'next/image';
import MapStatsCards from './MapStatsCards';

interface SeasonStatsSectionProps {
  players: PlayerStats[];
  seasonName: string;
  mapStats: MapStats | null;
  isLoadingMapStats: boolean;
  minGamesFilter: number;
}

interface StatLeader {
  player: PlayerStats;
  value: number;
  label: string;
}

export default function SeasonStatsSection({
  players,
  seasonName,
  mapStats,
  isLoadingMapStats,
  minGamesFilter,
}: SeasonStatsSectionProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Filtrar jogadores pelo mínimo de jogos
  const activePlayers = players.filter(p => 
    p.matchesPlayed > 0 && p.matchesPlayed >= minGamesFilter
  );

  if (activePlayers.length === 0) {
    return null;
  }

  const getLeader = (stat: keyof PlayerStats): StatLeader | null => {
    if (activePlayers.length === 0) return null;
    
    const leader = [...activePlayers].sort((a, b) => {
      const aVal = Number(a[stat]) || 0;
      const bVal = Number(b[stat]) || 0;
      return bVal - aVal;
    })[0];

    return {
      player: leader,
      value: Number(leader[stat]) || 0,
      label: '',
    };
  };

  const kdLeader = getLeader('kd');
  const adrLeader = getLeader('adr');
  const hsLeader = getLeader('headshotPercentage');
  const streakLeader = getLeader('longestWinStreak');
  const pointsLeader = getLeader('rankingPoints');

  const stats = [
    {
      icon: '🎯',
      title: 'Maior K/D',
      leader: kdLeader,
      formatter: (val: number) => val.toFixed(2),
    },
    {
      icon: '📊',
      title: 'Maior ADR',
      leader: adrLeader,
      formatter: (val: number) => val.toFixed(1),
    },
    {
      icon: '🎯',
      title: 'Melhor HS%',
      leader: hsLeader,
      formatter: (val: number) => `${val.toFixed(1)}%`,
    },
    {
      icon: '🔥',
      title: 'Maior Win Streak',
      leader: streakLeader,
      formatter: (val: number) => `${val} vitórias`,
    },
    {
      icon: '⭐',
      title: 'Maior Pontuação Atingida',
      leader: pointsLeader,
      formatter: (val: number) => `${val} pts`,
    },
  ];

  return (
    <div className="mt-6 mb-8">
      {/* Header com botão de toggle */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
      >
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-faceit-orange">📈</span>
          Destaques - {seasonName}
        </h2>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-faceit-light-gray">
            {isVisible ? 'Ocultar' : 'Mostrar'}
          </span>
          <svg
            className={`w-6 h-6 text-faceit-orange transition-transform ${
              isVisible ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>
      
      {/* Conteúdo */}
      {isVisible && (
        <div className="space-y-4 animate-fadeIn">
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {stats.map((stat, index) => {
              if (!stat.leader) return null;

              return (
                <div
                  key={index}
                  className="bg-faceit-dark border border-faceit-light-gray rounded-lg p-4 hover:border-faceit-orange transition-all"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{stat.icon}</span>
                    <h3 className="text-sm font-semibold text-white">
                      {stat.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-faceit-orange flex-shrink-0">
                      <Image
                        src={stat.leader.player.avatar || '/default-avatar.png'}
                        alt={stat.leader.player.nickname}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">
                        {stat.leader.player.nickname}
                      </p>
                      <p className="text-2xl font-bold text-faceit-orange">
                        {stat.formatter(stat.leader.value)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mapas */}
          <div className="mt-6">
            <MapStatsCards
              mapStats={mapStats}
              isLoading={isLoadingMapStats}
              isVisible={true}
            />
            
            {/* Tag pequena ABAIXO dos mapas */}
            <div className="flex justify-center mt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-faceit-dark border border-faceit-light-gray/50 rounded-full">
                <span className="text-faceit-orange text-xs">ℹ️</span>
                <p className="text-xs text-faceit-light-gray">
                  Estatísticas referentes a toda a season (todas as partidas disputadas)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}