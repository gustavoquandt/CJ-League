// src/components/admin/UpdateMapStatsButton.tsx - CORRIGIDO
'use client';

import { useState, useEffect } from 'react';

interface UpdateMapStatsButtonProps {
  seasonId?: string;
}

export default function UpdateMapStatsButton({ seasonId = 'SEASON_1' }: UpdateMapStatsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminSecret, setAdminSecret] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState(false);

  // Carregar secret do localStorage ao montar
  useEffect(() => {
    const saved = localStorage.getItem('admin_secret');
    if (saved) {
      setAdminSecret(saved);
      setIsConfigured(true);
    }
  }, []);

  const handleSaveSecret = () => {
    if (adminSecret.trim()) {
      localStorage.setItem('admin_secret', adminSecret.trim());
      setIsConfigured(true);
    }
  };

  const handleClearSecret = () => {
    localStorage.removeItem('admin_secret');
    setAdminSecret('');
    setIsConfigured(false);
    setResult(null);
    setError(null);
  };

  const handleUpdateMapStats = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/update-map-stats?season=${seasonId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSecret}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar map stats');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  // Se não está configurado, mostrar input
  if (!isConfigured) {
    return (
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4">🔐 Configuração Necessária</h2>
        
        <p className="text-gray-400 mb-4">
          Digite o ADMIN_SECRET para usar esta funcionalidade:
        </p>

        <div className="flex gap-2">
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder="Digite o ADMIN_SECRET"
            className="flex-1 px-4 py-2 bg-faceit-darker border border-faceit-light-gray rounded-lg text-white"
            onKeyPress={(e) => e.key === 'Enter' && handleSaveSecret()}
          />
          <button
            onClick={handleSaveSecret}
            className="btn-primary"
            disabled={!adminSecret.trim()}
          >
            Salvar
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          💡 O secret será salvo no localStorage do navegador
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold">🗺️ Atualizar Estatísticas de Mapas</h2>
        <button
          onClick={handleClearSecret}
          className="text-xs text-gray-500 hover:text-red-400"
          title="Limpar ADMIN_SECRET"
        >
          🔓 Limpar Secret
        </button>
      </div>
      
      <p className="text-gray-400 mb-4">
        Busca as últimas partidas do hub e recalcula a distribuição de mapas.
      </p>

      <button
        onClick={handleUpdateMapStats}
        disabled={isLoading}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Atualizando...
          </>
        ) : (
          <>🗺️ Atualizar Map Stats</>
        )}
      </button>

      {/* Resultado */}
      {result && (
        <div className="mt-4 p-4 bg-green-900/20 border border-green-500 rounded-lg">
          <p className="font-bold text-green-400 mb-2">✅ Atualizado com sucesso!</p>
          <div className="text-sm space-y-1">
            <p>📊 Total de partidas: <strong>{result.totalMatches}</strong></p>
            <p>📄 Páginas buscadas: <strong>{result.pagesSearched}</strong></p>
            <p>⏱️ Duração: <strong>{result.duration}</strong></p>
            {result.mostPlayed && (
              <p>🥇 Mapa mais jogado: <strong>{result.mostPlayed.map}</strong> ({result.mostPlayed.count}x - {result.mostPlayed.percentage}%)</p>
            )}
            {result.leastPlayed && (
              <p>🥉 Mapa menos jogado: <strong>{result.leastPlayed.map}</strong> ({result.leastPlayed.count}x - {result.leastPlayed.percentage}%)</p>
            )}
          </div>

          {/* Distribuição detalhada */}
          {result.mapDistribution && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">
                Ver distribuição completa
              </summary>
              <div className="mt-2 space-y-1">
                {Object.entries(result.mapDistribution as Record<string, number>)
                  .sort((a, b) => b[1] - a[1])
                  .map(([map, count]) => (
                    <div key={map} className="flex justify-between text-sm">
                      <span>{map}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded-lg">
          <p className="font-bold text-red-400 mb-2">❌ Erro</p>
          <p className="text-sm">{error}</p>
          {error.includes('Não autorizado') && (
            <p className="text-xs text-gray-400 mt-2">
              💡 Clique em "Limpar Secret" e digite o secret correto
            </p>
          )}
        </div>
      )}

      {/* Info adicional */}
      <div className="mt-4 text-xs text-gray-500">
        <p>💡 Este processo busca até 300 partidas do hub FACEIT.</p>
        <p>⏱️ Pode levar até 1 minuto para completar.</p>
      </div>
    </div>
  );
}