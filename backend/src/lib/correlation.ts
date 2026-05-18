// Pearson correlation across return series. Used for the portfolio
// correlation matrix — when two holdings move together they don't
// actually provide diversification regardless of how different they
// look in the brochure.
//
// We align series by date so a half-year gap in one ticker doesn't
// silently shift the other ticker's returns by half a year. Anything
// that survives alignment is used; sparse pairs return null rather
// than a wildly noisy correlation.

import { logReturns, type PricePoint } from './risk-metrics';

// Minimum sample size before we trust a correlation. Below this and
// we report null to the caller — UX renders "—" instead of a
// confidence-zero number.
const MIN_OVERLAP = 30;

// Aligns two date-indexed price series on common dates. Returns
// parallel arrays of closes (no holes), suitable for direct return
// computation. Order is deterministic by ascending date.
function alignByDate(
  a: PricePoint[],
  b: PricePoint[],
): { a: number[]; b: number[]; dates: string[] } {
  const mapA = new Map(a.map((p) => [p.date, p.close]));
  const dates: string[] = [];
  const aOut: number[] = [];
  const bOut: number[] = [];
  for (const pb of b) {
    const close = mapA.get(pb.date);
    if (close !== undefined && Number.isFinite(close) && Number.isFinite(pb.close)) {
      dates.push(pb.date);
      aOut.push(close);
      bOut.push(pb.close);
    }
  }
  // Sort by date so log-returns are computed sequentially regardless
  // of the input order.
  const order = dates
    .map((d, i) => ({ d, i }))
    .sort((x, y) => x.d.localeCompare(y.d));
  return {
    dates: order.map((o) => o.d),
    a: order.map((o) => aOut[o.i]),
    b: order.map((o) => bOut[o.i]),
  };
}

function pearson(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  if (den === 0) return null;
  return num / den;
}

export function correlateTwo(a: PricePoint[], b: PricePoint[]): number | null {
  const aligned = alignByDate(a, b);
  if (aligned.dates.length < MIN_OVERLAP) return null;
  const aBars = aligned.dates.map((d, i) => ({ date: d, close: aligned.a[i] }));
  const bBars = aligned.dates.map((d, i) => ({ date: d, close: aligned.b[i] }));
  const ra = logReturns(aBars);
  const rb = logReturns(bBars);
  return pearson(ra, rb);
}

export interface CorrelationMatrix {
  tickers: string[];
  matrix: (number | null)[][]; // matrix[i][j] = corr(ticker[i], ticker[j])
}

// Symmetric matrix builder. Diagonals are 1.0, upper triangle mirrors
// the lower. Caller passes a map of ticker → price history.
export function buildCorrelationMatrix(
  series: Record<string, PricePoint[]>,
): CorrelationMatrix {
  const tickers = Object.keys(series);
  const matrix: (number | null)[][] = tickers.map(() => tickers.map(() => null));
  for (let i = 0; i < tickers.length; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < tickers.length; j++) {
      const c = correlateTwo(series[tickers[i]], series[tickers[j]]);
      matrix[i][j] = c;
      matrix[j][i] = c;
    }
  }
  return { tickers, matrix };
}
