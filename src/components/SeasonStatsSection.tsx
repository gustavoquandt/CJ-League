'use client';

import { useState } from 'react';
import { PlayerStats, MapStats } from '@/types/app.types';
import StatsCards from './StatsCards';
import MapStatsCards from './MapStatsCards';

interface SeasonStatsSectionProps {
  players: PlayerStats[];
  seasonName: string;
  mapStats: MapStats | null;
  isLoadingMapStats: boolean;
  minGamesFilter: number;
}

export default function SeasonStatsSection({
  players,
  seasonName,
  mapStats,
  isLoadingMapStats,
  minGamesFilter,
}: SeasonStatsSectionProps) {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className="mt-6">
      {/* Header com título e botão de ocultar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">
          📈 Destaques - {seasonName}
        </h2>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-sm text-faceit-light-gray hover:text-white transition-colors flex items-center gap-2"
        >
          <span>{isVisible ? '👁️' : '👁️‍🗨️'}</span>
          <span>{isVisible ? 'Ocultar' : 'Mostrar'}</span>
        </button>
      </div>

      {/* Conteúdo */}
      {isVisible && (
        <>
          {/* Cards de estatísticas (K/D, ADR, HS%) */}
          {players.length > 0 && (
            <div className="mb-6">
              <StatsCards
                players={players}
                seasonName={seasonName}
                mapStats={null}
                minGamesFilter={minGamesFilter}
                isVisible={true}
              />
            </div>
          )}

          {/* Alert sobre estatísticas */}
          <div className="mb-6 card bg-faceit-dark border border-faceit-light-gray p-4">
            <p className="text-sm text-faceit-light-gray flex items-start gap-2">
              <span className="text-faceit-orange">ℹ️</span>
              <span>
                Estatísticas referentes a toda a season (todas as partidas disputadas)
              </span>
            </p>
          </div>

          {/* Mapas */}
          <MapStatsCards
            mapStats={mapStats}
            isLoading={isLoadingMapStats}
            isVisible={true}
          />
        </>
      )}
    </div>
  );
}