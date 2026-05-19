// Z-score based anomaly detection. The goal is "what's unusual *for
// this ticker* today" — comparing to its own trailing history, not
// to the broader universe. A 5% daily move is a yawn for a meme
// stock and a five-sigma event for a Treasury ETF; absolute moves
// don't capture that, z-scores do.
//
// Inputs are daily bars with at least { date, close }. Volume is
// optional — when present we surface a parallel z-score on volume,
// which often spikes before the price does ("smart money tape
// reading"). Anything missing degrades gracefully — caller sees null
// in that field rather than a thrown error.

export interface AnomalyBar {
  date: string;
  close: number;
  volume?: number;
}

export interface AnomalyResult {
  ticker: string;
  // The most recent bar's date — surfaces in the UI so users can tell
  // when the scan saw stale data (weekends, holidays).
  asOf: string | null;
  // Most recent daily simple return.
  return: number | null;
  // |today's return| measured in trailing-30d stddev units. Positive
  // values only — the direction is in `return`'s sign. >2 = top ~2.3%
  // of that ticker's own history; >3 = top ~0.13%.
  returnZ: number | null;
  // Today's volume vs trailing-30d mean. Same z-score convention.
  volumeZ: number | null;
  // The strongest of the two z-scores. Used to rank the feed so the
  // user sees the most-surprising-overall print at the top, not just
  // the most-surprising in one dimension.
  maxZ: number | null;
  // What type of anomaly dominated. Drives the chip colour on the
  // UI and feeds the LLM-narration prompt.
  type: 'volume' | 'price' | null;
}

// Mean + sample stddev of a numeric series. Returns null instead of
// NaN on degenerate input so callers can check once and bail.
function stats(values: number[]): { mean: number; std: number } | null {
  if (values.length < 5) return null;
  const mean = values.reduce((s, x) => s + x, 0) / values.length;
  const variance =
    values.reduce((s, x) => s + (x - mean) ** 2, 0) / (values.length - 1);
  const std = Math.sqrt(variance);
  if (!Number.isFinite(std) || std < 1e-12) return null;
  return { mean, std };
}

export function detectTickerAnomaly(
  ticker: string,
  bars: AnomalyBar[],
  lookback = 30,
): AnomalyResult {
  const empty: AnomalyResult = {
    ticker,
    asOf: null,
    return: null,
    returnZ: null,
    volumeZ: null,
    maxZ: null,
    type: null,
  };

  if (!bars || bars.length < lookback + 2) return empty;
  // Defensive — caller shouldn't pass unsorted bars but we don't trust
  // upstream APIs to keep their contract.
  const sorted = [...bars]
    .filter((b) => b && Number.isFinite(b.close) && b.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < lookback + 2) return empty;

  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const todayReturn = last.close / prev.close - 1;

  // Trailing-window returns *excluding today* so today's print doesn't
  // contaminate its own baseline.
  const window = sorted.slice(-lookback - 2, -1);
  const baseline: number[] = [];
  for (let i = 1; i < window.length; i++) {
    const a = window[i - 1].close;
    const b = window[i].close;
    if (a > 0 && b > 0) baseline.push(b / a - 1);
  }
  const retStats = stats(baseline);
  const returnZ = retStats ? Math.abs((todayReturn - retStats.mean) / retStats.std) : null;

  let volumeZ: number | null = null;
  const hasVolume = sorted.every((b) => Number.isFinite(b.volume));
  if (hasVolume && Number.isFinite(last.volume!)) {
    const volWindow = window
      .map((b) => b.volume)
      .filter((v): v is number => Number.isFinite(v));
    const volStats = stats(volWindow);
    if (volStats && volStats.std > 0) {
      volumeZ = Math.abs((last.volume! - volStats.mean) / volStats.std);
    }
  }

  const maxZ =
    returnZ === null && volumeZ === null
      ? null
      : Math.max(returnZ ?? 0, volumeZ ?? 0);
  const type: AnomalyResult['type'] =
    maxZ === null ? null : (volumeZ ?? 0) >= (returnZ ?? 0) ? 'volume' : 'price';

  return {
    ticker,
    asOf: last.date,
    return: todayReturn,
    returnZ,
    volumeZ,
    maxZ,
    type,
  };
}

// Convenience for the scanner — drops sub-threshold rows and sorts by
// strongest z descending.
export function rankAnomalies(rows: AnomalyResult[], threshold = 2): AnomalyResult[] {
  return rows
    .filter((r) => r.maxZ !== null && r.maxZ >= threshold)
    .sort((a, b) => (b.maxZ ?? 0) - (a.maxZ ?? 0));
}
