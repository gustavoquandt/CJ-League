'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { PlayerStats } from '@/types/app.types';
import {
  formatStat,
  formatPercentage,
  getKDColor,
  getWinRateColor,
  getADRColor,
  getRatingColor,
} from '@/utils/stats.utils';

const PRIZE_KNIVES: Record<number, { name: string; image: string }> = {
  1: { name: 'Huntsman Knife | Lore', image: '/knives/1st.png' },
  2: { name: 'Paracord Knife | Stained', image: '/knives/2nd.png' },
  3: { name: 'Shadow Daggers | Rust Coat', image: '/knives/3rd.png' },
};

interface PlayerCardProps {
  player: PlayerStats;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const prize = player.position ? PRIZE_KNIVES[player.position] : null;

  return (
    <Link href={`/player/${player.playerId}`} className="block">
    <div className="card animate-fade-in hover:border-[#0EA5E9] transition-colors cursor-pointer relative overflow-visible">
      {/* Prize knife bubble */}
      {prize && (
        <div className="group/knife absolute -top-5 -left-5 z-10">
          <div className="w-14 h-14 rounded-full bg-[#13131A] border-2 border-[#0EA5E9] flex items-center justify-center shadow-lg shadow-[#0EA5E9]/20 transition-transform group-hover/knife:scale-110">
            <Image
              src={prize.image}
              alt={prize.name}
              width={36}
              height={36}
              className="object-contain drop-shadow-md"
              unoptimized
            />
          </div>
          {/* Hover tooltip */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover/knife:opacity-100 transition-opacity duration-200">
            <div className="bg-[#13131A] border border-[#0EA5E9] rounded-xl p-3 flex flex-col items-center gap-2 shadow-xl shadow-[#0EA5E9]/10 whitespace-nowrap">
              <Image
                src={prize.image}
                alt={prize.name}
                width={120}
                height={90}
                className="object-contain drop-shadow-lg"
                unoptimized
              />
              <span className="text-xs font-semibold text-[#0EA5E9]">{prize.name}</span>
              <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">
                {player.position === 1 ? '1º Lugar' : player.position === 2 ? '2º Lugar' : '3º Lugar'}
              </span>
            </div>
          </div>
        </div>
      )}
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
                unoptimized
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#13131A] border-2 border-[#0EA5E9] flex items-center justify-center text-2xl font-bold text-[#0EA5E9]">
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
        <div className="bg-[#13131A] rounded-xl p-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Pontos</p>
          <p className="text-2xl font-bold text-[#FF6B35]">
            {player.rankingPoints}
          </p>
        </div>

        {/* ADR */}
        <div className="bg-[#13131A] rounded-xl p-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">ADR</p>
          <p className={`text-2xl font-bold ${getADRColor(player.adr)}`}>
            {formatStat(player.adr, 1)}
          </p>
        </div>

        {/* K/D */}
        <div className="bg-[#13131A] rounded-xl p-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">K/D Ratio</p>
          <p className={`text-2xl font-bold ${getKDColor(player.kd)}`}>
            {formatStat(player.kd)}
          </p>
        </div>

        {/* HS% */}
        <div className="bg-[#13131A] rounded-xl p-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">HS%</p>
          <p className="text-2xl font-bold">
            {formatStat(player.headshotPercentage, 1)}%
          </p>
        </div>
      </div>

      {/* Biggest rival */}
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
      <div className="border-t border-[#2D2D3D] my-3"></div>

      {/* Rating, Win Rate e Partidas */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-[#13131A] rounded-xl p-3 flex flex-col">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Rating</p>
          <p className={`text-lg font-bold flex-1 flex items-center justify-center ${player.rating ? getRatingColor(player.rating) : ''}`}>
            {player.rating ? player.rating.toFixed(2) : '—'}
          </p>
        </div>

        <div className="bg-[#13131A] rounded-xl p-3 flex flex-col">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Win Rate</p>
          <p className={`text-lg font-bold ${getWinRateColor(player.winRate)}`}>
            {formatPercentage(player.winRate)}
          </p>
          <p className="text-[10px] text-[#6B7280] mt-0.5">
            {player.wins}W / {player.losses}L
          </p>
        </div>

        <div className="bg-[#13131A] rounded-xl p-3 flex flex-col">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Partidas</p>
          <p className="text-lg font-bold flex-1 flex items-center justify-center">{player.matchesPlayed}</p>
        </div>
      </div>
    </div>
    </Link>
  );
}