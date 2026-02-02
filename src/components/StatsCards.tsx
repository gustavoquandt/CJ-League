'use client';

import { useState } from 'react';
import { PlayerStats, MapStats } from '@/types/app.types';
import Image from 'next/image';

interface StatsCardsProps {
  players: PlayerStats[];
  seasonName: string;
  mapStats?: MapStats | null;
  minGamesFilter?: number;
  isVisible?: boolean;
}

interface StatLeader {
  player: PlayerStats;
  value: number;
  label: string;
}

const formatMapName = (mapName: string): string => {
  return mapName.replace('de_', '').replace('cs_', '').toUpperCase();
};

export default function StatsCards({ players, seasonName, mapStats, minGamesFilter = 0, isVisible = true }: StatsCardsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // ✅ Se não for visível, não renderizar nada
  if (!isVisible) {
    return null;
  }

  // ✅ Filtrar jogadores pelo mínimo de jogos
  const activePlayers = players.filter(p => 
    p.matchesPlayed > 0 && p.matchesPlayed >= minGamesFilter
  );

  if (activePlayers.length === 0 && !mapStats) {
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
    <div className="mb-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
      >
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-faceit-orange">📈</span>
          Destaques - {seasonName}
        </h2>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">
            {isExpanded ? 'Ocultar' : 'Mostrar'}
          </span>
          <svg
            className={`w-6 h-6 text-faceit-orange transition-transform ${
              isExpanded ? 'rotate-180' : ''
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
          {/* Legenda informativa */}
          <div className="bg-faceit-darker border border-faceit-light-gray/50 rounded-lg px-4 py-2">
            <p className="text-xs text-text-secondary text-center">
              ℹ️ Estatísticas referentes a toda a season (todas as partidas disputadas)
            </p>
          </div>
      </button>
      
      {isExpanded && (
        <div className="space-y-4 animate-fadeIn">
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
                    <h3 className="text-sm font-semibold text-text-secondary">
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

          {mapStats && (mapStats.mostPlayed || mapStats.leastPlayed) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mapStats.mostPlayed && (
                <div className="bg-faceit-dark border border-faceit-light-gray rounded-lg p-4 hover:border-faceit-orange transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🗺️</span>
                    <h3 className="text-sm font-semibold text-text-secondary">
                      Mapa Mais Jogado
                    </h3>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <p className="text-3xl font-bold text-faceit-orange">
                      {formatMapName(mapStats.mostPlayed.map)}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span>{mapStats.mostPlayed.count} partidas</span>
                      <span>•</span>
                      <span>{mapStats.mostPlayed.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {mapStats.leastPlayed && (
                <div className="bg-faceit-dark border border-faceit-light-gray rounded-lg p-4 hover:border-faceit-orange transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🗺️</span>
                    <h3 className="text-sm font-semibold text-text-secondary">
                      Mapa Menos Jogado
                    </h3>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <p className="text-3xl font-bold text-faceit-orange">
                      {formatMapName(mapStats.leastPlayed.map)}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span>{mapStats.leastPlayed.count} partidas</span>
                      <span>•</span>
                      <span>{mapStats.leastPlayed.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}