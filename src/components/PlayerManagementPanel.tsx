'use client';

import { useState, useEffect } from 'react';

/**
 * Painel de Gerenciamento de Jogadores + Potes
 * LAYOUT 2 LINHAS - Nickname em cima, Pote embaixo
 */

interface Player {
  nickname: string;
  pot: number;
}

interface PlayerManagementPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function PlayerManagementPanel({
  isVisible,
  onClose,
}: PlayerManagementPanelProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [newPot, setNewPot] = useState<number>(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Carregar lista de jogadores
  const loadPlayers = async () => {
    setLoading(true);
    setError('');

    try {
      const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'admin123';
      const response = await fetch('/api/admin/player-management', {
        headers: {
          'Authorization': `Bearer ${adminSecret}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setPlayers(data.players || []);
      } else {
        setError(data.error || 'Erro ao carregar jogadores');
      }
    } catch (err) {
      setError('Erro ao conectar com servidor');
    } finally {
      setLoading(false);
    }
  };

  // Adicionar jogador
  const handleAddPlayer = async () => {
    if (!newNickname.trim()) {
      setError('Digite um nickname');
      return;
    }

    if (newPot < 1 || newPot > 5) {
      setError('Pote deve ser entre 1 e 5');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'admin123';
      const response = await fetch('/api/admin/player-management', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          nickname: newNickname.trim(),
          pot: newPot,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPlayers(data.players || []);
        setSuccess(data.message || 'Jogador adicionado!');
        setNewNickname('');
        setNewPot(1);
      } else {
        setError(data.error || 'Erro ao adicionar jogador');
      }
    } catch (err) {
      setError('Erro ao conectar com servidor');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar pote
  const handleUpdatePot = async (nickname: string, newPotValue: number) => {
    if (newPotValue < 1 || newPotValue > 5) {
      setError('Pote deve ser entre 1 e 5');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'admin123';
      const response = await fetch('/api/admin/player-management', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updatePot',
          nickname,
          pot: newPotValue,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPlayers(data.players || []);
        setSuccess(data.message || 'Pote atualizado!');
      } else {
        setError(data.error || 'Erro ao atualizar pote');
      }
    } catch (err) {
      setError('Erro ao conectar com servidor');
    } finally {
      setLoading(false);
    }
  };

  // Remover jogador
  const handleRemovePlayer = async (nickname: string) => {
    if (!confirm(`Remover jogador "${nickname}"?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'admin123';
      const response = await fetch('/api/admin/player-management', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          nickname,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPlayers(data.players || []);
        setSuccess(data.message || 'Jogador removido!');
      } else {
        setError(data.error || 'Erro ao remover jogador');
      }
    } catch (err) {
      setError('Erro ao conectar com servidor');
    } finally {
      setLoading(false);
    }
  };

  // Carregar ao abrir
  useEffect(() => {
    if (isVisible) {
      loadPlayers();
    }
  }, [isVisible]);

  // Limpar mensagens após 3s
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-faceit-gray border border-faceit-orange/30 rounded-lg max-w-3xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-faceit-light-gray">
          <h2 className="text-xl font-bold">👥 Gerenciar Jogadores & Potes</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Adicionar jogador - 2 LINHAS */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">Adicionar Novo Jogador</label>
            
            {/* LINHA 1: Nickname */}
            <div className="mb-2">
              <label className="block text-xs text-text-secondary mb-1">Nickname</label>
              <input
                type="text"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                placeholder="Digite o nickname..."
                className="input w-full"
                disabled={loading}
              />
            </div>

            {/* LINHA 2: Pote + Botão */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1">Pote</label>
                <select
                  value={newPot}
                  onChange={(e) => setNewPot(Number(e.target.value))}
                  className="input w-full"
                  disabled={loading}
                >
                  <option value={1}>Pote 1</option>
                  <option value={2}>Pote 2</option>
                  <option value={3}>Pote 3</option>
                  <option value={4}>Pote 4</option>
                  <option value={5}>Pote 5</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleAddPlayer}
                  disabled={loading || !newNickname.trim()}
                  className="btn-primary px-6"
                >
                  {loading ? '...' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>

          {/* Mensagens */}
          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger">
              ❌ {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg text-success">
              ✅ {success}
            </div>
          )}

          {/* Lista de jogadores */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">
                Jogadores Cadastrados ({players.length})
              </label>
              <button
                onClick={loadPlayers}
                disabled={loading}
                className="text-xs text-faceit-orange hover:text-faceit-orange/80"
              >
                🔄 Atualizar
              </button>
            </div>

            {loading && players.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                Carregando...
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                Nenhum jogador cadastrado
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {players.map((player, index) => (
                  <div
                    key={player.nickname}
                    className="p-4 bg-faceit-darker rounded-lg hover:bg-faceit-light-gray transition-colors"
                  >
                    {/* LINHA 1: Número + Nickname + Remover */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-text-secondary text-sm">#{index + 1}</span>
                        <span className="font-medium text-lg">{player.nickname}</span>
                      </div>
                      <button
                        onClick={() => handleRemovePlayer(player.nickname)}
                        disabled={loading}
                        className="text-danger hover:text-danger/80 transition-colors"
                        title="Remover jogador"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* LINHA 2: Label Pote + Select */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-secondary w-16">Pote:</label>
                      <select
                        value={player.pot}
                        onChange={(e) => handleUpdatePot(player.nickname, Number(e.target.value))}
                        className="input flex-1 text-sm"
                        disabled={loading}
                      >
                        <option value={1}>Pote 1</option>
                        <option value={2}>Pote 2</option>
                        <option value={3}>Pote 3</option>
                        <option value={4}>Pote 4</option>
                        <option value={5}>Pote 5</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-faceit-light-gray bg-faceit-darker">
          <p className="text-xs text-text-secondary">
            💡 <strong>Importante:</strong> Após adicionar/remover/mudar pote, force uma atualização para buscar os dados dos jogadores.
          </p>
        </div>
      </div>
    </div>
  );
}