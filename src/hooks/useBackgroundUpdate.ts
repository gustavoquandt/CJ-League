/**
 * Hook para buscar atualizações em background
 * Não bloqueia a UI, mostra dados em cache primeiro
 */

import { useState, useEffect, useCallback } from 'react';
import type { PlayerStats } from '@/types/app.types';

interface UpdateStatus {
  isUpdating: boolean;
  progress: number;
  hasNewData: boolean;
  error: string | null;
}

interface UseBackgroundUpdateReturn {
  status: UpdateStatus;
  checkForUpdates: () => Promise<void>;
  applyUpdate: () => void;
}

export function useBackgroundUpdate(
  onDataReady: (players: PlayerStats[]) => void
): UseBackgroundUpdateReturn {
  const [status, setStatus] = useState<UpdateStatus>({
    isUpdating: false,
    progress: 0,
    hasNewData: false,
    error: null,
  });

  const [pendingData, setPendingData] = useState<PlayerStats[] | null>(null);

  // Verificar atualizações em background
  const checkForUpdates = useCallback(async () => {
    setStatus(prev => ({ ...prev, isUpdating: true, progress: 0, error: null }));

    try {
      // Simular progresso
      const progressInterval = setInterval(() => {
        setStatus(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }));
      }, 300);

      // Buscar dados frescos
      const response = await fetch('/api/faceit/hub-stats');
      const data = await response.json();

      clearInterval(progressInterval);

      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar dados');
      }

      // Verificar se são dados novos
      const isNewData = !data.cache.fromCache;

      if (isNewData && data.data) {
        setPendingData(data.data);
        setStatus({
          isUpdating: false,
          progress: 100,
          hasNewData: true,
          error: null,
        });
      } else {
        setStatus({
          isUpdating: false,
          progress: 100,
          hasNewData: false,
          error: null,
        });
      }

    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
      setStatus({
        isUpdating: false,
        progress: 0,
        hasNewData: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }, []);

  // Aplicar atualização (recarregar página com novos dados)
  const applyUpdate = useCallback(() => {
    if (pendingData) {
      onDataReady(pendingData);
      setPendingData(null);
      setStatus(prev => ({ ...prev, hasNewData: false }));
    }
  }, [pendingData, onDataReady]);

  // Verificar atualizações automaticamente ao montar
  useEffect(() => {
    // Delay de 2s para não competir com carregamento inicial
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 2000);

    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  return {
    status,
    checkForUpdates,
    applyUpdate,
  };
}