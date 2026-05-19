import { describe, expect, it } from 'vitest';
import {
  computeRiskMetrics,
  historicalVar,
  maxDrawdown,
  logReturns,
  sharpeRatio,
  sortinoRatio,
  annualReturn,
  annualVolatility,
  ewmaVolatility,
  betaTo,
} from '../../src/lib/risk-metrics';

// Fixtures: prices that form known shapes so we can assert exact
// numbers rather than ranges. Avoiding fuzzy "within X%" assertions
// catches sign flips and off-by-one errors that a fuzz threshold
// would hide.

const FLAT: { date: string; close: number }[] = Array.from({ length: 60 }, (_, i) => ({
  date: `2024-01-${String(i + 1).padStart(2, '0')}`,
  close: 100,
}));

// Simple geometric series: +1% every day for 100 days. Dates are
// sequential ISO strings so the internal sort in computeRiskMetrics
// preserves order — the earlier fixture used a date format that
// sorted lexicographically wrong and shuffled the series.
function isoDay(start: string, offset: number): string {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
const GEOMETRIC_UP: { date: string; close: number }[] = Array.from(
  { length: 100 },
  (_, i) => ({
    date: isoDay('2024-01-01', i),
    close: 100 * 1.01 ** i,
  }),
);

describe('logReturns', () => {
  it('returns log differences in order', () => {
    const r = logReturns([
      { date: 'a', close: 100 },
      { date: 'b', close: 110 },
      { date: 'c', close: 121 },
    ]);
    expect(r).toHaveLength(2);
    expect(r[0]).toBeCloseTo(Math.log(1.1), 6);
    expect(r[1]).toBeCloseTo(Math.log(1.1), 6);
  });

  it('skips non-finite or non-positive values rather than NaNing the result', () => {
    const r = logReturns([
      { date: 'a', close: 100 },
      { date: 'b', close: 0 },
      { date: 'c', close: 110 },
    ]);
    expect(r.every(Number.isFinite)).toBe(true);
  });
});

describe('historicalVar', () => {
  it('returns 0 when all returns are 0', () => {
    expect(historicalVar([0, 0, 0, 0, 0], 0.95)).toBe(0);
  });

  it('returns null on empty input', () => {
    expect(historicalVar([], 0.95)).toBeNull();
  });

  it('picks the 5th percentile loss at 95% confidence', () => {
    // 100 returns from -0.10 to +0.09. 5th percentile = index 5 → -0.05.
    // Loss-magnitude positive = 0.05.
    const returns = Array.from({ length: 100 }, (_, i) => (i - 10) / 100);
    const v = historicalVar(returns, 0.95);
    expect(v).toBeCloseTo(0.05, 6);
  });
});

describe('maxDrawdown', () => {
  it('returns 0 on a flat series', () => {
    const dd = maxDrawdown(FLAT);
    expect(dd.value).toBe(0);
  });

  it('identifies the worst peak-to-trough decline with bracketing dates', () => {
    // 100 → 120 (peak) → 60 (trough) → 80. Max DD = 50%.
    const prices = [
      { date: '2024-01-01', close: 100 },
      { date: '2024-01-02', close: 120 },
      { date: '2024-01-03', close: 110 },
      { date: '2024-01-04', close: 60 },
      { date: '2024-01-05', close: 80 },
    ];
    const dd = maxDrawdown(prices);
    expect(dd.value).toBeCloseTo(0.5, 6);
    expect(dd.peakDate).toBe('2024-01-02');
    expect(dd.troughDate).toBe('2024-01-04');
  });
});

describe('annualReturn / annualVolatility', () => {
  it('annualises daily mean by 252', () => {
    // Log return = ln(1.01) every day; annualised = 252 * ln(1.01).
    const r = annualReturn(logReturns(GEOMETRIC_UP));
    expect(r).toBeCloseTo(252 * Math.log(1.01), 4);
  });

  it('returns null for vol when sample is degenerate', () => {
    expect(annualVolatility([])).toBeNull();
  });
});

describe('sharpeRatio', () => {
  it('returns null when there is no volatility (constant returns)', () => {
    // Constant 1% return per day — annualised vol is 0, Sharpe undefined.
    const returns = Array.from({ length: 50 }, () => 0.01);
    expect(sharpeRatio(returns)).toBeNull();
  });

  it('is positive when mean return is positive', () => {
    const returns = Array.from({ length: 50 }, (_, i) => (i % 2 === 0 ? 0.02 : -0.005));
    expect(sharpeRatio(returns)!).toBeGreaterThan(0);
  });
});

describe('sortinoRatio', () => {
  it('returns null when no returns fall below the target', () => {
    // All-positive returns — no downside, undefined Sortino.
    const returns = Array.from({ length: 50 }, () => 0.01);
    expect(sortinoRatio(returns)).toBeNull();
  });

  it('is larger than Sharpe when downside is small relative to upside', () => {
    // Many small losses + a few large gains. Downside deviation is
    // tiny (only the small losses), total deviation is dominated by
    // the large gain outliers, so Sortino > Sharpe by a wide margin.
    const returns = [
      ...Array.from({ length: 40 }, () => -0.005),
      ...Array.from({ length: 10 }, () => 0.05),
    ];
    const sh = sharpeRatio(returns)!;
    const so = sortinoRatio(returns)!;
    expect(so).toBeGreaterThan(sh);
  });
});

describe('ewmaVolatility', () => {
  it('returns null on short input', () => {
    expect(ewmaVolatility([0.01, 0.02])).toBeNull();
  });

  it('converges to annualised stddev shape on stationary noise', () => {
    // Constant-magnitude returns alternating sign — daily stddev = 0.01,
    // annualised ≈ 0.01 * √252 ≈ 0.159. EWMA should be in that ballpark.
    const r = Array.from({ length: 200 }, (_, i) => (i % 2 ? 0.01 : -0.01));
    const v = ewmaVolatility(r)!;
    expect(v).toBeGreaterThan(0.12);
    expect(v).toBeLessThan(0.20);
  });

  it('reacts faster than simple stddev to a vol spike', () => {
    // 150 quiet days followed by 30 noisy days. EWMA should weight
    // the recent noise heavily; simple stddev is the long-run blend.
    const quiet = Array.from({ length: 150 }, () => 0.001);
    const noisy = Array.from({ length: 30 }, (_, i) => (i % 2 ? 0.03 : -0.03));
    const series = [...quiet, ...noisy];
    const ewma = ewmaVolatility(series)!;
    const simple = annualVolatility(series)!;
    expect(ewma).toBeGreaterThan(simple);
  });
});

describe('betaTo', () => {
  it('returns ~2 when ticker is 2× the benchmark', () => {
    const bench = Array.from({ length: 200 }, () => Math.sin(Math.random()) * 0.01);
    const tick = bench.map((r) => 2 * r);
    const reg = betaTo(tick, bench)!;
    expect(reg.beta).toBeCloseTo(2, 4);
    expect(reg.rSquared).toBeCloseTo(1, 4);
  });

  it('returns null when overlap is too small', () => {
    expect(betaTo([0.01, 0.02], [0.01, 0.01])).toBeNull();
  });
});

describe('computeRiskMetrics', () => {
  it('returns nulls (not NaN) when there is insufficient data', () => {
    const m = computeRiskMetrics([{ date: '2024-01-01', close: 100 }]);
    expect(m.samples).toBe(0);
    expect(m.varDaily95).toBeNull();
    expect(m.sharpe).toBeNull();
    expect(m.maxDrawdown).toBeNull();
  });

  it('runs end-to-end on a real-shaped series', () => {
    const m = computeRiskMetrics(GEOMETRIC_UP);
    expect(m.samples).toBe(99);
    expect(m.annualReturn).toBeCloseTo(252 * Math.log(1.01), 4);
    // Floating-point noise: identical returns produce vol ~1e-15
    // rather than literal 0, so check against a tight tolerance.
    expect(m.annualVolatility).toBeLessThan(1e-10);
    expect(m.sharpe).toBeNull();
    expect(m.maxDrawdown).toBe(0); // monotonic up
    // Beta fields stay null when no benchmark is supplied.
    expect(m.beta).toBeNull();
    expect(m.idiosyncraticVol).toBeNull();
  });

  it('reports beta close to 1 when ticker IS the benchmark', () => {
    const m = computeRiskMetrics(GEOMETRIC_UP, GEOMETRIC_UP);
    expect(m.beta).toBeCloseTo(1, 4);
    expect(m.benchmarkRSquared).toBeCloseTo(1, 4);
  });

  it('reports beta near 2 when ticker is leveraged version of benchmark', () => {
    // Build benchmark from random-shaped returns, ticker = 2× benchmark
    // returns. Beta should land at 2 with very high r².
    const bench = Array.from({ length: 200 }, (_, i) => ({
      date: isoDay('2024-01-01', i),
      close: 100 * Math.exp(Math.sin(i / 7) * 0.05),
    }));
    const tick = bench.map((b, i) =>
      i === 0
        ? { date: b.date, close: 100 }
        : { date: b.date, close: 100 * Math.exp(2 * Math.log(b.close / bench[0].close)) },
    );
    const m = computeRiskMetrics(tick, bench);
    expect(m.beta!).toBeCloseTo(2, 2);
  });
});
