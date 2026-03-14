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
    <div className="card">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-2">
              Buscar Jogador
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
            <label className="block text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-2">
              Filtrar por Pote
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
            <label className="block text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-2">
              Ordenar por
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
                className="px-4 py-2 bg-[#13131A] hover:bg-[#1A1A24] rounded-xl border border-[#2D2D3D] text-[#0EA5E9] hover:text-[#38BDF8] transition-all font-bold text-lg"
                title={filters.sortOrder === 'desc' ? 'Ordem Decrescente' : 'Ordem Crescente'}
              >
                {filters.sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>
          </div>
        </div>

        {/* Min Matches Toggle */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onFiltersChange({
              ...filters,
              minMatches: filters.minMatches === 10 ? 0 : 10,
            })}
            className={`relative w-10 h-5 rounded-full transition-colors overflow-hidden ${
              filters.minMatches === 10 ? 'bg-[#0EA5E9]' : 'bg-[#2D2D3D]'
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              filters.minMatches === 10 ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
          <span className="text-xs text-[#9CA3AF]">Apenas jogadores com 10+ partidas</span>
        </div>
      </div>
  );
}