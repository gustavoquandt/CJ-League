'use client';

import { SEASONS, type SeasonId } from '@/config/constants';
import { formatRelativeTime } from '@/utils/date.utils';

interface SeasonHeaderProps {
  activeSeason: SeasonId;
  onSeasonChange: (season: SeasonId) => void;
  lastUpdated: Date | null;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

export default function SeasonHeader({ 
  activeSeason, 
  onSeasonChange, 
  lastUpdated,
  onRefreshData,
  isRefreshing = false
}: SeasonHeaderProps) {
  const seasons = Object.entries(SEASONS) as [SeasonId, typeof SEASONS[SeasonId]][];

  return (
    <div className="mb-6">
      {/* Container flex: Tabs à esquerda + Update à direita */}
      <div className="flex items-end justify-between border-b border-faceit-light-gray">
        {/* Tabs */}
        <div className="flex gap-2">
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
              <div className="flex items-center gap-2">
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

        {/* Última atualização + Botão */}
        <div className="flex items-center gap-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-faceit-orange/20 rounded-lg">
              <svg className="w-4 h-4 text-faceit-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Última vez atualizado em</p>
              <p className="text-sm font-semibold text-white">
                {lastUpdated ? formatRelativeTime(lastUpdated) : 'Nunca'}
              </p>
            </div>
          </div>
          
          {/* Botão Atualizar */}
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 bg-faceit-orange hover:bg-faceit-orange/80 
                         disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg 
                         transition-colors text-xs font-semibold"
              title="Buscar dados mais recentes"
            >
              {isRefreshing ? (
                <>
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Atualizando...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Atualizar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}