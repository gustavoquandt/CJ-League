'use client';

import { useState } from 'react';

/**
 * Painel Admin - COMPLETO com Detector + Comparação
 */

interface AdminPanelProps {
  isAdmin: boolean;
  showModal: boolean;
  onLogin: (password: string) => boolean;
  onClose: () => void;
  onLogout: () => void;
  onForceUpdate: () => void;
  onManagePlayers: () => void;
  isUpdating: boolean;
}

export default function AdminPanel({
  isAdmin,
  showModal,
  onLogin,
  onClose,
  onLogout,
  onForceUpdate,
  onManagePlayers,
  isUpdating,
}: AdminPanelProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Estados para detector de novos jogadores
  const [isDetecting, setIsDetecting] = useState(false);
  const [newPlayersFound, setNewPlayersFound] = useState<string[]>([]);
  const [showNewPlayers, setShowNewPlayers] = useState(false);
  const [totalInQueue, setTotalInQueue] = useState(0);

  // Estados para comparação fila vs site
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(password);
    if (!success) {
      setError('Senha incorreta');
      setPassword('');
    } else {
      setError('');
      setPassword('');
    }
  };

  // Função para detectar novos jogadores NA FILA
  const handleDetectNewPlayers = async () => {
    setIsDetecting(true);
    console.log('🔍 Detectando novos jogadores na fila...');

    try {
      const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'admin123';

      const response = await fetch('/api/admin/detect-new-players', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminSecret}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao detectar jogadores');
      }

      console.log(`✅ Detecção concluída:`);
      console.log(`   Total na fila: ${data.totalInQueue}`);
      console.log(`   Registrados: ${data.registeredPlayers}`);
      console.log(`   Novos: ${data.newPlayers.length}`);

      setTotalInQueue(data.totalInQueue);

      if (data.newPlayers.length > 0) {
        setNewPlayersFound(data.newPlayers);
        setShowNewPlayers(true);
        
        alert(
          `🆕 ${data.newPlayers.length} novos jogadores encontrados na fila!\n\n` +
          `Total na fila: ${data.totalInQueue}\n` +
          `Veja a lista abaixo e adicione ao constants.ts`
        );
      } else {
        alert(
          `✅ Nenhum jogador novo encontrado na fila!\n\n` +
          `Total na fila: ${data.totalInQueue}\n` +
          `Registrados: ${data.registeredPlayers}\n\n` +
          `Todos os jogadores da fila já estão no constants.ts`
        );
      }

    } catch (err) {
      console.error('❌ Erro:', err);
      alert('❌ Erro ao detectar novos jogadores: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setIsDetecting(false);
    }
  };

  // Função para comparar fila vs Redis
  const handleCompareQueueRedis = async () => {
    setIsComparing(true);
    console.log('🔍 Comparando fila com Redis...');

    try {
      const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'admin123';

      const response = await fetch('/api/admin/compare-queue-redis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminSecret}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao comparar');
      }

      console.log(`✅ Comparação concluída:`);
      console.log(`   Fila: ${data.totalInQueue}`);
      console.log(`   Redis: ${data.totalInRedis}`);
      console.log(`   Faltando: ${data.missing.length}`);
      console.log(`   Extras: ${data.extra.length}`);

      setComparisonResult(data);
      setShowComparison(true);

      if (data.missing.length > 0 || data.extra.length > 0) {
        alert(
          `⚠️ Diferenças encontradas!\n\n` +
          `Faltando no Site: ${data.missing.length}\n` +
          `Extras no Site: ${data.extra.length}\n\n` +
          `Veja a lista abaixo.`
        );
      } else {
        alert(`✅ Fila e Site estão sincronizados!\n\nNenhuma diferença encontrada.`);
      }

    } catch (err) {
      console.error('❌ Erro:', err);
      alert('❌ Erro ao comparar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setIsComparing(false);
    }
  };

  // Modal de login
  if (showModal && !isAdmin) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-faceit-gray border border-faceit-orange/30 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">🔐 Acesso Admin</h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Senha Admin</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha..."
                className="input"
                autoFocus
              />
              {error && (
                <p className="text-danger text-sm mt-2">❌ {error}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button type="submit" className="flex-1 btn-primary">
                Entrar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-faceit-light-gray hover:bg-faceit-lighter-gray rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-faceit-darker rounded-lg">
            <p className="text-xs text-text-secondary">
              💡 <strong>Dica:</strong> Use <kbd className="px-2 py-1 bg-faceit-light-gray rounded text-xs">Ctrl</kbd> + 
              <kbd className="px-2 py-1 bg-faceit-light-gray rounded text-xs mx-1">Shift</kbd> + 
              <kbd className="px-2 py-1 bg-faceit-light-gray rounded text-xs">A</kbd> para abrir este modal
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Controles admin (quando autenticado)
  if (isAdmin) {
    return (
      <div className="fixed bottom-6 left-6 z-40">
        <div className="bg-faceit-gray border border-faceit-orange rounded-lg p-4 shadow-2xl max-w-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-success">Modo Admin</span>
          </div>

          <div className="space-y-2">
            {/* Botão Forçar Atualização */}
            <button
              onClick={onForceUpdate}
              disabled={isUpdating}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <svg
                className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isUpdating ? 'Atualizando...' : 'Forçar Atualização'}
            </button>

            {/* Botão Detectar Novos Jogadores */}
            <button
              onClick={handleDetectNewPlayers}
              disabled={isDetecting}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 
                         text-white rounded-lg font-semibold transition-colors flex items-center 
                         justify-center gap-2"
            >
              {isDetecting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Detectando...</span>
                </>
              ) : (
                <>
                  🔍
                  <span>Detectar Novos Jogadores</span>
                </>
              )}
            </button>

            {/* Botão Comparar Fila vs Site */}
            <button
              onClick={handleCompareQueueRedis}
              disabled={isComparing}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 
                         text-white rounded-lg font-semibold transition-colors flex items-center 
                         justify-center gap-2"
            >
              {isComparing ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Comparando...</span>
                </>
              ) : (
                <>
                  🔄
                  <span>Comparar Fila vs Site</span>
                </>
              )}
            </button>

            {/* Botão Gerenciar Jogadores */}
            <button
              onClick={onManagePlayers}
              disabled={isUpdating}
              className="w-full px-4 py-2 bg-faceit-orange hover:bg-faceit-orange/80 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Gerenciar Jogadores
            </button>

            {/* Botão Logout */}
            <button
              onClick={onLogout}
              className="w-full px-4 py-2 bg-faceit-light-gray hover:bg-faceit-lighter-gray rounded-lg transition-colors text-sm"
            >
              🔒 Sair do Admin
            </button>
          </div>

          {/* Modal de Novos Jogadores */}
          {showNewPlayers && newPlayersFound.length > 0 && (
            <div className="mt-4 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-400">
                  🆕 {newPlayersFound.length} Novos na Fila
                </h3>
                <button
                  onClick={() => setShowNewPlayers(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-gray-400 mb-2">
                Total na fila: {totalInQueue} jogadores
              </p>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {newPlayersFound.map((nickname, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-2 bg-faceit-darker rounded"
                  >
                    <span className="text-gray-400 text-sm w-8">{index + 1}.</span>
                    <span className="font-mono text-white">{nickname}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-faceit-dark rounded border border-faceit-light-gray">
                <p className="text-sm text-gray-400 mb-2">
                  📝 Copie e adicione ao <code className="text-faceit-orange">constants.ts</code>:
                </p>
                <pre className="text-xs bg-black/50 p-2 rounded overflow-x-auto">
                  <code className="text-green-400">
{`export const PLAYER_NICKNAMES = [
  // ... jogadores existentes ...
${newPlayersFound.map(n => `  '${n}',`).join('\n')}
];`}
                  </code>
                </pre>
              </div>
            </div>
          )}

          {/* Modal de Comparação */}
          {showComparison && comparisonResult && (
            <div className="mt-4 p-4 bg-green-900/30 border border-green-500/30 rounded-lg max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-green-400">
                  🔄 Comparação Fila vs Site
                </h3>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 mb-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total na Fila:</span>
                  <span className="text-white font-semibold">{comparisonResult.totalInQueue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total no Site:</span>
                  <span className="text-white font-semibold">{comparisonResult.totalInRedis}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-400">❌ Faltando no Site:</span>
                  <span className="text-red-400 font-semibold">{comparisonResult.missing.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-400">⚠️ Extras no Site:</span>
                  <span className="text-yellow-400 font-semibold">{comparisonResult.extra.length}</span>
                </div>
              </div>

              {/* Jogadores FALTANDO */}
              {comparisonResult.missing.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-red-400 font-semibold mb-2 text-sm">
                    ❌ Faltando no Site (estão na fila):
                  </h4>
                  <div className="space-y-1">
                    {comparisonResult.missing.map((nick: string, index: number) => (
                      <div key={index} className="p-2 bg-red-900/20 border border-red-500/30 rounded">
                        <span className="font-mono text-white text-sm">{nick}</span>
                        <span className="text-xs text-red-400 ml-2">← Adicione ao constants.ts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Jogadores EXTRAS */}
              {comparisonResult.extra.length > 0 && (
                <div>
                  <h4 className="text-yellow-400 font-semibold mb-2 text-sm">
                    ⚠️ Extras no Site (não estão na fila):
                  </h4>
                  <div className="space-y-1">
                    {comparisonResult.extra.map((nick: string, index: number) => (
                      <div key={index} className="p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
                        <span className="font-mono text-white text-sm">{nick}</span>
                        <span className="text-xs text-yellow-400 ml-2">← Saiu da fila?</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Se tudo OK */}
              {comparisonResult.missing.length === 0 && comparisonResult.extra.length === 0 && (
                <div className="p-4 bg-green-900/20 border border-green-500/30 rounded text-center">
                  <p className="text-green-400 font-semibold">✅ Fila e Site estão sincronizados!</p>
                  <p className="text-sm text-gray-400 mt-1">Nenhuma diferença encontrada.</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-faceit-light-gray">
            <p className="text-xs text-text-secondary">
              <kbd className="px-1 bg-faceit-darker rounded">Ctrl+Shift+A</kbd> para reabrir
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}