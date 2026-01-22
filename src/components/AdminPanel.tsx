'use client';

import { useState } from 'react';

/**
 * Painel Admin - ATUALIZADO com Gerenciamento de Jogadores
 */

interface AdminPanelProps {
  isAdmin: boolean;
  showModal: boolean;
  onLogin: (password: string) => boolean;
  onClose: () => void;
  onLogout: () => void;
  onForceUpdate: () => void;
  onManagePlayers: () => void;  // ← NOVO
  isUpdating: boolean;
}

export default function AdminPanel({
  isAdmin,
  showModal,
  onLogin,
  onClose,
  onLogout,
  onForceUpdate,
  onManagePlayers,  // ← NOVO
  isUpdating,
}: AdminPanelProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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
        <div className="bg-faceit-gray border border-faceit-orange rounded-lg p-4 shadow-2xl">
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

            {/* NOVO: Botão Gerenciar Jogadores */}
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