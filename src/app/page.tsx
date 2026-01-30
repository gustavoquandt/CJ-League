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
  const [isRefreshing, setIsRefreshing] = useState(false); // ✅ NOVO
  
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

  // Load inicial (Cache Local PRIMEIRO, depois Redis se necessário)
  useEffect(() => {
    const loadInitialCache = () => {
      try {
        setLoading(true);
        
        // ✅ NÃO LIMPAR O CACHE! Deixar funcionar normalmente
        const cache = storageService.getCache();
        
        if (cache && cache.players.length > 0) {
          console.log('✅ Carregando do cache local');
          setPlayers(cache.players);
          setLastUpdated(new Date(cache.lastUpdated));
          setNextUpdate(new Date(cache.nextUpdate));
        } else {
          // Cache vazio - buscar do Redis (banco)
          console.log('⚠️ Cache vazio, buscando do Redis...');
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

  // Fallback: buscar da API (Redis)
  const loadFromAPI = async () => {
    try {
      // ✅ ADICIONAR TIMESTAMP PARA EVITAR CACHE
      const timestamp = Date.now();
      const response = await fetch(`/api/faceit/hub-stats?t=${timestamp}`);
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

  // ✅ NOVO: Função para atualizar dados do Redis
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      console.log('🔄 Buscando dados atualizados do Redis...');
      
      const timestamp = Date.now();
      const response = await fetch(`/api/faceit/hub-stats?t=${timestamp}`);
      const data: HubStatsResponse = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        setPlayers(data.data);
        setLastUpdated(new Date(data.cache.lastUpdated));
        setNextUpdate(new Date(data.cache.nextUpdate));
        
        storageService.saveCache({
          players: data.data,
          lastUpdated: data.cache.lastUpdated,
          nextUpdate: data.cache.nextUpdate,
          version: '1.0.0',
        });
        
        console.log('✅ Dados atualizados com sucesso!');
      } else {
        throw new Error('Nenhum dado disponível no banco');
      }
    } catch (err) {
      console.error('❌ Erro ao atualizar:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados');
    } finally {
      setIsRefreshing(false);
    }
  };
 
  // Admin: Forçar atualização (chama FACEIT API)
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

  // ✅ Empty state com botão "Buscar do Banco"
  if (!loading && players.length === 0 && !error) {
    return (
      <div className="min-h-screen bg-faceit-darker flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center py-12 px-6">
          <div className="mb-6">
            <svg 
              className="w-20 h-20 mx-auto text-faceit-orange mb-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
              />
            </svg>
            
            <h2 className="text-2xl font-bold mb-3">Nenhum dado disponível</h2>
            
            <p className="text-text-secondary mb-6">
              Seu cache local está vazio.<br />
              Clique no botão abaixo para buscar os dados do banco de dados.
            </p>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-xs text-blue-300">
                💡 <strong>Nota:</strong> Isso busca os dados que já estão salvos no banco. 
                Não faz novas requisições para a API da FACEIT.
              </p>
            </div>
          </div>
          
          <button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="btn-primary mx-auto flex items-center gap-2 px-6 py-3"
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Buscar do Banco</span>
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-danger/10 border border-danger/30 rounded-lg">
              <p className="text-danger text-sm">
                {error}
              </p>
              <p className="text-xs text-text-secondary mt-2">
                O admin precisa fazer uma atualização primeiro.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && players.length === 0) {
    return <ErrorState error={error} onRetry={handleRefreshData} />;
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
          onRefreshData={handleRefreshData}
          isRefreshing={isRefreshing}
        />
        
        {/* <PrizeCards /> */}

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