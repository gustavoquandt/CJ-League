'use client';

import { useState } from 'react';

interface AdminPanelProps {
  isAdmin: boolean;
  showModal: boolean;
  onLogin: (password: string) => void;
  onClose: () => void;
  onLogout: () => void;
  onForceUpdate: (seasonId: 'SEASON_0' | 'SEASON_1') => void;
  onUpdateMapStats: (seasonId: 'SEASON_0' | 'SEASON_1') => void;
  isUpdating: boolean;
  isUpdatingMapStats?: boolean;
}

export default function AdminPanel({
  isAdmin,
  showModal,
  onLogin,
  onClose,
  onLogout,
  onForceUpdate,
  onUpdateMapStats,
  isUpdating,
  isUpdatingMapStats = false,
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
                  Senha Admin
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-faceit-darker border border-faceit-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-faceit-orange"
                  placeholder="Digite a senha"
                  autoFocus
                />
                {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
              </div>

              <button
                type="submit"
                className="w-full btn-primary"
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
              {/* ✅ ATUALIZAR PLAYERS - Season 1 */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Season Atual - Players
                </p>
                <button
                  onClick={() => onForceUpdate('SEASON_1')}
                  disabled={isUpdating || isUpdatingMapStats}
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
                      <span>Atualizar Players Season 1 ⚡</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-text-secondary">
                  🔄 Atualiza estatísticas dos jogadores (~25 min)
                </p>
              </div>

              {/* ✅ ATUALIZAR MAP STATS - Season 1 */}
              <div className="space-y-2">
                <button
                  onClick={() => onUpdateMapStats('SEASON_1')}
                  disabled={isUpdating || isUpdatingMapStats}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdatingMapStats ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Atualizando Mapas...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <span>Atualizar Mapas Season 1 🗺️</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-text-secondary">
                  🗺️ Atualiza apenas os cards de mapas (~10 segundos)
                </p>
              </div>

              {/* ✅ ATUALIZAR PLAYERS - Season 0 */}
              <div className="space-y-2 pt-2 border-t border-faceit-light-gray">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Histórico - Players
                </p>
                <button
                  onClick={() => onForceUpdate('SEASON_0')}
                  disabled={isUpdating || isUpdatingMapStats}
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
                      <span>Atualizar Players Season 0</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-text-secondary">
                  📦 Season congelada - Normalmente não precisa
                </p>
              </div>

              {/* ✅ ATUALIZAR MAP STATS - Season 0 */}
              <div className="space-y-2">
                <button
                  onClick={() => onUpdateMapStats('SEASON_0')}
                  disabled={isUpdating || isUpdatingMapStats}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdatingMapStats ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Atualizando Mapas...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <span>Atualizar Mapas Season 0 🗺️</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-text-secondary">
                  🗺️ Atualiza apenas os cards de mapas do histórico
                </p>
              </div>

              {/* Logout */}
              <div className="pt-2 border-t border-faceit-light-gray">
                <button
                  onClick={onLogout}
                  className="w-full px-4 py-2 bg-red-600/20 border border-red-600/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
                >
                  Sair
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}