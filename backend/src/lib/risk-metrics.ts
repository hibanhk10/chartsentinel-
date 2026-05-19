// Risk-metric primitives. Pure math, no I/O — same function works on
// a single ticker's price history or a portfolio's equity curve.
// Caller is responsible for fetching the underlying daily closes.
//
// All annualised metrics assume 252 US trading days. Returns are log
// returns unless otherwise stated; simple returns and log returns
// converge for small daily moves but log returns are time-additive
// which makes the math cleaner for multi-day projections.

export interface PricePoint {
  date: string;
  close: number;
}

export interface RiskMetrics {
  // Sample size + window the metrics are computed over.
  samples: number;
  startDate: string | null;
  endDate: string | null;
  // 95% historical VaR — the worst daily return at the 5th percentile,
  // expressed as a positive number (e.g. 0.024 = "could lose 2.4% in
  // a single day with 5% probability").
  varDaily95: number | null;
  // Same idea at 99% confidence (1st percentile).
  varDaily99: number | null;
  // Annualised return + volatility. Useful as headline numbers.
  annualReturn: number | null;
  annualVolatility: number | null;
  // Sharpe (risk-adjusted return). Assumes zero risk-free rate by
  // default — caller can subtract a fed-funds rate from annualReturn
  // before passing if they want a strict Sharpe.
  sharpe: number | null;
  // Sortino — like Sharpe but penalises only downside vol, which is
  // what retail traders actually care about. Higher = better.
  sortino: number | null;
  // Peak-to-trough decline at its worst point over the window.
  maxDrawdown: number | null;
  maxDrawdownPeakDate: string | null;
  maxDrawdownTroughDate: string | null;
  // EWMA-weighted annualised vol (λ=0.94). Tracks regime shifts faster
  // than the simple stddev — diverges from `annualVolatility` when
  // realised vol is rising or falling sharply.
  ewmaVolatility: number | null;
  // Beta vs the supplied benchmark (SPY by default at the engine layer).
  // Null when no benchmark was passed or the overlap was too thin.
  beta: number | null;
  // Stddev of the regression residuals — the part of the ticker's vol
  // that the benchmark can't explain. "Stock-specific risk" in UX copy.
  idiosyncraticVol: number | null;
  // Goodness-of-fit of the beta regression. r² near 1 = ticker behaves
  // like a leveraged version of the benchmark; near 0 = mostly noise
  // relative to the benchmark.
  benchmarkRSquared: number | null;
}

const TRADING_DAYS = 252;

export function logReturns(prices: PricePoint[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const a = prices[i - 1].close;
    const b = prices[i].close;
    if (a > 0 && b > 0 && Number.isFinite(a) && Number.isFinite(b)) {
      out.push(Math.log(b / a));
    }
  }
  return out;
}

// Historical-method VaR. No distribution assumption — sort the actual
// observed returns and pick the threshold percentile. Safer than the
// parametric "assume gaussian" version because financial returns have
// fatter tails than the normal distribution.
export function historicalVar(returns: number[], confidence: number): number | null {
  if (returns.length === 0) return null;
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.max(0, Math.floor((1 - confidence) * sorted.length));
  const r = sorted[idx];
  // Express as a positive "loss magnitude" — UI reads better as
  // "could lose X%" than "return of −X%". The `+ 0` flips JS's
  // awkward `-0` (which negating 0 produces) back to a clean +0.
  return -r + 0;
}

// Annualised arithmetic mean of daily log returns. Multiplied by 252.
export function annualReturn(returns: number[]): number | null {
  if (returns.length === 0) return null;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  return mean * TRADING_DAYS;
}

// Annualised volatility — daily stddev × √252. Standard convention.
export function annualVolatility(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS);
}

export function sharpeRatio(returns: number[], riskFreeAnnual = 0): number | null {
  const ann = annualReturn(returns);
  const vol = annualVolatility(returns);
  if (ann === null || vol === null) return null;
  // Constant returns produce ~1e-15 vol from floating-point noise,
  // not literal 0, so check absolute magnitude rather than ===.
  if (Math.abs(vol) < 1e-12) return null;
  return (ann - riskFreeAnnual) / vol;
}

// EWMA (exponentially weighted moving average) volatility. The
// RiskMetrics-standard λ=0.94 weights recent returns far more heavily
// than the simple stddev does. Useful when realised vol is shifting
// regime — EWMA picks up the change in days, simple-vol only in weeks.
// Returned annualised so it lines up with annualVolatility.
export function ewmaVolatility(returns: number[], lambda = 0.94): number | null {
  if (returns.length < 5) return null;
  // Seed with the variance of the first ~30 returns (or whatever's
  // available). EWMA converges fast so the seed doesn't matter much
  // beyond a few dozen samples, but a sensible seed avoids huge
  // initial-step artefacts on short series.
  const seedLen = Math.min(30, returns.length);
  const seedMean = returns.slice(0, seedLen).reduce((s, r) => s + r, 0) / seedLen;
  let variance =
    returns.slice(0, seedLen).reduce((s, r) => s + (r - seedMean) ** 2, 0) / seedLen;
  for (let i = seedLen; i < returns.length; i++) {
    variance = lambda * variance + (1 - lambda) * returns[i] ** 2;
  }
  return Math.sqrt(variance) * Math.sqrt(252);
}

// Beta-to-benchmark — regression slope of ticker returns vs benchmark
// returns over the aligned date overlap. SPY is the conventional
// benchmark for US equities; the caller can pass any series. Returns
// null when the two series don't overlap by at least 30 days.
export function betaTo(
  tickerReturns: number[],
  benchmarkReturns: number[],
): { beta: number; alpha: number; rSquared: number } | null {
  const n = Math.min(tickerReturns.length, benchmarkReturns.length);
  if (n < 30) return null;
  const t = tickerReturns.slice(-n);
  const b = benchmarkReturns.slice(-n);
  const meanT = t.reduce((s, x) => s + x, 0) / n;
  const meanB = b.reduce((s, x) => s + x, 0) / n;
  let cov = 0;
  let varB = 0;
  let varT = 0;
  for (let i = 0; i < n; i++) {
    const dt = t[i] - meanT;
    const db = b[i] - meanB;
    cov += dt * db;
    varB += db * db;
    varT += dt * dt;
  }
  if (varB === 0 || varT === 0) return null;
  const beta = cov / varB;
  const alpha = meanT - beta * meanB;
  const correlation = cov / Math.sqrt(varT * varB);
  return { beta, alpha, rSquared: correlation * correlation };
}

// Sortino uses downside-only standard deviation, which captures the
// asymmetry retail traders feel: a 2% loss hurts way more than a 2%
// gain helps. Higher Sortino = same return with less downside churn.
export function sortinoRatio(returns: number[], riskFreeAnnual = 0): number | null {
  if (returns.length < 2) return null;
  const ann = annualReturn(returns);
  if (ann === null) return null;
  const target = riskFreeAnnual / TRADING_DAYS; // daily target return
  const downside = returns.filter((r) => r < target);
  if (downside.length === 0) return null;
  const downsideVar =
    downside.reduce((s, r) => s + (r - target) ** 2, 0) / downside.length;
  const downsideDev = Math.sqrt(downsideVar) * Math.sqrt(TRADING_DAYS);
  if (downsideDev === 0) return null;
  return (ann - riskFreeAnnual) / downsideDev;
}

// Maximum peak-to-trough decline over the price series. Returns the
// fraction (0.34 = 34% drawdown) plus the dates that bracket the
// worst stretch — surprisingly useful UX, lets the UI show "your
// biggest loss period was March → June 2024".
export function maxDrawdown(prices: PricePoint[]): {
  value: number | null;
  peakDate: string | null;
  troughDate: string | null;
} {
  // A single price point can't express a drawdown — report null
  // rather than 0 (which would be ambiguous with "no losses
  // observed across many points"). Callers render "—" on null.
  if (prices.length < 2) return { value: null, peakDate: null, troughDate: null };
  let peak = prices[0].close;
  let peakDate = prices[0].date;
  let worstDD = 0;
  let worstPeakDate: string | null = null;
  let worstTroughDate: string | null = null;
  for (const p of prices) {
    if (p.close > peak) {
      peak = p.close;
      peakDate = p.date;
    }
    if (peak > 0) {
      const dd = (peak - p.close) / peak;
      if (dd > worstDD) {
        worstDD = dd;
        worstPeakDate = peakDate;
        worstTroughDate = p.date;
      }
    }
  }
  return {
    value: worstDD,
    peakDate: worstPeakDate,
    troughDate: worstTroughDate,
  };
}

// One-call summary: takes raw bars, returns every metric the dashboard
// + agentic tools need. Returns nulls where the data was insufficient
// rather than throwing — UI renders "—" for those cells instead of
// crashing the whole panel because one ticker is illiquid.
export function computeRiskMetrics(
  prices: PricePoint[],
  benchmark?: PricePoint[],
): RiskMetrics {
  const cleaned = prices
    .filter((p) => p && Number.isFinite(p.close) && p.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const returns = logReturns(cleaned);
  const dd = maxDrawdown(cleaned);

  // Beta needs date-aligned returns. The ticker's calendar can differ
  // from the benchmark's (foreign holidays, listing gaps, ETF inception),
  // so build the intersection on dates rather than zipping by index.
  let beta: number | null = null;
  let idiosyncraticVol: number | null = null;
  let benchmarkRSquared: number | null = null;
  if (benchmark && benchmark.length > 1) {
    const benchClean = benchmark
      .filter((p) => p && Number.isFinite(p.close) && p.close > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    const benchByDate = new Map(benchClean.map((p) => [p.date, p.close]));
    const alignedT: PricePoint[] = [];
    const alignedB: PricePoint[] = [];
    for (const p of cleaned) {
      const bClose = benchByDate.get(p.date);
      if (bClose !== undefined) {
        alignedT.push(p);
        alignedB.push({ date: p.date, close: bClose });
      }
    }
    const tReturns = logReturns(alignedT);
    const bReturns = logReturns(alignedB);
    const reg = betaTo(tReturns, bReturns);
    if (reg) {
      beta = reg.beta;
      benchmarkRSquared = reg.rSquared;
      // Idiosyncratic vol = annualised stddev of residuals. The slice
      // here matches what betaTo used (last `n` of each series).
      const n = Math.min(tReturns.length, bReturns.length);
      const t = tReturns.slice(-n);
      const b = bReturns.slice(-n);
      const meanT = t.reduce((s, x) => s + x, 0) / n;
      const meanB = b.reduce((s, x) => s + x, 0) / n;
      let resSqSum = 0;
      for (let i = 0; i < n; i++) {
        const expected = reg.alpha + reg.beta * (b[i] - meanB) + meanT;
        const residual = t[i] - expected;
        resSqSum += residual * residual;
      }
      idiosyncraticVol = Math.sqrt(resSqSum / Math.max(1, n - 2)) * Math.sqrt(TRADING_DAYS);
    }
  }

  return {
    samples: returns.length,
    startDate: cleaned.length > 0 ? cleaned[0].date : null,
    endDate: cleaned.length > 0 ? cleaned[cleaned.length - 1].date : null,
    varDaily95: historicalVar(returns, 0.95),
    varDaily99: historicalVar(returns, 0.99),
    annualReturn: annualReturn(returns),
    annualVolatility: annualVolatility(returns),
    sharpe: sharpeRatio(returns),
    sortino: sortinoRatio(returns),
    maxDrawdown: dd.value,
    maxDrawdownPeakDate: dd.peakDate,
    maxDrawdownTroughDate: dd.troughDate,
    ewmaVolatility: ewmaVolatility(returns),
    beta,
    idiosyncraticVol,
    benchmarkRSquared,
  };
}
