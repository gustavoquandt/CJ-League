'use client';

import { useState, useEffect } from 'react';

type ActionResult = {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: unknown;
};

// ── Card: Update Incremental ───────────────────────────────────────────────────

function UpdateIncrementalCard({ adminSecret }: { adminSecret: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  const handleUpdate = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/update-incremental?season=SEASON_1', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminSecret}` },
      });
      const data = await res.json();
      if (res.status === 401) {
        setResult({ success: false, error: 'Senha incorreta.' });
      } else {
        setResult(data);
      }
    } catch {
      setResult({ success: false, error: 'Erro de conexão.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold mb-1">Atualização Incremental</h2>
      <p className="text-sm text-text-secondary mb-4">
        Busca apenas as partidas novas desde o último cache e aplica os deltas. Rápido (~30s).
      </p>

      <button
        onClick={handleUpdate}
        disabled={isLoading}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {isLoading ? 'Atualizando...' : 'Executar Incremental'}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded-lg border text-sm space-y-1 ${result.success ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}`}>
          {result.success ? (
            <>
              <p className="font-bold text-green-400">Concluído</p>
              {typeof result.newMatches === 'number' && <p>Partidas novas: <strong>{result.newMatches as number}</strong></p>}
              {typeof result.playersUpdated === 'number' && <p>Jogadores atualizados: <strong>{result.playersUpdated as number}</strong></p>}
              {typeof result.totalPlayers === 'number' && <p>Total no cache: <strong>{result.totalPlayers as number}</strong></p>}
              {typeof result.duration === 'string' && <p>Duração: <strong>{result.duration as string}</strong></p>}
              {result.message && <p className="text-text-secondary">{result.message as string}</p>}
            </>
          ) : (
            <>
              <p className="font-bold text-red-400">Erro</p>
              <p>{result.error as string}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Card: Update Map Stats ─────────────────────────────────────────────────────

function UpdateMapStatsCard({ adminSecret }: { adminSecret: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  const handleUpdate = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/update-map-stats?season=SEASON_1', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminSecret}` },
      });
      const data = await res.json();
      if (res.status === 401) {
        setResult({ success: false, error: 'Senha incorreta.' });
      } else {
        setResult(data);
      }
    } catch {
      setResult({ success: false, error: 'Erro de conexão.' });
    } finally {
      setIsLoading(false);
    }
  };

  const dist = result?.mapDistribution as Record<string, number> | undefined;

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold mb-1">Estatísticas de Mapas</h2>
      <p className="text-sm text-text-secondary mb-4">
        Busca até 500 partidas do hub e recalcula a distribuição de mapas. (~1 min).
      </p>

      <button
        onClick={handleUpdate}
        disabled={isLoading}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {isLoading ? 'Atualizando...' : 'Atualizar Mapas'}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded-lg border text-sm space-y-1 ${result.success ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}`}>
          {result.success ? (
            <>
              <p className="font-bold text-green-400">Concluído</p>
              {typeof result.totalMatches === 'number' && <p>Partidas analisadas: <strong>{result.totalMatches as number}</strong></p>}
              {typeof result.pagesSearched === 'number' && <p>Páginas buscadas: <strong>{result.pagesSearched as number}</strong></p>}
              {typeof result.duration === 'string' && <p>Duração: <strong>{result.duration as string}</strong></p>}
              {result.mostPlayed && <p>Mais jogado: <strong>{(result.mostPlayed as any).map}</strong> ({(result.mostPlayed as any).count}x)</p>}
              {dist && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-text-secondary hover:text-white">Ver distribuição</summary>
                  <div className="mt-2 space-y-1">
                    {Object.entries(dist)
                      .sort((a, b) => b[1] - a[1])
                      .map(([map, count]) => (
                        <div key={map} className="flex justify-between">
                          <span>{map}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                      ))}
                  </div>
                </details>
              )}
            </>
          ) : (
            <>
              <p className="font-bold text-red-400">Erro</p>
              <p>{result.error as string}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Card: Batch Update (Full Refresh) ─────────────────────────────────────────

function BatchUpdateCard({ adminSecret }: { adminSecret: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const handleUpdate = async () => {
    setIsLoading(true);
    setLog([]);
    setDone(false);

    let batchNumber = 0;
    let hasMore = true;
    let existingPlayers: unknown[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      while (hasMore) {
        try {
          const res = await fetch('/api/admin/batch-update', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${adminSecret}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ batchNumber, existingPlayers, seasonId: 'SEASON_1' }),
          });

          if (res.status === 401) {
            setLog(prev => [...prev, 'Senha incorreta.']);
            break;
          }

          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Erro no batch');

          existingPlayers = data.players;
          hasMore = data.hasMore;
          successCount++;

          const player = data.batch?.currentPlayer || '?';
          const current = data.batch?.current ?? batchNumber + 1;
          const total = data.batch?.total ?? '?';
          setLog(prev => [...prev, `[${current}/${total}] ${player}`]);

          if (hasMore) {
            batchNumber = data.nextBatch;
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (err) {
          errorCount++;
          setLog(prev => [...prev, `Erro no batch ${batchNumber + 1}: ${err instanceof Error ? err.message : 'desconhecido'}`]);
          batchNumber++;
          if (batchNumber >= 49) hasMore = false;
        }
      }

      setLog(prev => [...prev, `Concluído — ${successCount} ok, ${errorCount} erros.`]);
      setDone(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold mb-1">Atualização Completa (Batch)</h2>
      <p className="text-sm text-text-secondary mb-4">
        Reprocessa todos os jogadores do zero. Use quando o incremental não for suficiente. (~25–98 min).
      </p>

      <button
        onClick={handleUpdate}
        disabled={isLoading}
        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {isLoading ? 'Processando...' : 'Executar Batch Update'}
      </button>

      {log.length > 0 && (
        <div className="mt-4 p-4 bg-faceit-darker border border-faceit-light-gray rounded-lg max-h-64 overflow-y-auto">
          <pre className="text-xs text-text-secondary whitespace-pre-wrap">
            {log.join('\n')}
          </pre>
          {done && <p className="text-green-400 font-bold text-sm mt-2">Finalizado.</p>}
        </div>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_secret');
    if (saved) setPassword(saved);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sessionStorage.setItem('admin_secret', input.trim());
    setPassword(input.trim());
    setInput('');
    setError('');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_secret');
    setPassword('');
  };

  if (!password) {
    return (
      <div className="min-h-screen bg-[var(--bg-dark)] flex items-center justify-center p-4">
        <div className="bg-faceit-dark border border-faceit-light-gray rounded-lg w-full max-w-sm p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Senha"
              autoFocus
              className="w-full px-4 py-2 bg-faceit-darker border border-faceit-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-faceit-orange"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" className="w-full btn-primary" disabled={!input.trim()}>
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-dark)] text-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600/20 border border-red-600/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors text-sm"
          >
            Sair
          </button>
        </div>

        <div className="grid gap-6">
          <UpdateIncrementalCard adminSecret={password} />
          <UpdateMapStatsCard adminSecret={password} />
          <BatchUpdateCard adminSecret={password} />
        </div>
      </div>
    </div>
  );
}
