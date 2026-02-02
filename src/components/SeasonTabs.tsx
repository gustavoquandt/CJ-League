'use client';

import { SEASONS, type SeasonId } from '@/config/constants';

interface SeasonTabsProps {
  activeSeason: SeasonId;
  onSeasonChange: (season: SeasonId) => void;
}

export default function SeasonTabs({ activeSeason, onSeasonChange }: SeasonTabsProps) {
  const seasons = Object.entries(SEASONS) as [SeasonId, typeof SEASONS[SeasonId]][];

  return (
    <div className="mb-6">
      <div className="flex gap-2 border-b border-faceit-light-gray">
        {seasons.map(([key, season]) => (
          <button
            key={key}
            onClick={() => onSeasonChange(key)}
            className={`
              px-6 py-3 font-semibold transition-all relative
              ${activeSeason === key
                ? 'text-faceit-orange border-b-2 border-faceit-orange'
                : 'text-text-secondary hover:text-white'
              }
            `}
          >
            <div className="flex item s-center gap-2">
              <span>{season.name}</span>
              
              {season.status === 'active' && (
                <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                  Ativa
                </span>
              )}
              
              {season.status === 'finished' && (
                <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">
                  Finalizada
                </span>
              )}
            </div>
            
            {season.description && (
              <p className="text-xs text-text-secondary mt-0.5">
                {season.description}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}