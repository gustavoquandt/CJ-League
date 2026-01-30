'use client';

import type { PlayerFilters, SortOption } from '@/types/app.types';
import { POT_CONFIG } from '@/config/constants';
import { formatDateTime, formatRelativeTime } from '@/utils/date.utils';
import UpdateBadge from '@/components/UpdateBadge';

interface StatsHeaderProps {
  filters: PlayerFilters;
  onFiltersChange: (filters: PlayerFilters) => void;
  totalPlayers: number;
  lastUpdated: Date | null;
  nextUpdate: Date | null;
  isUpdating?: boolean;
  updateProgress?: number;
  onRefreshData?: () => void; // ✅ NOVO
  isRefreshing?: boolean; // ✅ NOVO
}

export default function StatsHeader({
  filters,
  onFiltersChange,
  totalPlayers,
  lastUpdated,
  nextUpdate,
  isUpdating = false,
  updateProgress = 0,
  onRefreshData, // ✅ NOVO
  isRefreshing = false, // ✅ NOVO
}: StatsHeaderProps) {
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'rankingPoints', label: 'Pontos' },
    { value: 'position', label: 'Posição' },
    { value: 'winRate', label: 'Win Rate' },
    { value: 'kd', label: 'K/D' },
    { value: 'adr', label: 'ADR' },
    { value: 'matchesPlayed', label: 'Partidas' },
    { value: 'faceitElo', label: 'ELO' },
  ];

  return (
    <div className="space-y-4">
      {/* Header com Logo e Badge */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-faceit-orange to-orange-400 bg-clip-text text-transparent">
            🏆 CJ League - Season 0
          </h1>
          
        </div>

        {/* Update Badge (substitui o botão de atualizar) */}
        <UpdateBadge isUpdating={isUpdating} progress={updateProgress} />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Players */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-faceit-orange/20 rounded-lg">
              <svg className="w-6 h-6 text-faceit-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total de Jogadores</p>
              <p className="text-2xl font-bold">{totalPlayers}</p>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-faceit-orange/20 rounded-lg">
              <svg className="w-6 h-6 text-faceit-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-text-secondary">Última Atualização</p>
              <p className="text-sm font-semibold">
                {lastUpdated ? formatRelativeTime(lastUpdated) : 'Nunca'}
              </p>
            </div>
            
            {/* ✅ NOVO BOTÃO */}
            {onRefreshData && (
              <button
                onClick={onRefreshData}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-2 bg-faceit-orange hover:bg-faceit-orange/80 
                           disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg 
                           transition-colors text-xs font-semibold whitespace-nowrap"
                title="Buscar dados mais recentes do banco"
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

        {/* Next Update */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-faceit-orange/20 rounded-lg">
              <svg className="w-6 h-6 text-faceit-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Próxima Atualização</p>
              <p className="text-sm font-semibold">
                {nextUpdate ? formatRelativeTime(nextUpdate) : 'Calculando...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-2">
              🔍 Buscar Jogador
            </label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
              placeholder="Digite o nickname..."
              className="input"
            />
          </div>

          {/* Pot Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">
              🎯 Filtrar por Pote
            </label>
            <select
              value={filters.pot || 'all'}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  pot: e.target.value === 'all' ? 'all' : parseInt(e.target.value),
                })
              }
              className="input"
            >
              <option value="all">Todos os Potes</option>
              {POT_CONFIG.map((pot) => (
                <option key={pot.pot} value={pot.pot}>
                  Pote {pot.pot}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium mb-2">
              📊 Ordenar por
            </label>
            <div className="flex gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value as SortOption })}
                className="input flex-1"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onFiltersChange({
                  ...filters,
                  sortOrder: filters.sortOrder === 'desc' ? 'asc' : 'desc'
                })}
                className="px-4 bg-faceit-gray hover:bg-faceit-light-gray rounded-lg border border-faceit-light-gray transition-all"
                title={filters.sortOrder === 'desc' ? 'Ordem Decrescente' : 'Ordem Crescente'}
              >
                {filters.sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}