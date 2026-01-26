'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { PlayerStats, SortOption } from '@/types/app.types';
import {
  formatPosition,
  formatStat,
  formatPercentage,
  getKDColor,
  getWinRateColor,
  getADRColor,
  comparePlayers,
} from '@/utils/stats.utils';

interface PlayerTableProps {
  players: PlayerStats[];
}

export default function PlayerTable({ players }: PlayerTableProps) {
  const [sortBy, setSortBy] = useState<SortOption>('rankingPoints');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Ordenar jogadores
  const sortedPlayers = [...players].sort((a, b) => 
    comparePlayers(a, b, sortBy, sortOrder)
  );

  // Handler de clique no header
  const handleSort = (column: SortOption) => {
    if (sortBy === column) {
      // Inverte ordem se clicar na mesma coluna
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      // Nova coluna, sempre começa descendente
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Componente de seta de ordenação
  const SortIcon = ({ column }: { column: SortOption }) => {
    if (sortBy !== column) {
      // Não está ordenando por esta coluna
      return (
        <svg className="w-4 h-4 text-text-secondary opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortOrder === 'desc' ? (
      <svg className="w-4 h-4 text-faceit-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-faceit-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  };

  // Header clicável
  const SortableHeader = ({ 
    column, 
    label, 
    className = '' 
  }: { 
    column: SortOption; 
    label: string; 
    className?: string;
  }) => (
    <th 
      className={`cursor-pointer hover:bg-faceit-light-gray transition-colors ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-2 justify-center">
        <span>{label}</span>
        <SortIcon column={column} />
      </div>
    </th>
  );

  return (
    <div className="table-container animate-fade-in">
      <table className="table">
        <thead>
          <tr>
            <th className="sticky left-0 bg-faceit-darker z-10">
              <SortableHeader column="position" label="Pos" />
            </th>
            <th>Jogador</th>
            <th className="hidden md:table-cell">Pote</th>
            <SortableHeader column="rankingPoints" label="Pontos" />
            <SortableHeader column="matchesPlayed" label="Partidas" className="hidden lg:table-cell" />
            <SortableHeader column="winRate" label="Win Rate" />
            <SortableHeader column="kd" label="K/D" />
            <SortableHeader column="adr" label="ADR" className="hidden lg:table-cell" />
            <th className="hidden xl:table-cell">HS%</th>
           
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((player, index) => {
            return (
              <tr key={player.playerId}>
                {/* Position */}
                <td className="sticky left-0 bg-faceit-gray z-10">
                  <div className="flex items-center gap-2">
                    {index < 3 ? (
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-black"
                        style={{
                          background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
                        }}
                      >
                        {index + 1}
                      </div>
                    ) : (
                      <span className="text-text-secondary font-semibold">
                        {formatPosition(index + 1)}
                      </span>
                    )}
                  </div>
                </td>

                {/* Player */}
                <td>
                  <div className="flex items-center gap-3">
                    {player.avatar ? (
                      <Image
                        src={player.avatar}
                        alt={player.nickname}
                        width={40}
                        height={40}
                        className="rounded-full border-2 border-faceit-orange"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-faceit-light-gray flex items-center justify-center font-bold">
                        {player.nickname.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{player.nickname}</p>
                    </div>
                  </div>
                </td>

                {/* Pot */}
                <td className="hidden md:table-cell">
                  <span className={`badge badge-pot-${player.pot}`}>
                    Pote {player.pot}
                  </span>
                </td>

                {/* Points */}
                <td>
                  <span className="text-faceit-orange font-bold text-lg">
                    {player.rankingPoints}
                  </span>
                </td>

                {/* Matches */}
                <td className="hidden lg:table-cell">
                  <div>
                    <p className="font-semibold">{player.matchesPlayed}</p>
                    <p className="text-xs text-text-secondary">
                      {player.wins}W / {player.losses}L
                    </p>
                  </div>
                </td>

                {/* Win Rate */}
                <td>
                  <span className={`font-semibold ${getWinRateColor(player.winRate)}`}>
                    {formatPercentage(player.winRate)}
                  </span>
                </td>

                {/* K/D */}
                <td>
                  <span className={`font-semibold ${getKDColor(player.kd)}`}>
                    {formatStat(player.kd)}
                  </span>
                </td>

               

                {/* HS% */}
                <td className="hidden xl:table-cell">
                  <span className="font-semibold">
                    {formatStat(player.headshotPercentage, 1)}%
                  </span>
                </td>

                
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}