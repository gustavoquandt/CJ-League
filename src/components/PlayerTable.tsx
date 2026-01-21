'use client';

import Image from 'next/image';
import type { PlayerStats } from '@/types/app.types';
import { POT_CONFIG } from '@/config/constants';
import {
  formatPosition,
  formatStat,
  formatPercentage,
  getKDColor,
  getWinRateColor,
  getADRColor,
} from '@/utils/stats.utils';

interface PlayerTableProps {
  players: PlayerStats[];
}

export default function PlayerTable({ players }: PlayerTableProps) {
  return (
    <div className="table-container animate-fade-in">
      <table className="table">
        <thead>
          <tr>
            <th className="sticky left-0 bg-faceit-darker z-10">Pos</th>
            <th>Jogador</th>
            <th className="hidden md:table-cell">Pote</th>
            <th>Pontos</th>
            <th className="hidden lg:table-cell">Partidas</th>
            <th>Win Rate</th>
            <th>K/D</th>
            <th className="hidden lg:table-cell">ADR</th>
            <th className="hidden xl:table-cell">HS%</th>
            <th className="hidden xl:table-cell">ELO</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => {
            const potConfig = POT_CONFIG.find((p) => p.pot === player.pot);
            
            return (
              <tr key={player.playerId}>
                {/* Position */}
                <td className="sticky left-0 bg-faceit-gray z-10">
                  <div className="flex items-center gap-2">
                    {index < 3 ? (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
                        }}
                      >
                        {index + 1}
                      </div>
                    ) : (
                      <span className="text-text-secondary font-semibold">
                        {formatPosition(player.position)}
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
                  {potConfig && (
                    <span
                      className={`badge badge-pot-${player.pot}`}
                      style={{ background: potConfig.color }}
                    >
                      {player.pot}
                    </span>
                  )}
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

                {/* ADR */}
                <td className="hidden lg:table-cell">
                  <span className={`font-semibold ${getADRColor(player.adr)}`}>
                    {formatStat(player.adr, 1)}
                  </span>
                </td>

                {/* HS% */}
                <td className="hidden xl:table-cell">
                  <span className="font-semibold">
                    {formatStat(player.headshotPercentage, 1)}%
                  </span>
                </td>

                {/* ELO */}
                <td className="hidden xl:table-cell">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `rgba(255, 85, 0, ${player.skillLevel / 10})`,
                      }}
                    >
                      {player.skillLevel}
                    </div>
                    <span className="text-sm">{player.faceitElo}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
