'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { PlayerStats, HubStatsResponse, PlayerFilters } from '@/types/app.types';
import { storageService } from '@/services/storage.service';
import { cacheService } from '@/services/cache.service';
import StatsHeader from '@/components/StatsHeader';
import PrizeCards from '@/components/PrizeCards';
import PlayerCard from '@/components/PlayerCard';
import PlayerTable from '@/components/PlayerTable';
import LoadingState, { CardSkeleton } from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import {
  filterBySearch,
  filterByPot,
  comparePlayers,
} from '@/utils/stats.utils';

export default function HomePage() {
  // State
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  const [filters, setFilters] = useState<PlayerFilters>({
    searchTerm: '',
    pot: 'all',
    sortBy: 'rankingPoints',
    sortOrder: 'desc',
  });

  // Load data
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Check localStorage cache (unless force refresh)
      if (!forceRefresh) {
        const cache = storageService.getCache();
        
        if (cache && !cacheService.shouldUpdate(cache)) {
          console.log('✅ Using localStorage cache');
          setPlayers(cache.players);
          setLastUpdated(new Date(cache.lastUpdated));
          setNextUpdate(new Date(cache.nextUpdate));
          setLoading(false);
          return;
        }
      }

      // 2. Fetch from API
      console.log('🔄 Fetching fresh data from API...');
      const response = await fetch('/api/faceit/hub-stats');
      const data: HubStatsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      if (!data.data || data.data.length === 0) {
        throw new Error('No players found');
      }

      // 3. Save to localStorage
      storageService.saveCache({
        players: data.data,
        lastUpdated: data.cache.lastUpdated,
        nextUpdate: data.cache.nextUpdate,
        version: '1.0.0',
      });

      // 4. Update state
      setPlayers(data.data);
      setLastUpdated(new Date(data.cache.lastUpdated));
      setNextUpdate(new Date(data.cache.nextUpdate));

      console.log('✅ Data loaded successfully:', {
        players: data.data.length,
        fromCache: data.cache.fromCache,
        duration: data.meta?.updateDuration,
      });

    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Fallback to old cache
      const cache = storageService.getCache();
      if (cache && cache.players.length > 0) {
        console.log('📦 Using old cache as fallback');
        setPlayers(cache.players);
        setLastUpdated(new Date(cache.lastUpdated));
        setNextUpdate(new Date(cache.nextUpdate));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
    
    // Save last visit
    storageService.saveLastVisit();
  }, [loadData]);

  // Filtered and sorted players
  const filteredPlayers = useMemo(() => {
    let result = [...players];

    // Apply filters
    result = filterBySearch(result, filters.searchTerm);
    result = filterByPot(result, filters.pot);

    // Apply sorting
    result.sort((a, b) => comparePlayers(a, b, filters.sortBy, filters.sortOrder));

    return result;
  }, [players, filters]);

  // Handlers
  const handleRefresh = () => {
    loadData(true);
  };

  const handleFiltersChange = (newFilters: PlayerFilters) => {
    setFilters(newFilters);
  };

  // Render states
  if (loading && players.length === 0) {
    return <LoadingState />;
  }

  if (error && players.length === 0) {
    return <ErrorState error={error} onRetry={handleRefresh} />;
  }

  return (
    <div className="min-h-screen">
      {/* Container */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header with filters */}
        <StatsHeader
          filters={filters}
          onFiltersChange={handleFiltersChange}
          totalPlayers={players.length}
          lastUpdated={lastUpdated}
          nextUpdate={nextUpdate}
          isLoading={loading}
          onRefresh={handleRefresh}
        />
        

        {/* Error banner (if exists but we have cached data) */}
        {error && players.length > 0 && (
          <div className="mt-6 card bg-warning/10 border-warning/30">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">Usando dados em cache</p>
                <p className="text-sm text-text-secondary">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-text-secondary">
            {filteredPlayers.length === players.length
              ? `${players.length} jogadores`
              : `${filteredPlayers.length} de ${players.length} jogadores`}
          </p>

          {/* View mode toggle */}
          <div className="flex bg-faceit-darker rounded-lg p-1 border border-faceit-light-gray">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-md transition-all ${
                viewMode === 'cards'
                  ? 'bg-faceit-orange text-white'
                  : 'text-text-secondary hover:text-white'
              }`}
              title="Vista de Cards"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-faceit-orange text-white'
                  : 'text-text-secondary hover:text-white'
              }`}
              title="Vista de Tabela"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Players display */}
        <div className="mt-6">
          {filteredPlayers.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 mx-auto text-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xl font-semibold mb-2">Nenhum jogador encontrado</p>
              <p className="text-text-secondary">Tente ajustar os filtros</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlayers.map((player) => (
                <PlayerCard key={player.playerId} player={player} />
              ))}
            </div>
          ) : (
            <PlayerTable players={filteredPlayers} />
          )}
        </div>

      
      </div>
    </div>
  );
}
