'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import type { PlayerStats, HubStatsResponse, PlayerFilters } from '@/types/app.types';
import { storageService } from '@/services/storage.service';
import { useBackgroundUpdate } from '@/hooks/useBackgroundUpdate';
import { useAdmin } from '@/hooks/useAdmin';
import StatsHeader from '@/components/StatsHeader';
import PrizeCards from '@/components/PrizeCards';
import PlayerCard from '@/components/PlayerCard';
import PlayerTable from '@/components/PlayerTable';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import UpdateToast from '@/components/UpdateToast';
import AdminPanel from '@/components/AdminPanel';
import PlayerManagementPanel from '@/components/PlayerManagementPanel';
import {
  filterBySearch,
  filterByPot,
  comparePlayers,
} from '@/utils/stats.utils';

function HomePageContent() {
  // State
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showToast, setShowToast] = useState(false);
  const [isForceUpdating, setIsForceUpdating] = useState(false);
  const [showPlayerManagement, setShowPlayerManagement] = useState(false);
  
  const [filters, setFilters] = useState<PlayerFilters>({
    searchTerm: '',
    pot: 'all',
    sortBy: 'rankingPoints',
    sortOrder: 'desc',
  });

  // Hooks
  const { status: updateStatus, applyUpdate } = useBackgroundUpdate((newPlayers) => {
    setPlayers(newPlayers);
  });

  const {
    isAdmin,
    showAdminModal,
    setShowAdminModal,
    adminLogin,
    adminLogout,
  } = useAdmin();

  // Mostrar toast quando tiver dados novos
  useEffect(() => {
    if (updateStatus.hasNewData) {
      setShowToast(true);
    }
  }, [updateStatus.hasNewData]);

  // Load inicial (APENAS CACHE)
  useEffect(() => {
    const loadInitialCache = () => {
      try {
        setLoading(true);
        
        const cache = storageService.getCache();
        
        if (cache && cache.players.length > 0) {
          console.log('✅ Carregando do cache local');
          setPlayers(cache.players);
          setLastUpdated(new Date(cache.lastUpdated));
          setNextUpdate(new Date(cache.nextUpdate));
        } else {
          console.log('⚠️ Cache vazio, buscando dados...');
          loadFromAPI();
        }
      } catch (err) {
        console.error('Erro ao carregar cache:', err);
        loadFromAPI();
      } finally {
        setLoading(false);
      }
    };

    loadInitialCache();
    storageService.saveLastVisit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback: buscar da API
  const loadFromAPI = async () => {
    try {
      const response = await fetch('/api/faceit/hub-stats');
      const data: HubStatsResponse = await response.json();

      if (data.success && data.data) {
        setPlayers(data.data);
        setLastUpdated(new Date(data.cache.lastUpdated));
        setNextUpdate(new Date(data.cache.nextUpdate));
        
        storageService.saveCache({
          players: data.data,
          lastUpdated: data.cache.lastUpdated,
          nextUpdate: data.cache.nextUpdate,
          version: '1.0.0',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

 
// SUBSTITUIR a função handleForceUpdate em src/app/page.tsx
// Por esta versão que processa em batches:

const handleForceUpdate = async () => {
  if (!isAdmin) return;

  setIsForceUpdating(true);
  console.log('📦 [ADMIN] Iniciando atualização em batches...');

  try {
    const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'admin123';
    
    let batchNumber = 0;
    let hasMore = true;
    let existingPlayers: any[] = [];
    let totalBatches = 0;

    // Processar batches sequencialmente
    while (hasMore) {
      console.log(`📦 Processando batch ${batchNumber + 1}...`);

      const response = await fetch('/api/admin/batch-update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchNumber,
          existingPlayers,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro no batch ${batchNumber + 1}: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || `Erro no batch ${batchNumber + 1}`);
      }

      // Atualizar estado
      existingPlayers = data.players;
      hasMore = data.hasMore;
      totalBatches = data.batch.total;

      console.log(
        `✅ Batch ${data.batch.current}/${data.batch.total} concluído ` +
        `(${data.batch.totalPlayers} jogadores processados)`
      );

      // Atualizar preview no frontend
      setPlayers(existingPlayers);
      setLastUpdated(new Date());

      // Próximo batch
      if (hasMore) {
        batchNumber = data.nextBatch;
        
        // Delay entre batches (opcional, para dar tempo de ver progresso)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // CONCLUÍDO!
    console.log(`🎉 Atualização completa! ${existingPlayers.length} jogadores`);
    
    // Salvar no cache local
    storageService.saveCache({
      players: existingPlayers,
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      version: '1.0.0',
    });

    alert(
      `✅ Atualização concluída!\n\n` +
      `${existingPlayers.length} jogadores atualizados em ${totalBatches} batches.\n\n` +
      `Os dados já estão disponíveis no site!`
    );

  } catch (err) {
    console.error('❌ [ADMIN] Erro:', err);
    alert('❌ Erro ao atualizar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
  } finally {
    setIsForceUpdating(false);
  }
};

  const handleManagePlayers = () => {
    setShowPlayerManagement(true);
  };

  // Filtered and sorted players
  const filteredPlayers = useMemo(() => {
    let result = [...players];

    result = filterBySearch(result, filters.searchTerm);
    
    const pot = filters.pot ?? 'all';
    const potFilter = pot === 'all' ? 'all' : Number(pot);
    result = filterByPot(result, potFilter);

    result.sort((a, b) => comparePlayers(a, b, filters.sortBy, filters.sortOrder));

    return result;
  }, [players, filters]);

  // Handlers
  const handleFiltersChange = (newFilters: PlayerFilters) => {
    setFilters(newFilters);
  };

  const handleApplyUpdate = () => {
    applyUpdate();
    setShowToast(false);
  };

  const handleDismissToast = () => {
    setShowToast(false);
  };

  // Render states
  if (loading && players.length === 0) {
    return <LoadingState />;
  }

  if (error && players.length === 0) {
    return <ErrorState error={error} onRetry={loadFromAPI} />;
  }

  return (
    <div className="min-h-screen">
      {/* Container */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <StatsHeader
          filters={filters}
          onFiltersChange={handleFiltersChange}
          totalPlayers={players.length}
          lastUpdated={lastUpdated}
          nextUpdate={nextUpdate}
          isUpdating={updateStatus.isUpdating}
          updateProgress={updateStatus.progress}
        />
        
        <PrizeCards />

        {/* Error banner */}
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

      {/* Toast de atualização */}
      <UpdateToast
        show={showToast}
        onApply={handleApplyUpdate}
        onDismiss={handleDismissToast}
      />

      {/* Admin Panel */}
      <AdminPanel
        isAdmin={isAdmin}
        showModal={showAdminModal}
        onLogin={adminLogin}
        onClose={() => setShowAdminModal(false)}
        onLogout={adminLogout}
        onForceUpdate={handleForceUpdate}
        onManagePlayers={handleManagePlayers}
        isUpdating={isForceUpdating}
      />

      {/* Player Management Panel */}
      <PlayerManagementPanel
        isVisible={showPlayerManagement}
        onClose={() => setShowPlayerManagement(false)}
      />
    </div>
  );
}

// Componente principal com Suspense
export default function HomePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <HomePageContent />
    </Suspense>
  );
}