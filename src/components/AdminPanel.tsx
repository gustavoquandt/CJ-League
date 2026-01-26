'use client';

import { useState } from 'react';

/**
 * Painel Admin - ATUALIZADO com Detector de Novos Jogadores
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

  // Função para detectar novos jogadores
  const handleDetectNewPlayers = async () => {
    setIsDetecting(true);
    console.log('🔍 Detectando novos jogadores...');

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
      console.log(`   Total no hub: ${data.totalMembers}`);
      console.log(`   Registrados: ${data.registeredPlayers}`);
      console.log(`   Novos: ${data.newPlayers.length}`);

      if (data.newPlayers.length > 0) {
        setNewPlayersFound(data.newPlayers);
        setShowNewPlayers(true);
        
        alert(
          `🆕 ${data.newPlayers.length} novos jogadores encontrados!\n\n` +
          `Veja a lista abaixo e adicione ao constants.ts`
        );
      } else {
        alert('✅ Nenhum jogador novo encontrado!\n\nTodos os membros do hub já estão registrados.');
      }

    } catch (err) {
      console.error('❌ Erro:', err);
      alert('❌ Erro ao detectar novos jogadores: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setIsDetecting(false);
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

            {/* NOVO: Botão Detectar Novos Jogadores */}
            <button
              onClick={handleDetectNewPlayers}
              disabled={isDetecting || isUpdating}
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
                  <span>🔍</span>
                  <span>Detectar Novos Jogadores</span>
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
              🔓 Sair do Admin
            </button>
          </div>

          {/* NOVO: Modal de Novos Jogadores */}
          {showNewPlayers && newPlayersFound.length > 0 && (
            <div className="mt-4 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-400">
                  🆕 {newPlayersFound.length} Novos Jogadores
                </h3>
                <button
                  onClick={() => setShowNewPlayers(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {newPlayersFound.map((nickname, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-2 bg-faceit-darker rounded"
                  >
                    <span className="text-gray-400 text-sm w-8">{index + 1}.</span>
                    <span className="font-mono text-white text-sm">{nickname}</span>
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