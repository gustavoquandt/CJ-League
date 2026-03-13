'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
  PieChart, Pie, Cell, Label,
  BarChart, Bar,
} from 'recharts';
import { getMockPlayerById, mockPlayers } from '@/mocks/players';
import { getRatingColor, getKDColor, getADRColor, getWinRateColor } from '@/utils/stats.utils';
import type { PlayerStats } from '@/types/app.types';

interface PlayerPageProps {
  params: Promise<{ id: string }>;
}

// ── Animation helper ──────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const, delay },
});

// ── Color helpers ─────────────────────────────────────────────────────────────

function getClutchRateColor(v: number) {
  if (v >= 45) return 'text-[#10B981]';
  if (v >= 35) return 'text-[#0EA5E9]';
  if (v >= 25) return 'text-[#F59E0B]';
  return 'text-[#e31e24]';
}

// ── Pot accent colors ─────────────────────────────────────────────────────────
const POT_ACCENT: Record<number, string> = {
  1: '#FCA5A5', 2: '#D8B4FE', 3: '#86EFAC', 4: '#FDBA74', 5: '#FDE68A',
};

// ── Chart tooltips ────────────────────────────────────────────────────────────
function RatingTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#13131A] border border-[#2D2D3D] rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-[#9CA3AF] mb-1">Partida {d.match}</p>
      <p className={`font-bold text-sm ${getRatingColor(d.rating)}`}>{d.rating.toFixed(2)}</p>
      <p className={d.won ? 'text-[#10B981]' : 'text-[#e31e24]'}>{d.won ? '✓ Vitória' : '✗ Derrota'}</p>
    </div>
  );
}

function ADRTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#13131A] border border-[#2D2D3D] rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-[#9CA3AF] mb-1">Partida {d.match}</p>
      <p className="font-bold text-sm text-white">ADR: {d.adr}</p>
      <p className={d.aboveAvg ? 'text-[#10B981]' : 'text-[#e31e24]'}>{d.aboveAvg ? '▲ Acima da média' : '▼ Abaixo da média'}</p>
    </div>
  );
}

const RatingDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  return (
    <circle cx={cx} cy={cy} r={4}
      fill={payload.won ? '#10B981' : '#e31e24'}
      stroke="#0A0A0F" strokeWidth={1.5}
    />
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────
function StatBox({ label, value, sub, colorClass }: {
  label: string; value: string | number; sub?: string; colorClass?: string;
}) {
  return (
    <div className="flex flex-col items-center bg-[#13131A] rounded-xl p-4 gap-1">
      <span className="text-xs text-[#9CA3AF] uppercase tracking-widest">{label}</span>
      <span className={`text-2xl font-bold ${colorClass ?? 'text-white'}`}>{value}</span>
      {sub && <span className="text-[10px] text-[#9CA3AF] text-center leading-tight">{sub}</span>}
    </div>
  );
}

function StatTile({ label, value, colorClass, barPct, barColor, size = 'md', sub }: {
  label: string; value: string | number; colorClass?: string;
  barPct?: number; barColor?: string; size?: 'lg' | 'md' | 'sm'; sub?: string;
}) {
  return (
    <div className="bg-[#13131A] rounded-xl p-4 flex flex-col gap-0.5">
      <span className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-0.5">{label}</span>
      <span className={`font-bold leading-none ${
        size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl'
      } ${colorClass ?? 'text-white'}`}>
        {value}
      </span>
      {sub && <span className="text-[10px] text-[#6B7280] mt-0.5">{sub}</span>}
      {barPct !== undefined && (
        <div className="mt-2.5 w-full bg-[#2D2D3D] rounded-full h-1 overflow-hidden">
          <div style={{
            width: `${Math.min(100, Math.max(0, barPct))}%`, height: '100%',
            borderRadius: '9999px', backgroundColor: barColor ?? '#0EA5E9',
          }} />
        </div>
      )}
    </div>
  );
}

function RecentForm({ results }: { results: boolean[] }) {
  return (
    <div className="flex gap-1.5">
      {[...results.slice(0, 8)].reverse().map((won, i) => (
        <div key={i} title={won ? 'Vitória' : 'Derrota'}
          className={`w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold ${
            won ? 'bg-[#10B981] text-black' : 'bg-[#e31e24] text-white'
          }`}>
          {won ? 'W' : 'L'}
        </div>
      ))}
    </div>
  );
}


function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1F1F2E] border border-[#2D2D3D] rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-4">{children}</h2>;
}


// ── Player switcher dropdown ──────────────────────────────────────────────────
function PlayerSwitcher({ current, players }: { current: PlayerStats; players: PlayerStats[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sorted = [...players]
    .filter(p => p.playerId !== current.playerId)
    .sort((a, b) => (a.pot ?? 99) - (b.pot ?? 99) || (a.position ?? 99) - (b.position ?? 99));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1F1F2E] border border-[#2D2D3D] text-[#9CA3AF] hover:text-white hover:border-[#0EA5E9] transition-colors text-sm"
        title="Trocar jogador"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-52 bg-[#13131A] border border-[#2D2D3D] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {sorted.map(p => (
              <button
                key={p.playerId}
                onClick={() => { setOpen(false); router.push(`/player/${p.nickname}`); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1F1F2E] transition-colors text-left"
              >
                {p.avatar ? (
                  <Image src={p.avatar} alt={p.nickname} width={28} height={28} className="rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#2D2D3D] flex items-center justify-center text-xs font-bold text-[#9CA3AF] flex-shrink-0">
                    {p.nickname.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-[#E5E7EB] truncate flex-1">{p.nickname}</span>
                {p.pot && (
                  <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">P{p.pot}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlayerPage({ params }: PlayerPageProps) {
  const { id } = use(params);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [compareSort, setCompareSort] = useState<'pot' | 'alpha'>('pot');
  const [player, setPlayer] = useState<PlayerStats | undefined>(
    process.env.NODE_ENV === 'development' ? getMockPlayerById(id) : undefined
  );
  const [allPlayers, setAllPlayers] = useState<PlayerStats[]>(
    process.env.NODE_ENV === 'development' ? mockPlayers : []
  );
  const [loading, setLoading] = useState(
    process.env.NODE_ENV !== 'development'
  );

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;
    fetch(`/api/faceit/hub-stats?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setAllPlayers(data.data);
          const found: PlayerStats | undefined = data.data.find(
            (p: PlayerStats) =>
              p.playerId === id ||
              p.nickname.toLowerCase() === id.toLowerCase()
          );
          setPlayer(found);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
        <div className="w-8 h-8 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0A0A0F]">
        <p className="text-[#9CA3AF] text-lg">Jogador não encontrado.</p>
        <Link href="/" className="text-[#0EA5E9] hover:underline text-sm">← Voltar ao ranking</Link>
      </div>
    );
  }

  // ── Chart data ──────────────────────────────────────────────────────────────
  const allRatings = [...(player.matchRatings ?? [])].slice(0, 50).reverse();
  const allResults = [...(player.matchResults ?? [])].slice(0, 50).reverse();
  const ratingChartData = allRatings.map((rating, i) => ({
    match: i + 1, rating, won: allResults[i] ?? false,
  }));

  const adrChartData = [...(player.matchADRs ?? [])]
    .slice(0, 15)
    .reverse()
    .map((adr, i) => ({ match: i + 1, adr: Math.round(adr), aboveAvg: adr >= player.adr }));

  const clutchBreakdown = [
    { label: '1v1', wins: player.clutch1v1 ?? 0, attempts: player.clutch1v1Attempts ?? 0, color: '#10B981', hard: false },
    { label: '1v2', wins: player.clutch1v2 ?? 0, attempts: player.clutch1v2Attempts ?? 0, color: '#0EA5E9', hard: false },
    { label: '1v3', wins: player.clutch1v3 ?? 0, attempts: player.clutch1v3Attempts ?? 0, color: '#F59E0B', hard: false },
    { label: '1v4', wins: player.clutch1v4 ?? 0, attempts: player.clutch1v4Attempts ?? 0, color: '#F97316', hard: true  },
    { label: '1v5', wins: player.clutch1v5 ?? 0, attempts: player.clutch1v5Attempts ?? 0, color: '#e31e24', hard: true  },
  ];

  // ── Comparação ──────────────────────────────────────────────────────────────
  const comparePlayer = compareId ? allPlayers.find(p => p.playerId === compareId) : null;

  // ── Ranking no pote ──────────────────────────────────────────────────────────
  const allSamePot = allPlayers.filter(p => p.pot === player.pot);
  const potRank = (fn: (p: PlayerStats) => number) => {
    const sorted = [...allSamePot].sort((a, b) => fn(b) - fn(a));
    return sorted.findIndex(p => p.playerId === player.playerId) + 1;
  };
  const potAvg = (fn: (p: PlayerStats) => number) =>
    allSamePot.reduce((s, p) => s + fn(p), 0) / allSamePot.length;
  const potStats = [
    { label: 'Rating',   rank: potRank(p => p.rating ?? 0), value: player.rating ?? 0,       avg: potAvg(p => p.rating ?? 0),   fmt: (v: number) => v.toFixed(2) },
    { label: 'K/D',      rank: potRank(p => p.kd),          value: player.kd,                avg: potAvg(p => p.kd),             fmt: (v: number) => v.toFixed(2) },
    { label: 'ADR',      rank: potRank(p => p.adr),         value: player.adr,               avg: potAvg(p => p.adr),            fmt: (v: number) => v.toFixed(1) },
    { label: 'Win Rate', rank: potRank(p => p.winRate),     value: player.winRate,           avg: potAvg(p => p.winRate),        fmt: (v: number) => `${v.toFixed(1)}%` },
  ];

  const wlData = [
    { name: 'Vitórias', value: player.wins },
    { name: 'Derrotas', value: player.losses },
  ];

  // ── Derived values ──────────────────────────────────────────────────────────
  const accentColor = POT_ACCENT[player.pot ?? 0] ?? '#0EA5E9';
  const winPct = player.winRate;
  const lossPct = 100 - winPct;

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-[#E5E7EB]">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div
        className="relative bg-gradient-to-b from-[#0EA5E9]/8 to-transparent border-b border-[#2D2D3D]"
        style={{ borderTop: `3px solid ${accentColor}` }}
      >
        <div className="max-w-5xl mx-auto px-6 py-10">
          <Link href="/" className="text-xs text-[#9CA3AF] hover:text-[#0EA5E9] transition-colors mb-6 inline-block">
            ← Ranking
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {player.avatar ? (
                <Image src={player.avatar} alt={player.nickname} width={96} height={96}
                  className="rounded-full border-4 border-[#0EA5E9]" />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-[#0EA5E9] bg-[#1F1F2E] flex items-center justify-center text-4xl font-bold text-[#0EA5E9]">
                  {player.nickname.charAt(0).toUpperCase()}
                </div>
              )}

            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold truncate">{player.nickname}</h1>
                {allPlayers.length > 1 && (
                  <PlayerSwitcher current={player} players={allPlayers} />
                )}
                {player.pot && (
                  <span className={`badge badge-pot-${player.pot} text-sm leading-none inline-flex items-center`}>
                    Pote {player.pot}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-[#1F1F2E] text-xs text-[#9CA3AF] border border-[#2D2D3D]">
                  #{player.position} no ranking
                </span>
              </div>


              {player.matchResults && player.matchResults.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#9CA3AF]">Forma recente</span>
                  <RecentForm results={player.matchResults} />
                </div>
              )}
            </div>

            {/* Rating card */}
            {player.rating && (
              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-[#1F1F2E] border border-[#2D2D3D] rounded-2xl px-8 py-4 gap-1">
                <span className="text-xs text-[#9CA3AF] uppercase tracking-widest">Rating</span>
                <span className={`text-5xl font-bold ${getRatingColor(player.rating)}`}>
                  {player.rating.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT COLUMN (2/3) ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Quick stats */}
          <motion.div {...fadeUp(0)} className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <StatBox label="K/D" value={player.kd.toFixed(2)} colorClass={getKDColor(player.kd)} />
            <StatBox label="ADR" value={player.adr.toFixed(1)} colorClass={getADRColor(player.adr)} />
            <StatBox label="HS%" value={`${player.headshotPercentage.toFixed(1)}%`} />
            <StatBox label="Win Rate" value={`${player.winRate.toFixed(1)}%`}
              sub={`${player.wins}W / ${player.losses}L`} colorClass={getWinRateColor(player.winRate)} />
          
            <StatBox
              label="Aces"
              value={player.pentaKills ?? 0}
              colorClass={(player.pentaKills ?? 0) > 0 ? 'text-[#e31e24]' : undefined}
              sub={(player.pentaKills ?? 0) > 0 && player.matchesPlayed > 0
                ? `1/${(player.matchesPlayed / player.pentaKills!).toFixed(0)}p`
                : undefined}
            />
            <StatBox
              label="Knife Kills"
              value={player.totalKnifeKills ?? 0}
              colorClass={(player.totalKnifeKills ?? 0) > 0 ? 'text-[#F59E0B]' : undefined}
              sub={(player.totalKnifeKills ?? 0) > 0
                ? `1/${(player.matchesPlayed / player.totalKnifeKills!).toFixed(0)}p`
                : undefined}
            />
          </motion.div>

          {/* Rating Trend */}
          {ratingChartData.length > 0 && (
            <motion.div {...fadeUp(0.05)}>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <SectionTitle>Rating por Partida</SectionTitle>
                  <span className="text-xs text-[#9CA3AF]">Últimas {ratingChartData.length} partidas</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={ratingChartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0EA5E9" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D2D3D" vertical={false} />
                    <XAxis dataKey="match" tick={{ fill: '#6B7280', fontSize: 11 }}
                      tickLine={false} axisLine={false} />
                    <YAxis domain={[0.5, 1.8]} tick={{ fill: '#6B7280', fontSize: 11 }}
                      tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(1)} />
                    <Tooltip content={<RatingTooltip />} cursor={{ stroke: '#2D2D3D' }} />
                    <ReferenceLine y={1.0} stroke="#6B7280" strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="rating" stroke="#0EA5E9" strokeWidth={2}
                      fill="url(#ratingGrad)" dot={<RatingDot />} activeDot={{ r: 6, fill: '#0EA5E9' }} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-3 text-xs text-[#9CA3AF]">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block" /> Vitória</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#e31e24] inline-block" /> Derrota</span>
                  <span className="flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-[#6B7280] inline-block" /> Média (1.00)</span>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Clutch */}
          {player.clutchAttempts != null && (
            <motion.div {...fadeUp(0.17)}>
              <Card>
                <SectionTitle>Clutch</SectionTitle>
                <div className="flex flex-col gap-3">
                  {clutchBreakdown.map(({ label, wins, attempts, color, hard }) => {
                    const rate = attempts > 0 ? (wins / attempts) * 100 : 0;
                    return (
                      <div key={label}>
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold" style={{ color }}>{label}</span>
                            {hard && (
                              <span className="text-[9px] font-bold px-1 py-0.5 rounded"
                                style={{ backgroundColor: `${color}22`, color }}>HARD</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#6B7280]">{wins}/{attempts}</span>
                            <span className="text-sm font-bold w-10 text-right"
                              style={{ color: rate === 0 ? '#6B7280' : color }}>
                              {rate.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-[#2D2D3D] rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-[#2D2D3D] flex justify-between items-center">
                  <span className="text-xs text-[#9CA3AF]">Total</span>
                  <span className="text-sm font-bold">
                    {player.clutchWins}/{player.clutchAttempts}
                    <span className={`ml-2 ${getClutchRateColor(player.clutchRate ?? 0)}`}>
                      ({player.clutchRate?.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Season Performance */}
          <motion.div {...fadeUp(0.21)}>
            <Card>
              <SectionTitle>Desempenho na Season</SectionTitle>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Pontos</p>
                  <p className="text-3xl font-bold text-[#FF6B35]">{player.rankingPoints}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Partidas</p>
                  <p className="text-3xl font-bold">{player.matchesPlayed}</p>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs text-[#9CA3AF] mb-1">
                  <span>{player.wins} vitórias</span>
                  <span>{player.losses} derrotas</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  <div className="bg-[#10B981] transition-all" style={{ width: `${winPct}%` }} />
                  <div className="bg-[#e31e24] transition-all" style={{ width: `${lossPct}%` }} />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Detailed stats */}
          <motion.div {...fadeUp(0.25)}>
            <Card>
              <SectionTitle>Estatísticas Detalhadas</SectionTitle>

              <p className="text-[10px] text-[#6B7280] uppercase tracking-widest mb-2">Por Jogo</p>
              <div className="grid grid-cols-3 gap-3 mb-1">
                <StatTile label="Kills / Jogo"   size="sm" value={player.kills.toFixed(1)}   colorClass="text-[#10B981]" />
                <StatTile label="Deaths / Jogo"  size="sm" value={player.deaths.toFixed(1)}  colorClass="text-[#e31e24]" />
                <StatTile label="Assists / Jogo" size="sm" value={player.assists.toFixed(1)} colorClass="text-[#F59E0B]" />
              </div>

              <div className="border-t border-[#2D2D3D] my-4" />

              <p className="text-[10px] text-[#6B7280] uppercase tracking-widest mb-2">Totais na Season</p>
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Kills"        size="sm" value={(player.totalKills   ?? 0).toLocaleString('pt-BR')} colorClass="text-[#10B981]" />
                <StatTile label="Deaths"       size="sm" value={(player.totalDeaths  ?? 0).toLocaleString('pt-BR')} colorClass="text-[#e31e24]" />
                <StatTile label="Headshots"    size="sm" value={(player.totalHeadshots ?? 0).toLocaleString('pt-BR')} />
                <StatTile label="Rounds"       size="sm" value={(player.totalRounds  ?? 0).toLocaleString('pt-BR')} />
                <StatTile label="Dano Total"   size="sm" value={(player.totalDamage  ?? 0).toLocaleString('pt-BR')} />
              </div>

              <div className="border-t border-[#2D2D3D] my-4" />

              <p className="text-[10px] text-[#6B7280] uppercase tracking-widest mb-2">Especialidades</p>
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label="First Kills"
                  size="sm"
                  value={(player.totalFirstKills ?? 0).toLocaleString('pt-BR')}
                  colorClass="text-[#10B981]"
                  sub={player.matchesPlayed > 0 ? `${((player.totalFirstKills ?? 0) / player.matchesPlayed).toFixed(2)}/jogo` : undefined}
                />
                <StatTile
                  label="First Deaths"
                  size="sm"
                  value={(player.totalFirstDeaths ?? 0).toLocaleString('pt-BR')}
                  colorClass="text-[#e31e24]"
                  sub={player.matchesPlayed > 0 ? `${((player.totalFirstDeaths ?? 0) / player.matchesPlayed).toFixed(2)}/jogo` : undefined}
                />
                <StatTile
                  label="Flash Successes"
                  size="sm"
                  value={(player.totalFlashSuccesses ?? 0).toLocaleString('pt-BR')}
                  colorClass="text-[#0EA5E9]"
                  sub={player.matchesPlayed > 0 ? `${((player.totalFlashSuccesses ?? 0) / player.matchesPlayed).toFixed(1)}/jogo` : undefined}
                />
                <StatTile
                  label="Entry Success"
                  size="sm"
                  value={(() => {
                    const fk = player.totalFirstKills ?? 0;
                    const fd = player.totalFirstDeaths ?? 0;
                    return fk + fd > 0 ? `${((fk / (fk + fd)) * 100).toFixed(1)}%` : '—';
                  })()}
                  colorClass={(() => {
                    const fk = player.totalFirstKills ?? 0;
                    const fd = player.totalFirstDeaths ?? 0;
                    const pct = fk + fd > 0 ? (fk / (fk + fd)) * 100 : 0;
                    return pct >= 55 ? 'text-[#10B981]' : pct >= 45 ? 'text-[#F59E0B]' : 'text-[#e31e24]';
                  })()}
                  sub={`${player.totalFirstKills ?? 0}FK / ${player.totalFirstDeaths ?? 0}FD`}
                />
              </div>
            </Card>
          </motion.div>

        </div>

        {/* ── RIGHT COLUMN (1/3) ────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Comparação de jogadores */}
          <motion.div {...fadeUp(0.04)}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>Comparar com</SectionTitle>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg overflow-hidden border border-[#2D2D3D] text-xs">
                    <button
                      onClick={() => setCompareSort('pot')}
                      className={`px-2 py-1 transition-colors ${compareSort === 'pot' ? 'bg-[#0EA5E9] text-white' : 'bg-[#13131A] text-[#9CA3AF] hover:text-white'}`}
                    >
                      Pote
                    </button>
                    <button
                      onClick={() => setCompareSort('alpha')}
                      className={`px-2 py-1 transition-colors ${compareSort === 'alpha' ? 'bg-[#0EA5E9] text-white' : 'bg-[#13131A] text-[#9CA3AF] hover:text-white'}`}
                    >
                      A–Z
                    </button>
                  </div>
                  {comparePlayer && (
                    <button onClick={() => setCompareId(null)}
                      className="text-xs text-[#9CA3AF] hover:text-[#e31e24] transition-colors">
                      ✕ limpar
                    </button>
                  )}
                </div>
              </div>
              <select
                value={compareId ?? ''}
                onChange={(e) => setCompareId(e.target.value || null)}
                className="w-full bg-[#13131A] border border-[#2D2D3D] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0EA5E9] mb-4"
              >
                <option value="">Selecione um jogador...</option>
                {allPlayers
                  .filter(p => p.playerId !== player.playerId)
                  .sort((a, b) => compareSort === 'alpha'
                    ? a.nickname.localeCompare(b.nickname)
                    : (a.pot ?? 99) - (b.pot ?? 99) || (a.position ?? 99) - (b.position ?? 99)
                  )
                  .map(p => (
                    <option key={p.playerId} value={p.playerId}>
                      {p.nickname} — Pote {p.pot} · Rating {p.rating?.toFixed(2)}
                    </option>
                  ))}
              </select>

              {comparePlayer && (() => {
                const rows = [
                  { label: 'Rating',   a: player.rating ?? 0,          b: comparePlayer.rating ?? 0,          fmt: (v: number) => v.toFixed(2) },
                  { label: 'K/D',      a: player.kd,                   b: comparePlayer.kd,                   fmt: (v: number) => v.toFixed(2) },
                  { label: 'ADR',      a: player.adr,                  b: comparePlayer.adr,                  fmt: (v: number) => v.toFixed(1) },
                 
                  { label: 'HS%',      a: player.headshotPercentage,   b: comparePlayer.headshotPercentage,   fmt: (v: number) => `${v.toFixed(1)}%` },
                  { label: 'Win Rate', a: player.winRate,              b: comparePlayer.winRate,              fmt: (v: number) => `${v.toFixed(1)}%` },
                ];
                return (
                  <div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-5">
                      <div>
                        <p className="font-bold text-sm truncate">{player.nickname}</p>
                        <span className={`badge badge-pot-${player.pot} text-xs`}>Pote {player.pot}</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-xs font-bold text-[#6B7280] bg-[#13131A] rounded px-2 py-0.5">VS</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm truncate">{comparePlayer.nickname}</p>
                        <span className={`badge badge-pot-${comparePlayer.pot} text-xs`}>Pote {comparePlayer.pot}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      {rows.map(({ label, a, b, fmt }) => {
                        const max = Math.max(a, b, 0.001);
                        const pctA = (a / max) * 100;
                        const pctB = (b / max) * 100;
                        const aWins = a >= b;
                        return (
                          <div key={label}>
                            <p className="text-[10px] text-[#6B7280] uppercase tracking-wider text-center mb-1">{label}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold w-12 text-right tabular-nums ${aWins ? 'text-white' : 'text-[#6B7280]'}`}>{fmt(a)}</span>
                              <div className="flex-1 flex items-center h-3 gap-px">
                                <div className="flex-1 flex justify-end h-full">
                                  <div className="h-full rounded-l-full transition-all duration-500"
                                    style={{ width: `${pctA}%`, backgroundColor: aWins ? '#FF5500' : '#7C2D12' }} />
                                </div>
                                <div className="w-px h-4 bg-[#2D2D3D]" />
                                <div className="flex-1 h-full">
                                  <div className="h-full rounded-r-full transition-all duration-500"
                                    style={{ width: `${pctB}%`, backgroundColor: !aWins ? '#0EA5E9' : '#164E63' }} />
                                </div>
                              </div>
                              <span className={`text-sm font-bold w-12 tabular-nums ${!aWins ? 'text-white' : 'text-[#6B7280]'}`}>{fmt(b)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </Card>
          </motion.div>

          {/* Ranking no Pote — com números absolutos */}
          {allSamePot.length > 1 && (
            <motion.div {...fadeUp(0.06)}>
              <Card>
                <div className="mb-3">
                  <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">Pote {player.pot}</h2>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{allSamePot.length} jogadores</p>
                </div>
                <div className="grid grid-cols-4 text-[9px] text-[#6B7280] uppercase tracking-widest mb-1 px-0.5">
                  <span></span>
                  <span className="text-right">Valor</span>
                  <span className="text-right">Média</span>
                  <span className="text-right">Rank</span>
                </div>
                {potStats.map(({ label, rank, value, avg, fmt }) => (
                  <div key={label} className="grid grid-cols-4 items-center py-2 border-t border-[#2D2D3D] first:border-0 px-0.5">
                    <span className="text-xs text-[#9CA3AF]">{label}</span>
                    <span className="text-sm font-bold text-right text-white tabular-nums">{fmt(value)}</span>
                    <span className="text-xs text-right text-[#6B7280] tabular-nums">{fmt(avg)}</span>
                    <span className={`text-sm font-bold text-right tabular-nums ${
                      rank === 1 ? 'text-[#F59E0B]' : rank === 2 ? 'text-[#9CA3AF]' : 'text-white'
                    }`}>
                      #{rank}
                    </span>
                  </div>
                ))}
              </Card>
            </motion.div>
          )}

          {/* ADR chart */}
          {adrChartData.length > 0 && (
            <motion.div {...fadeUp(0.08)}>
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest">ADR por Partida</h2>
                  <span className="text-xs text-[#9CA3AF]">Média: {player.adr.toFixed(1)}</span>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={adrChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D2D3D" vertical={false} />
                    <XAxis dataKey="match" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 160]} tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ADRTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <ReferenceLine y={player.adr} stroke="#6B7280" strokeDasharray="4 4" />
                    <Bar dataKey="adr" radius={[3, 3, 0, 0]}>
                      {adrChartData.map((d, i) => (
                        <Cell key={i} fill={d.aboveAvg ? '#0EA5E9' : '#374151'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          )}

          {/* W/L Donut */}
          <motion.div {...fadeUp(0.14)}>
            <Card>
              <SectionTitle>Vitórias & Derrotas</SectionTitle>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <PieChart width={120} height={120}>
                    <Pie data={wlData} cx={55} cy={55} innerRadius={38} outerRadius={54}
                      startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
                      <Cell fill="#10B981" />
                      <Cell fill="#e31e24" />
                      <Label
                        content={({ viewBox }: any) => {
                          const { cx, cy } = viewBox;
                          return (
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan fill="white" fontSize={18} fontWeight="bold">
                                {player.winRate.toFixed(0)}%
                              </tspan>
                            </text>
                          );
                        }}
                      />
                    </Pie>
                  </PieChart>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-sm text-[#9CA3AF]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block" />
                      Vitórias
                    </span>
                    <span className="font-bold text-[#10B981]">{player.wins}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-sm text-[#9CA3AF]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#e31e24] inline-block" />
                      Derrotas
                    </span>
                    <span className="font-bold text-[#e31e24]">{player.losses}</span>
                  </div>
                  <div className="border-t border-[#2D2D3D] pt-2 flex justify-between items-center">
                    <span className="text-sm text-[#9CA3AF]">Total</span>
                    <span className="font-bold">{player.matchesPlayed}</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Sequência */}
          <motion.div {...fadeUp(0.17)}>
            <Card>
              <SectionTitle>Sequência</SectionTitle>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Sequência atual</p>
                  <p className={`text-2xl font-bold ${
                    (player.currentStreak ?? 0) > 0 ? 'text-[#10B981]' :
                    (player.currentStreak ?? 0) < 0 ? 'text-[#e31e24]' : 'text-white'
                  }`}>
                    {(player.currentStreak ?? 0) > 0
                      ? `+${player.currentStreak} vitórias`
                      : (player.currentStreak ?? 0) < 0
                      ? `${Math.abs(player.currentStreak ?? 0)} derrotas`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Maior sequência de vitórias</p>
                  <p className="text-2xl font-bold text-[#0EA5E9]">{player.longestWinStreak}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Maior Rival */}
          {player.rivalNickname && (player.rivalMatchCount ?? 0) > 2 && (
            <motion.div {...fadeUp(0.20)}>
              <Card>
                <SectionTitle>Maior Rival</SectionTitle>
                <p className="text-lg font-bold text-[#0EA5E9] mb-3">{player.rivalNickname}</p>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div>
                    <p className="text-xs text-[#9CA3AF]">Partidas</p>
                    <p className="text-xl font-bold">{player.rivalMatchCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9CA3AF]">Vitórias</p>
                    <p className="text-xl font-bold text-[#10B981]">{player.rivalWins}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9CA3AF]">Derrotas</p>
                    <p className="text-xl font-bold text-[#e31e24]">{player.rivalLosses}</p>
                  </div>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
                  <div className="bg-[#10B981]"
                    style={{ width: `${((player.rivalWins ?? 0) / (player.rivalMatchCount ?? 1)) * 100}%` }} />
                  <div className="bg-[#e31e24]"
                    style={{ width: `${((player.rivalLosses ?? 0) / (player.rivalMatchCount ?? 1)) * 100}%` }} />
                </div>
              </Card>
            </motion.div>
          )}

          {/* Amuleto */}
          {player.amuletoNickname && (player.amuletoMatchCount ?? 0) > 2 && (
            <motion.div {...fadeUp(0.23)}>
              <Card>
                <SectionTitle>Amuleto</SectionTitle>
                <p className="text-lg font-bold text-[#10B981] mb-3">{player.amuletoNickname}</p>
                <div className="grid grid-cols-2 gap-2 text-center mb-3">
                  <div>
                    <p className="text-xs text-[#9CA3AF]">Partidas juntos</p>
                    <p className="text-xl font-bold">{player.amuletoMatchCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9CA3AF]">Win Rate</p>
                    <p className="text-xl font-bold text-[#10B981]">{player.amuletoWinRate?.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="w-full bg-[#2D2D3D] rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-[#10B981]"
                    style={{ width: `${player.amuletoWinRate ?? 0}%` }} />
                </div>
              </Card>
            </motion.div>
          )}

          {/* Kriptonita */}
          {player.kriptoniaNickname && (player.kritoniaMatchCount ?? 0) > 2 && (
            <motion.div {...fadeUp(0.26)}>
              <Card>
                <SectionTitle>Kriptonita</SectionTitle>
                <p className="text-lg font-bold text-[#e31e24] mb-3">{player.kriptoniaNickname}</p>
                <div className="grid grid-cols-2 gap-2 text-center mb-3">
                  <div>
                    <p className="text-xs text-[#9CA3AF]">Partidas juntos</p>
                    <p className="text-xl font-bold">{player.kritoniaMatchCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9CA3AF]">Win Rate</p>
                    <p className="text-xl font-bold text-[#e31e24]">{player.kritoniaWinRate?.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="w-full bg-[#2D2D3D] rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-[#e31e24]"
                    style={{ width: `${player.kritoniaWinRate ?? 0}%` }} />
                </div>
              </Card>
            </motion.div>
          )}

        </div>
      </div>
    </main>
  );
}
