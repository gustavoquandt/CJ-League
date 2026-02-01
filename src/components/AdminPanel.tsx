'use client';

import { useState } from 'react';

interface AdminPanelProps {
  isAdmin: boolean;
  showModal: boolean;
  onLogin: (password: string) => void;
  onClose: () => void;
  onLogout: () => void;
  onForceUpdate: (seasonId: 'SEASON_0' | 'SEASON_1') => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onLogin(password);
      setPassword('');
      setError('');
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-faceit-dark border border-faceit-light-gray rounded-lg max-w-md w-full p-6">
        {!isAdmin ? (
          // Login Form
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Admin Login</h2>
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
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-faceit-darker border border-faceit-light-gray rounded-lg focus:outline-none focus:border-faceit-orange"
                  placeholder="Digite a senha"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-danger text-sm">{error}</p>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
              >
                Entrar
              </button>
            </form>
          </>
        ) : (
          // Admin Panel
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Painel Admin</h2>
              <button
                onClick={onClose}
                className="text-text-secondary hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {/* ✅ Botão Season 1 (Atual) */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Season Atual
                </p>
                <button
                  onClick={() => onForceUpdate('SEASON_1')}
                  disabled={isUpdating}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Atualizando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Atualizar Season 1 ⚡</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-text-secondary">
                  🔄 Atualização incremental - Só busca partidas novas (~25 min)
                </p>
              </div>

              {/* ✅ Botão Season 0 (Histórico) */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Histórico
                </p>
                <button
                  onClick={() => onForceUpdate('SEASON_0')}
                  disabled={isUpdating}
                  className="w-full btn-secondary flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Atualizando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span>Atualizar Season 0 (Histórico)</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-text-secondary">
                  📦 Season congelada - Normalmente não precisa atualizar
                </p>
              </div>

              {/* Gerenciar Jogadores */}
              <div className="pt-2 border-t border-faceit-light-gray">
                <button
                  onClick={onManagePlayers}
                  disabled={isUpdating}
                  className="w-full px-4 py-2 bg-faceit-darker border border-faceit-light-gray text-white rounded-lg hover:bg-faceit-light-gray/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Gerenciar Jogadores
                </button>
              </div>

              {/* Logout */}
              <button
                onClick={onLogout}
                disabled={isUpdating}
                className="w-full px-4 py-2 bg-faceit-darker border border-danger/30 text-danger rounded-lg hover:bg-danger/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sair
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-300">
                💡 <strong>Dica:</strong> Season 1 é atualizada incrementalmente (rápido). 
                Season 0 está congelada e não precisa atualizar normalmente.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}