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
      label: 'Pontuação Histórica',
      icon: '🏆',
      leader: getPeakLeader(),
      getValue: (p: PlayerStats) => p.peakRankingPoints || p.rankingPoints,
      formatter: (val: number) => val.toString(),
    },
    {
      label: 'Maior K/D',
      icon: '⚔️',
      leader: getLeader('kd'),
      getValue: (p: PlayerStats) => p.kd,
      formatter: (val: number) => val.toFixed(2),
    },
    {
      label: 'Maior ADR',
      icon: '💥',
      leader: getLeader('adr'),
      getValue: (p: PlayerStats) => p.adr,
      formatter: (val: number) => val.toFixed(1),
    },
    {
      label: 'Maior Win Rate',
      icon: '🎯',
      leader: getLeader('winRate'),
      getValue: (p: PlayerStats) => p.winRate,
      formatter: (val: number) => `${val.toFixed(0)}%`,
    },
    {
      label: 'Mais Headshots',
      icon: '🎯',
      leader: getLeader('headshotPercentage'),
      getValue: (p: PlayerStats) => p.headshotPercentage,
      formatter: (val: number) => `${val.toFixed(1)}%`,
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
          <h2 className="text-lg lg:text-2xl font-bold flex items-center gap-2">
            <span className="text-[#e31e24]">📈</span>
            <span className="truncate">Destaques - {seasonName}</span>
          </h2>
          
          {/* Tag ao lado do título - esconde no mobile */}
          <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 bg-faceit-dark border border-faceit-light-gray/50 rounded-full">
            <span className="text-[#e31e24] text-xs">ℹ️</span>
            <p className="text-xs text-white whitespace-nowrap">
              Estatísticas referentes a toda a season
            </p>
          </div>
        </div>
        
        {/* Botão toggle - Desktop: texto + ícone | Mobile: apenas ícone com fundo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden lg:inline text-sm text-faceit-light-gray">
            {isVisible ? 'Ocultar' : 'Mostrar'}
          </span>
          
          {/* Mobile: ícone com fundo redondo */}
          <div className="lg:hidden w-10 h-10 flex items-center justify-center bg-[#e31e24]/20 rounded-full border border-[#e31e24]/30">
            <svg
              className={`w-5 h-5 text-[#e31e24] transition-transform ${
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
          
          {/* Desktop: apenas ícone sem fundo */}
          <svg
            className={`hidden lg:block w-6 h-6 text-[#e31e24] transition-transform ${
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
              
              const value = stat.getValue(stat.leader);
              
              return (
                <div key={index} className="card card-hover">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{stat.icon}</span>
                    <h3 className="text-white">{stat.label}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Avatar com fallback para inicial */}
                    {stat.leader.avatar ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#e31e24] flex-shrink-0">
                        <Image
                          src={stat.leader.avatar}
                          alt={stat.leader.nickname}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-faceit-light-gray border-2 border-[#e31e24] flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-white">
                          {stat.leader.nickname.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">
                        {stat.leader.nickname}
                      </p>
                      <p className="text-2xl font-bold text-[#e31e24]">
                        {stat.formatter(value)}
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
          </div>
        </div>
      )}
    </div>
  );
}