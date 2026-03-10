'use client';

import Image from 'next/image';
import type { PlayerStats } from '@/types/app.types';
import {
  formatStat,
  formatPercentage,
  getKDColor,
  getWinRateColor,
  getADRColor,
  getRatingColor,
} from '@/utils/stats.utils';

interface PlayerCardProps {
  player: PlayerStats;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  // 🔍 DEBUG - Remove depois de confirmar que funciona
  console.log('🎯 PlayerCard Rival Debug:', {
    nickname: player.nickname,
    rivalNickname: player.rivalNickname,
    rivalMatchCount: player.rivalMatchCount,
    rivalWins: player.rivalWins,
    rivalLosses: player.rivalLosses,
    shouldShowRival: !!(player.rivalNickname && player.rivalMatchCount && player.rivalMatchCount > 2),
  });

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
                className="rounded-full border-2 border-[#0EA5E9]"
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
              #{player.position}
            </p>
          </div>
        </div>

        {/* Pote Badge */}
        <span className={`badge badge-pot-${player.pot} text-sm leading-none inline-flex items-center`}>
          Pote {player.pot}
        </span>
      </div>

      {/* Stats Principais - Grid 2x2 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Pontos */}
        <div className="bg-faceit-darker rounded-lg p-3">
          <p className="text-xs text-text-secondary mb-1">Pontos</p>
          <p className="text-2xl font-bold text-[#FF6B35]">
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
          <p className="text-2xl font-bold">
            {formatStat(player.headshotPercentage, 1)}%
          </p>
        </div>
      </div>

      {/* ✅ NOVO: Maior Rival */}
      {player.rivalNickname && player.rivalMatchCount && player.rivalMatchCount > 2 && (
        <div className="mb-3 px-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">🎯 Rival:</span>
              <span className="text-sm font-semibold text-[#0EA5E9]">
                {player.rivalNickname}
              </span>
            </div>
            <div className="text-sm font-bold flex items-center gap-1">
              <span className="text-[#10B981]">{player.rivalWins}W</span>
              <span className="text-[#e31e24]">{player.rivalLosses}L</span>
            </div>
          </div>
        </div>
      )}

      {/* Separator */}
      <div className="border-t border-faceit-dark-lighter my-3"></div>

      {/* Rating, Win Rate e Partidas */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-text-secondary mb-1">Rating</p>
          <p className={`text-lg font-bold ${player.rating ? getRatingColor(player.rating) : ''}`}>
            {player.rating ? player.rating.toFixed(2) : '—'}
          </p>
          <p className="text-xs text-text-secondary mt-1">&nbsp;</p>
        </div>

        <div>
          <p className="text-xs text-text-secondary mb-1">Win Rate</p>
          <p className={`text-lg font-bold ${getWinRateColor(player.winRate)}`}>
            {formatPercentage(player.winRate)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {player.wins}W / {player.losses}L
          </p>
        </div>

        <div>
          <p className="text-xs text-text-secondary mb-1">Partidas</p>
          <p className="text-lg font-bold">{player.matchesPlayed}</p>
          <p className="text-xs text-text-secondary mt-1">jogadas</p>
        </div>
      </div>
    </div>
  );
}