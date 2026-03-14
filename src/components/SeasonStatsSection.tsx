'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { PlayerStats } from '@/types/app.types';
import MapStatsCards from './MapStatsCards';
import type { MapStats } from '@/types/app.types';

interface SeasonStatsSectionProps {
  players: PlayerStats[];
  seasonName: string;
  mapStats?: MapStats | null;
  isLoadingMapStats?: boolean;
  minGamesFilter?: number;
}

export default function SeasonStatsSection({ 
  players,
  seasonName,
  mapStats = null,
  isLoadingMapStats = false,
  minGamesFilter = 0,
}: SeasonStatsSectionProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Filtrar jogadores com partidas mínimas
  const filteredPlayers = players.filter(
    player => player.matchesPlayed >= minGamesFilter
  );

  // Calcular líderes de cada estatística
  const getLeader = (stat: keyof PlayerStats) => {
    return filteredPlayers.reduce((max, p) => {
      const pValue = p[stat] as number;
      const maxValue = max[stat] as number;
      return pValue > maxValue ? p : max;
    }, filteredPlayers[0]);
  };

  // Líder de pontuação usa peakRankingPoints (ou rankingPoints como fallback)
  const getPeakLeader = () => {
    return filteredPlayers.reduce((max, p) => {
      const pValue = p.peakRankingPoints || p.rankingPoints;
      const maxValue = max.peakRankingPoints || max.rankingPoints;
      return pValue > maxValue ? p : max;
    }, filteredPlayers[0]);
  };

  // Definir estatísticas com líderes
  const stats = [
    {
      label: 'Pontuacao Historica',
      leader: getPeakLeader(),
      getValue: (p: PlayerStats) => p.peakRankingPoints || p.rankingPoints,
      formatter: (val: number) => val.toString(),
    },
    {
      label: 'Maior K/D',
      leader: getLeader('kd'),
      getValue: (p: PlayerStats) => p.kd,
      formatter: (val: number) => val.toFixed(2),
    },
    {
      label: 'Maior ADR',
      leader: getLeader('adr'),
      getValue: (p: PlayerStats) => p.adr,
      formatter: (val: number) => val.toFixed(1),
    },
    {
      label: 'Maior Win Rate',
      leader: getLeader('winRate'),
      getValue: (p: PlayerStats) => p.winRate,
      formatter: (val: number) => `${val.toFixed(0)}%`,
    },
    {
      label: 'Mais Headshots',
      leader: getLeader('headshotPercentage'),
      getValue: (p: PlayerStats) => p.headshotPercentage,
      formatter: (val: number) => `${val.toFixed(1)}%`,
    },
    {
      label: 'Melhor Entry',
      leader: (() => {
        const eligible = filteredPlayers.filter(p => (p.totalFirstKills || 0) + (p.totalFirstDeaths || 0) > 0);
        if (eligible.length === 0) return filteredPlayers[0];
        return eligible.reduce((max, p) => {
          const pRate = (p.totalFirstKills || 0) / ((p.totalFirstKills || 0) + (p.totalFirstDeaths || 0)) * 100;
          const maxRate = (max.totalFirstKills || 0) / ((max.totalFirstKills || 0) + (max.totalFirstDeaths || 0)) * 100;
          return pRate > maxRate ? p : max;
        }, eligible[0]);
      })(),
      getValue: (p: PlayerStats) => {
        const total = (p.totalFirstKills || 0) + (p.totalFirstDeaths || 0);
        return total > 0 ? (p.totalFirstKills || 0) / total * 100 : 0;
      },
      formatter: (val: number) => `${val.toFixed(1)}%`,
    },
    {
      label: 'Flash Assists/Jogo',
      leader: (() => {
        const eligible = filteredPlayers.filter(p => p.matchesPlayed > 0 && (p.totalFlashSuccesses || 0) > 0);
        if (eligible.length === 0) return filteredPlayers[0];
        return eligible.reduce((max, p) => {
          const pRate = (p.totalFlashSuccesses || 0) / p.matchesPlayed;
          const maxRate = (max.totalFlashSuccesses || 0) / max.matchesPlayed;
          return pRate > maxRate ? p : max;
        }, eligible[0]);
      })(),
      getValue: (p: PlayerStats) => p.matchesPlayed > 0 ? (p.totalFlashSuccesses || 0) / p.matchesPlayed : 0,
      formatter: (val: number) => val.toFixed(1),
    },
  ];

  return (
    <div className="mt-6 mb-8">
      {/* Header com botão de toggle */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity gap-2"
      >
        <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
          <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">
            Destaques - {seasonName}
          </h2>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <svg
            className={`w-4 h-4 text-[#9CA3AF] transition-transform ${
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {stats.map((stat, index) => {
              if (!stat.leader) return null;

              const value = stat.getValue(stat.leader);

              return (
                <div key={index} className="bg-[#13131A] rounded-xl p-4 flex flex-col items-center gap-2">
                  <span className="text-[10px] text-[#6B7280] uppercase tracking-wider text-center">{stat.label}</span>

                  {stat.leader.avatar ? (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#0EA5E9] flex-shrink-0">
                      <Image
                        src={stat.leader.avatar}
                        alt={stat.leader.nickname}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#1F1F2E] border-2 border-[#0EA5E9] flex items-center justify-center flex-shrink-0">
                      <span className="text-base font-bold text-[#0EA5E9]">
                        {stat.leader.nickname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <p className="text-xs font-medium text-white truncate max-w-full">{stat.leader.nickname}</p>
                  <span className="text-2xl font-bold text-[#0EA5E9] leading-none">{stat.formatter(value)}</span>
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
          </div>
        </div>
      )}
    </div>
  );
}