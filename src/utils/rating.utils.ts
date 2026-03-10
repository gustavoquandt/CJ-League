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

