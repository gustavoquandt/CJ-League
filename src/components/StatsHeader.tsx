'use client';

import type { PlayerFilters, SortOption } from '@/types/app.types';
import { POT_CONFIG } from '@/config/constants';


interface StatsHeaderProps {
  filters: PlayerFilters;
  onFiltersChange: (filters: PlayerFilters) => void;
  totalPlayers?: number;
  lastUpdated?: Date | null;
  nextUpdate?: Date | null;
  isUpdating?: boolean;
  updateProgress?: number;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

export default function StatsHeader({
  filters,
  onFiltersChange,
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
      {/* Filters */}
      <div className="card h-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
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
            <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
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
            <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
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
                className="px-4 py-2 bg-[var(--bg-dark)] hover:bg-[var(--bg-medium)] rounded-lg border border-[#e31e24] text-[#e31e24] hover:text-[#ff3a40] transition-all font-bold text-lg"
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