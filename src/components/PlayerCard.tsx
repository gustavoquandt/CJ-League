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

interface PlayerCardProps {
  player: PlayerStats;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const potConfig = POT_CONFIG.find((p) => p.pot === player.pot);

  return (
    <div className="card animate-fade-in">
      {/* Header */}
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

          {/* Name and Position */}
          <div>
            <h3 className="text-lg font-bold">{player.nickname}</h3>
            <p className="text-sm text-text-secondary">
              {formatPosition(player.position)} lugar
            </p>
          </div>
        </div>

      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Pontos */}
        <div className="bg-faceit-darker rounded-lg p-3">
          <p className="text-xs text-text-secondary mb-1">Pontos</p>
          <p className="text-2xl font-bold text-faceit-orange">
            {player.rankingPoints}
          </p>
        </div>

        {/* Partidas */}
        <div className="bg-faceit-darker rounded-lg p-3">
          <p className="text-xs text-text-secondary mb-1">Partidas</p>
          <p className="text-2xl font-bold">{player.matchesPlayed}</p>
        </div>

        {/* Win Rate */}
        <div className="bg-faceit-darker rounded-lg p-3">
          <p className="text-xs text-text-secondary mb-1">Win Rate</p>
          <p className={`text-xl font-bold ${getWinRateColor(player.winRate)}`}>
            {formatPercentage(player.winRate)}
          </p>
          <p className="text-xs text-text-secondary">
            {player.wins}W / {player.losses}L
          </p>
        </div>

        {/* K/D */}
        <div className="bg-faceit-darker rounded-lg p-3">
          <p className="text-xs text-text-secondary mb-1">K/D Ratio</p>
          <p className={`text-xl font-bold ${getKDColor(player.kd)}`}>
            {formatStat(player.kd)}
          </p>
        </div>
      </div>

      {/* Advanced Stats */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-faceit-light-gray">
        <div className="text-center">
          <p className="text-xs text-text-secondary mb-1">ADR</p>
          <p className={`text-sm font-semibold ${getADRColor(player.adr)}`}>
            {formatStat(player.adr, 1)}
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-text-secondary mb-1">HS%</p>
          <p className="text-sm font-semibold">
            {formatStat(player.headshotPercentage, 1)}%
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-text-secondary mb-1">POTE</p>
          <div className="font-medium">
            <span className={`badge badge-pot-${player.pot}`}>
              Pote {player.pot}
            </span>
          </div>
        </div>
      </div>

      {/* Streak */}
      {player.currentStreak !== 0 && (
        <div className="mt-3 pt-3 border-t border-faceit-light-gray">
          <div className="flex items-center justify-center gap-2">
            <svg
              className={`w-4 h-4 ${
                player.currentStreak > 0 ? 'text-success' : 'text-danger'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              {player.currentStreak > 0 ? (
                <path
                  fillRule="evenodd"
                  d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              )}
            </svg>
            <span
              className={`text-sm font-semibold ${
                player.currentStreak > 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {Math.abs(player.currentStreak)} {player.currentStreak > 0 ? 'vitórias' : 'derrotas'} seguidas
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
