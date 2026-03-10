// src/utils/rating.utils.ts
// Cálculo de Rating Simplificado baseado em dados da FACEIT

/**
 * Dados necessários para calcular o rating
 */
export interface PlayerRatingData {
  totalKills: number;
  totalDeaths: number;
  totalDamage: number;
  totalRounds: number;
  totalHeadshots: number;
  tripleKills?: number;
  quadroKills?: number;
  pentaKills?: number;
}

/**
 * Calcula um Rating Simplificado baseado em estatísticas disponíveis
 * 
 * Componentes:
 * - KPR (40%): Kills per Round
 * - SPR (25%): Survival per Round (aproximado)
 * - DPR (20%): Damage per Round (ADR)
 * - MKF (10%): Multi-Kill Factor
 * - EFF (5%): Efficiency Factor (K/D + HS%)
 * 
 * @param data Dados do jogador
 * @returns Rating entre 0.0 e ~2.0 (média ~1.0)
 */
export function calculateSimplifiedRating(data: PlayerRatingData): number {
  const { 
    totalKills, 
    totalDeaths, 
    totalDamage, 
    totalRounds, 
    totalHeadshots, 
    tripleKills = 0, 
    quadroKills = 0, 
    pentaKills = 0 
  } = data;

  // Evitar divisão por zero
  if (totalRounds === 0) return 0;

  // 1. KPR (Kills Per Round) - Quanto mais kills por round, melhor
  const kpr = totalKills / totalRounds;

  // 2. DPR (Damage Per Round) = ADR
  const dpr = totalDamage / totalRounds;

  // 3. SPR (Survival Per Round) - Aproximado
  // Assume que cada death = 1 round perdido
  // Limitado a [0, 1] já que pode ter mais deaths que rounds em situações extremas
  const spr = Math.max(0, Math.min(1, (totalRounds - totalDeaths) / totalRounds));

  // 4. Multi-Kill Factor (MKF)
  // Pontos extras por multi-kills
  // Triple = 0.3, Quadro = 0.5, Penta = 1.0 por round
  const mkf = (tripleKills * 0.3 + quadroKills * 0.5 + pentaKills * 1.0) / totalRounds;

  // 5. Efficiency Factor (EFF)
  // Combinação de K/D (limitado a 2.0) e Headshot%
  const kd = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;
  const kdNormalized = Math.min(kd, 2) / 2; // 0-1 range
  const hsPercentage = totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0;
  const hsNormalized = hsPercentage / 100; // 0-1 range
  const eff = kdNormalized * hsNormalized;

  // Fórmula ponderada
  const rawRating = 
    (kpr * 0.40) +        // 40% peso em kills por round
    (spr * 0.25) +        // 25% peso em sobrevivência
    (dpr / 100 * 0.20) +  // 20% peso em dano (normalizado)
    (mkf * 0.10) +        // 10% peso em multi-kills
    (eff * 0.05);         // 5% peso em eficiência

  // Normalizar para ~1.0 sendo médio
  // Este fator pode ser ajustado baseado nos seus dados reais
  const NORMALIZATION_FACTOR = 0.85;
  const normalizedRating = rawRating * NORMALIZATION_FACTOR;

  return parseFloat(normalizedRating.toFixed(2));
}

/**
 * Classificação baseada no rating
 */
export function getRatingTier(rating: number): {
  tier: string;
  color: string;
  emoji: string;
} {
  if (rating >= 1.30) return { tier: 'Elite', color: 'yellow', emoji: '🌟' };
  if (rating >= 1.20) return { tier: 'Excelente', color: 'orange', emoji: '🔥' };
  if (rating >= 1.10) return { tier: 'Muito Bom', color: 'green', emoji: '⭐' };
  if (rating >= 1.00) return { tier: 'Bom', color: 'blue', emoji: '✅' };
  if (rating >= 0.90) return { tier: 'Médio', color: 'gray', emoji: '📊' };
  if (rating >= 0.80) return { tier: 'Abaixo da Média', color: 'orange', emoji: '⚠️' };
  return { tier: 'Precisa Melhorar', color: 'red', emoji: '❌' };
}

/**
 * Cores do Tailwind baseadas no rating
 */
export function getRatingColor(rating: number): string {
  if (rating >= 1.30) return 'text-yellow-400 border-yellow-400 bg-yellow-400/10';
  if (rating >= 1.20) return 'text-orange-400 border-orange-400 bg-orange-400/10';
  if (rating >= 1.10) return 'text-green-400 border-green-400 bg-green-400/10';
  if (rating >= 1.00) return 'text-blue-400 border-blue-400 bg-blue-400/10';
  if (rating >= 0.90) return 'text-gray-400 border-gray-400 bg-gray-400/10';
  if (rating >= 0.80) return 'text-orange-300 border-orange-300 bg-orange-300/10';
  return 'text-red-400 border-red-400 bg-red-400/10';
}

/**
 * Explicação detalhada dos componentes do rating
 */
export function getRatingBreakdown(data: PlayerRatingData): {
  kpr: number;
  spr: number;
  dpr: number;
  mkf: number;
  eff: number;
  total: number;
} {
  const { 
    totalKills, totalDeaths, totalDamage, totalRounds, 
    totalHeadshots, tripleKills = 0, quadroKills = 0, pentaKills = 0 
  } = data;

  if (totalRounds === 0) {
    return { kpr: 0, spr: 0, dpr: 0, mkf: 0, eff: 0, total: 0 };
  }

  const kpr = totalKills / totalRounds;
  const dpr = totalDamage / totalRounds;
  const spr = Math.max(0, Math.min(1, (totalRounds - totalDeaths) / totalRounds));
  const mkf = (tripleKills * 0.3 + quadroKills * 0.5 + pentaKills * 1.0) / totalRounds;
  
  const kd = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;
  const hsPercentage = totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0;
  const eff = (Math.min(kd, 2) / 2) * (hsPercentage / 100);

  const total = calculateSimplifiedRating(data);

  return {
    kpr: parseFloat(kpr.toFixed(3)),
    spr: parseFloat(spr.toFixed(3)),
    dpr: parseFloat(dpr.toFixed(1)),
    mkf: parseFloat(mkf.toFixed(3)),
    eff: parseFloat(eff.toFixed(3)),
    total,
  };
}