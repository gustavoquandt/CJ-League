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

 
// SUBSTITUA a função handleForceUpdate em src/app/page.tsx
// Por esta versão que trata erros corretamente:

const handleForceUpdate = async () => {
  if (!isAdmin) return;

  setIsForceUpdating(true);
  console.log('🔄 [ADMIN] Forçando atualização...');

  try {
    // Pegar senha do env (lado cliente)
    const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'admin123';

    const response = await fetch('/api/admin/force-update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminSecret}`,
        'Content-Type': 'application/json',
      },
    });

    // CORREÇÃO: Verificar se a resposta é JSON antes de parsear
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      // Resposta não é JSON (provavelmente timeout HTML)
      console.warn('⚠️ [ADMIN] Resposta não é JSON, provavelmente timeout');
      
      if (response.status === 504 || response.status === 524) {
        // Gateway timeout
        alert(
          '⚠️ Timeout do servidor (normal)\n\n' +
          'O processo está rodando em background.\n' +
          'Aguarde 10-15 minutos e recarregue a página.\n\n' +
          'Você pode ver o progresso nos logs da Vercel.'
        );
      } else {
        // Outro erro HTML
        const text = await response.text();
        console.error('Resposta HTML:', text.substring(0, 200));
        
        alert(
          '⚠️ Erro no servidor\n\n' +
          'Status: ' + response.status + '\n' +
          'O processo pode estar rodando em background.\n\n' +
          'Aguarde alguns minutos e recarregue a página.'
        );
      }
      
      return;
    }

    // Tentar parsear JSON
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('❌ [ADMIN] Erro ao parsear JSON:', jsonError);
      
      alert(
        '⚠️ Erro ao processar resposta\n\n' +
        'O servidor pode estar sobrecarregado.\n' +
        'Aguarde alguns minutos e tente novamente.'
      );
      
      return;
    }

    if (data.success) {
      // CORREÇÃO: A rota NÃO retorna dados, apenas confirma que iniciou
      console.log('✅ [ADMIN] Atualização iniciada em background');
      
      let message = '✅ Atualização iniciada!\n\n';
      message += 'O processo está rodando em background.\n';
      message += 'Aguarde 10-15 minutos e recarregue a página.';
      
      // Se detectou novos jogadores
      if (data.newPlayers && data.newPlayers.length > 0) {
        message += '\n\n🆕 NOVOS JOGADORES DETECTADOS!\n';
        message += `${data.newPlayers.length} novos jogadores encontrados.\n`;
        message += 'Veja os logs da Vercel para os nomes.';
      }
      
      alert(message);
      
      // Opcional: Recarregar após 15 minutos
      setTimeout(() => {
        console.log('🔄 Recarregando dados após 15 minutos...');
        window.location.reload();
      }, 15 * 60 * 1000); // 15 minutos
      
    } else {
      throw new Error(data.error || 'Erro ao forçar atualização');
    }
  } catch (err) {
    console.error('❌ [ADMIN] Erro:', err);
    
    let errorMessage = 'Erro ao forçar atualização';
    
    if (err instanceof TypeError && err.message.includes('fetch')) {
      errorMessage = 'Erro de conexão com servidor.\nTente novamente em alguns minutos.';
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }
    
    alert('❌ ' + errorMessage);
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