'use client';

import Image from 'next/image';
import type { PlayerStats } from '@/types/app.types';
import {
  formatPosition,
  formatStat,
  formatPercentage,
  getKDColor,
  getWinRateColor,
  getADRColor,
} from '@/utils/stats.utils';

interface PlayerCardProps {
  player: PlayerStats;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  return (
    <div className="card animate-fade-in">
      {/* Header com Avatar, Nome e Pote */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            {player.avatar ? (
              <Image
                src={player.avatar}
                alt={player.nickname}
                width={56}
                height={56}
                className="rounded-full border-2 border-faceit-orange"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-faceit-light-gray flex items-center justify-center text-2xl font-bold">
                {player.nickname.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Nome e Posição */}
          <div>
            <h3 className="text-lg font-bold">{player.nickname}</h3>
            <p className="text-sm text-text-secondary">
              {formatPosition(player.position)} lugar
            </p>
          </div>
        </div>

        {/* Pote Badge no topo direito */}
        <span className={`badge badge-pot-${player.pot} text-sm`}>
          Pote {player.pot}
        </span>
      </div>

      {/* Stats Principais - Grid 2x2 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Pontos */}
        <div className="bg-faceit-darker rounded-lg p-3">
          <p className="text-xs text-text-secondary mb-1">Pontos</p>
          <p className="text-2xl font-bold text-faceit-orange">
            {player.rankingPoints}
          </p>
        </div>

        {/* ADR */}
        <div className="bg-faceit-darker rounded-lg p-3">
          <p className="text-xs text-text-secondary mb-1">ADR</p>
          <p className={`text-2xl font-bold ${getADRColor(player.adr)}`}>
            {formatStat(player.adr, 1)}
          </p>
        </div>

        {/* K/D */}
        <div className="bg-faceit-darker rounded-lg p-3">
          <p className="text-xs text-text-secondary mb-1">K/D Ratio</p>
          <p className={`text-2xl font-bold ${getKDColor(player.kd)}`}>
            {formatStat(player.kd)}
          </p>
        </div>

        {/* HS% */}
        <div className="bg-faceit-darker rounded-lg p-3">
          <p className="text-xs text-text-secondary mb-1">HS%</p>
          <p className="text-2xl font-bold text-white">
            {formatStat(player.headshotPercentage, 1)}%
          </p>
        </div>
      </div>

      {/* Subtexto com Win Rate e Partidas */}
      <div className="pt-3 border-t border-faceit-light-gray">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-text-secondary">Win Rate: </span>
            <span className={`font-semibold ${getWinRateColor(player.winRate)}`}>
              {formatPercentage(player.winRate)}
            </span>
            <span className="text-text-secondary"> ({player.wins}W / {player.losses}L)</span>
          </div>
          <span className="text-text-secondary">{player.matchesPlayed} partidas</span>
        </div>
      </div>
    </div>
  );
}