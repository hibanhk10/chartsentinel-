// Monte Carlo "probability cone" projection. Geometric Brownian
// Motion (GBM) seeded with the trailing-year drift and volatility.
// Not magic — the cone is just "if returns are roughly lognormal,
// here's the percentile band of future closes." Useful as a sanity
// check, not as a forecast.
//
// 1000 paths is a sweet spot: enough for the 10th/90th percentile
// to be smooth, cheap enough that a request finishes in <100ms.
//
// Pseudo-random Box-Muller normal sample. We don't use a CSPRNG
// because nothing security-sensitive depends on this — visual
// determinism would actually be nice and we accept the slight
// non-deterministic feel as a feature ("paths look different every
// time"). Caller can pass a seed-aware RNG if reproducibility ever
// becomes a requirement.

import { logReturns, annualReturn, annualVolatility, type PricePoint } from './risk-metrics';

const TRADING_DAYS = 252;
const DEFAULT_PATHS = 1000;
const DEFAULT_PERCENTILES = [0.05, 0.25, 0.5, 0.75, 0.95];

function gaussian(): number {
  // Box-Muller — produces two independent N(0,1) samples per call;
  // we keep one and toss the other for simplicity.
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export interface ProjectionInput {
  history: PricePoint[];
  horizonDays: number;
  paths?: number;
  percentiles?: number[];
}

export interface ProjectionBand {
  dayIndex: number;
  values: Record<string, number>; // "p05" → 145.32, "p50" → 152.10, ...
}

export interface ProjectionResult {
  startPrice: number;
  startDate: string;
  mu: number; // annual drift (decimal, e.g. 0.12 = 12% / yr)
  sigma: number; // annual volatility
  horizonDays: number;
  paths: number;
  bands: ProjectionBand[];
}

// Project N days of price evolution from the latest close. Returns
// a band per future day with the percentile prices the frontend
// renders as a translucent fan over the candle chart.
export function projectPriceFan(input: ProjectionInput): ProjectionResult | { error: string } {
  const history = input.history.filter(
    (p) => p && Number.isFinite(p.close) && p.close > 0,
  );
  if (history.length < 60) {
    return { error: 'Need at least 60 days of history to project.' };
  }
  const horizon = Math.min(Math.max(Math.floor(input.horizonDays), 1), 252);
  const paths = Math.min(Math.max(Math.floor(input.paths ?? DEFAULT_PATHS), 100), 5000);
  const percentiles = (input.percentiles ?? DEFAULT_PERCENTILES).slice().sort((a, b) => a - b);

  const last = history[history.length - 1];
  const startPrice = last.close;
  const returns = logReturns(history);
  const muAnn = annualReturn(returns) ?? 0;
  const sigmaAnn = annualVolatility(returns) ?? 0;
  if (sigmaAnn === 0) {
    return { error: 'Zero historical volatility — cannot project.' };
  }
  // Convert to daily.
  const muDaily = muAnn / TRADING_DAYS;
  const sigmaDaily = sigmaAnn / Math.sqrt(TRADING_DAYS);

  // simulations[d][p] = price at day d on path p. We allocate
  // [horizon][paths] flat arrays to keep the inner loop tight.
  const sims: Float64Array[] = [];
  for (let d = 0; d < horizon; d++) {
    sims.push(new Float64Array(paths));
  }
  for (let p = 0; p < paths; p++) {
    let price = startPrice;
    for (let d = 0; d < horizon; d++) {
      // GBM step: S_{t+1} = S_t * exp((mu - sigma^2/2) + sigma * Z)
      const z = gaussian();
      const drift = muDaily - 0.5 * sigmaDaily * sigmaDaily;
      price = price * Math.exp(drift + sigmaDaily * z);
      sims[d][p] = price;
    }
  }

  // Sort each day's paths to read off percentiles. Sorting is the
  // hot path; on 1000 paths × 30 days that's ~30k log-scale ops, well
  // under 100ms.
  const bands: ProjectionBand[] = [];
  for (let d = 0; d < horizon; d++) {
    const sorted = Array.from(sims[d]).sort((a, b) => a - b);
    const values: Record<string, number> = {};
    for (const q of percentiles) {
      const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
      values[`p${Math.round(q * 100).toString().padStart(2, '0')}`] = sorted[idx];
    }
    bands.push({ dayIndex: d + 1, values });
  }

  return {
    startPrice,
    startDate: last.date,
    mu: muAnn,
    sigma: sigmaAnn,
    horizonDays: horizon,
    paths,
    bands,
  };
}
