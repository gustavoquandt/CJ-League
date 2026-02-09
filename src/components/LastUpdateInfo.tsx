/**
 * Componente: LastUpdateInfo
 * Mostra última atualização DE DADOS e última verificação
 */

'use client';

import { useEffect, useState } from 'react';

interface LastUpdateInfoProps {
  lastDataUpdate: Date | null; // Quando dados mudaram
  seasonId: 'SEASON_0' | 'SEASON_1';
}

export default function LastUpdateInfo({ lastDataUpdate, seasonId }: LastUpdateInfoProps) {
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Buscar última verificação
  useEffect(() => {
    const fetchLastCheck = async () => {
      try {
        const response = await fetch(`/api/admin/update-status?season=${seasonId}`);
        const data = await response.json();
        
        if (data.success && data.lastCheck) {
          setLastCheck(new Date(data.lastCheck));
        }
      } catch (error) {
        console.error('Erro ao buscar última verificação:', error);
      }
    };

    fetchLastCheck();
    
    // Atualizar a cada 30s
    const interval = setInterval(fetchLastCheck, 30000);
    return () => clearInterval(interval);
  }, [seasonId]);

  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return 'Nunca';
    
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Agora mesmo';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
    return `${Math.floor(seconds / 86400)}d atrás`;
  };

  return (
    <div className="flex flex-col gap-1 text-sm">
      {/* Última atualização de dados */}
      <div className="flex items-center gap-2">
        <span className="text-text-secondary">Dados atualizados:</span>
        <span className="font-medium text-white">
          {formatTimeAgo(lastDataUpdate)}
        </span>
      </div>
      
      {/* Última verificação */}
      <div className="flex items-center gap-2">
        <span className="text-text-secondary text-xs">Última verificação:</span>
        <span className="text-xs text-text-secondary">
          {formatTimeAgo(lastCheck)}
        </span>
        {isChecking && (
          <div className="w-3 h-3 border-2 border-faceit-orange border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}