// src/components/admin/UpdateMapStatsButton.tsx
'use client';

import { useState } from 'react';

interface UpdateMapStatsButtonProps {
  seasonId?: string;
}

export default function UpdateMapStatsButton({ seasonId = 'SEASON_1' }: UpdateMapStatsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateMapStats = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/admin/update-map-stats?season=${seasonId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

  return (
    <div className="card p-6">
      <h2 className="text-2xl font-bold mb-4">🗺️ Atualizar Estatísticas de Mapas</h2>
      
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