// src/utils/rating.utils.ts
// HLTV Rating 2.0 — implementação baseada na fórmula oficial

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
 * Calcula o HLTV Rating 2.0 com os dados disponíveis da FACEIT.
 *
 * Fórmula oficial:
 *   Rating = 0.0073×KAST + 0.3591×KPR − 0.5329×DPR + 0.2372×IMPACT + 0.0032×ADR + 0.1587
 *
 * Onde:
 *   KPR    = kills por round
 *   DPR    = deaths por round
 *   ADR    = dano por round
 *   IMPACT = 2.13×KPR − 0.41  (versão sem assists/round, não disponível na API)
 *   KAST   = estimado via KPR e DPR (a API FACEIT não fornece KAST diretamente)
 *            Média histórica ~73%; ajustado ±50 pts pelo KPR e ±30 pts pelo DPR
 *
 * Referência de escala:
 *   > 1.20  — muito bom
 *   1.00–1.20 — acima da média
 *   0.80–1.00 — abaixo da média
 *   < 0.80  — ruim
 *
 * @returns Rating ≈ 0.6–1.5 para a maioria dos jogadores (médio ~1.0)
 */
export function calculateSimplifiedRating(data: PlayerRatingData): number {
  const { totalKills, totalDeaths, totalDamage, totalRounds } = data;

  if (totalRounds === 0) return 0;

  const kpr = totalKills / totalRounds;
  const dpr = totalDeaths / totalRounds;
  const adr = totalDamage / totalRounds;

  // KAST estimado: base 73% (média HLTV), ajustado por KPR e DPR
  // Jogador com mais kills que a média (+KPR) tende a ter KAST maior
  // Jogador que morre mais que a média (+DPR) tende a ter KAST menor
  const kast = Math.max(30, Math.min(95, 73 + (kpr - 0.68) * 50 - (dpr - 0.6) * 30));

  // IMPACT sem assists/round (APR), que a API não fornece
  const impact = 2.13 * kpr - 0.41;

  const rating =
    0.0073  * kast   +
    0.3591  * kpr    -
    0.5329  * dpr    +
    0.2372  * impact +
    0.0032  * adr    +
    0.1587;

  return parseFloat(Math.max(0, rating).toFixed(2));
}
