'use client';

import { SEASONS, type SeasonId } from '@/config/constants';
import { formatRelativeTime } from '@/utils/date.utils';

interface SeasonHeaderProps {
  activeSeason: SeasonId;
  onSeasonChange: (season: SeasonId) => void;
  lastUpdated: Date | null;
  lastChecked?: Date | null;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

export default function SeasonHeader({
  activeSeason,
  onSeasonChange,
  lastUpdated,
  lastChecked,
  onRefreshData,
  isRefreshing = false,
}: SeasonHeaderProps) {
  const seasons = Object.entries(SEASONS) as [SeasonId, typeof SEASONS[SeasonId]][];

  return (
    <div className="mb-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between border-b border-faceit-light-gray gap-4 lg:gap-0">

        {/* Tabs de Season */}
        <div className="flex gap-2 overflow-x-auto pb-3 lg:pb-0">
          {seasons.map(([key, season]) => (
            <button
              key={key}
              onClick={() => onSeasonChange(key)}
              className={`
                px-4 lg:px-6 py-3 font-semibold transition-all relative whitespace-nowrap
                ${activeSeason === key
                  ? 'text-[#e31e24] border-b-2 border-[#e31e24]'
                  : 'text-text-secondary hover:text-white'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm lg:text-base">{season.name}</span>
                {season.status === 'active' && (
                  <span className="px-2 py-0.5 text-xs bg-[#10B981]/20 text-[#10B981] rounded-full border border-[#10B981]/30">
                    Ativa
                  </span>
                )}
                {season.status === 'finished' && (
                  <span className="hidden lg:inline-flex px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded-full border border-gray-500/30">
                    Finalizada
                  </span>
                )}
              </div>
              {season.description && (
                <p className="hidden lg:block text-xs text-text-secondary mt-0.5">
                  {season.description}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Info de atualização + Botão — inline */}
        <div className="flex items-stretch gap-3 pb-3">

          {/* Dados compactos */}
          <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-[rgba(26,31,110,0.2)] border border-[rgba(37,43,138,0.35)]">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#0EA5E9] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div>
                <p className="text-[10px] text-text-muted leading-tight">Atualizado</p>
                <p className="text-xs font-semibold text-white leading-tight">
                  {lastUpdated ? formatRelativeTime(lastUpdated) : 'Nunca'}
                </p>
              </div>
            </div>

            {lastChecked && (
              <>
                <div className="w-px h-7 bg-[#2D2D3D]" />
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#7b84ff] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <div>
                    <p className="text-[10px] text-text-muted leading-tight">Verificação</p>
                    <p className="text-xs font-semibold text-white leading-tight">
                      {formatRelativeTime(lastChecked)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Botão Atualizar */}
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7]
                         disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg
                         transition-colors text-xs font-semibold whitespace-nowrap"
              title="Buscar dados mais recentes"
            >
              {isRefreshing ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Atualizando...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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