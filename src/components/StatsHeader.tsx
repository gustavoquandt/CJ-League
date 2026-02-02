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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-pink to-primary-purple bg-clip-text text-transparent">
            🏆 CJ League
          </h1>
          
        </div>

        {/* Update Badge (substitui o botão de atualizar) */}
        <UpdateBadge isUpdating={isUpdating} progress={updateProgress} />
      </div>

      {/* Última Atualização */}
      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-faceit-orange/20 rounded-lg">
              <svg className="w-6 h-6 text-faceit-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Última vez atualizado em</p>
              <p className="text-lg font-semibold">
                {lastUpdated ? formatRelativeTime(lastUpdated) : 'Nunca'}
              </p>
            </div>
          </div>
          
          {/* Botão Atualizar */}
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-faceit-orange hover:bg-faceit-orange/80 
                         disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg 
                         transition-colors text-sm font-semibold"
              title="Buscar dados mais recentes do banco"
            >
              {isRefreshing ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Atualizando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Atualizar Dados</span>
                </>
              )}
            </button>
          )}
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