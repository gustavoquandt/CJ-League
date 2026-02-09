'use client';

import { useState, useEffect, useCallback } from 'react';

interface UpdateStatus {
  playersLastUpdated: string | null;
  mapsLastUpdated: string | null;
  totalPlayers: number;
  totalMatches: number;
  hasData: boolean;
}

interface UseUpdateNotificationReturn {
  hasNewData: boolean;
  checkForUpdates: () => Promise<void>;
  markAsRead: () => void;
  lastChecked: Date | null;
}

const POLL_INTERVAL = 30000; // 30 segundos
const STORAGE_KEY = 'cj-stats-last-seen-update';

export function useUpdateNotification(seasonId: string = 'SEASON_1'): UseUpdateNotificationReturn {
  const [hasNewData, setHasNewData] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState<string | null>(null);

  // Carregar último timestamp visto do localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setLastSeenTimestamp(stored);
    }
  }, []);

  // Verificar se há novos dados
  const checkForUpdates = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/update-status?season=${seasonId}`);
      const data: UpdateStatus = await response.json();

      setLastChecked(new Date());

      if (!data.hasData) {
        return;
      }

      // Se não tem timestamp salvo, usar o atual
      if (!lastSeenTimestamp) {
        const latestTimestamp = data.playersLastUpdated || data.mapsLastUpdated;
        if (latestTimestamp) {
          setLastSeenTimestamp(latestTimestamp);
          localStorage.setItem(STORAGE_KEY, latestTimestamp);
        }
        return;
      }

      // Verificar se há atualização mais recente
      const latestTimestamp = data.playersLastUpdated || data.mapsLastUpdated;
      if (latestTimestamp && new Date(latestTimestamp) > new Date(lastSeenTimestamp)) {
        setHasNewData(true);
      }

    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
    }
  }, [seasonId, lastSeenTimestamp]);

  // Marcar como lido
  const markAsRead = useCallback(() => {
    const now = new Date().toISOString();
    setLastSeenTimestamp(now);
    localStorage.setItem(STORAGE_KEY, now);
    setHasNewData(false);
  }, []);

  // Polling automático
  useEffect(() => {
    // Verificar imediatamente
    checkForUpdates();

    // Configurar polling
    const interval = setInterval(checkForUpdates, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  return {
    hasNewData,
    checkForUpdates,
    markAsRead,
    lastChecked,
  };
}