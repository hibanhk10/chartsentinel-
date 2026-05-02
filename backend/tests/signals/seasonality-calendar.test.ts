import { describe, expect, it } from 'vitest';
// @ts-expect-error — engine.js is plain JS without a .d.ts; the runtime
// shape is verified by the assertions below.
import { computeSeasonalityCalendar } from '../../src/signals/engine.js';

// Synthesise three years of daily price data with a known monthly drift
// so the calendar aggregator's behaviour is deterministic. Each year, the
// monthly drift goes +2% in January, -1% in February, then 0% elsewhere
// — which means the avgReturn for January should land at ~+2 and the
// winRate should be 1.0.
function syntheticPriceData() {
  const out: Array<{ date: string; close: number }> = [];
  let price = 100;
  for (const year of [2023, 2024, 2025]) {
    for (let month = 1; month <= 12; month++) {
      const drift = month === 1 ? 0.02 : month === 2 ? -0.01 : 0;
      // Start the month at the running close, then step the drift across
      // ~21 trading days. We emit 21 entries per month, dating them on
      // weekdays of that calendar month — close enough to "trading days"
      // for the calendar aggregator (it groups by year-month).
      const start = price;
      const end = start * (1 + drift);
      for (let d = 1; d <= 21; d++) {
        const day = String(d).padStart(2, '0');
        const mm = String(month).padStart(2, '0');
        // Linearly interpolate so the first day's close ≈ start and the
        // last day's close ≈ end.
        const t = (d - 1) / 20;
        out.push({ date: `${year}-${mm}-${day}`, close: start + (end - start) * t });
      }
      price = end;
    }
  }
  return out;
}

describe('computeSeasonalityCalendar', () => {
  it('returns null when given fewer than 252 daily records', () => {
    expect(computeSeasonalityCalendar([{ date: '2024-01-01', close: 1 }])).toBeNull();
  });

  it('produces 12 monthly buckets, ordered Jan → Dec', () => {
    const result = computeSeasonalityCalendar(syntheticPriceData(), 10);
    expect(result).not.toBeNull();
    expect(result.months).toHaveLength(12);
    result.months.forEach((m: { month: number }, i: number) => {
      expect(m.month).toBe(i + 1);
    });
  });

  it('reflects the synthetic drift: +2% in Jan, -1% in Feb, ~0 elsewhere', () => {
    const result = computeSeasonalityCalendar(syntheticPriceData(), 10);
    const jan = result.months.find((m: { month: number }) => m.month === 1);
    const feb = result.months.find((m: { month: number }) => m.month === 2);
    const mar = result.months.find((m: { month: number }) => m.month === 3);

    expect(jan.avgReturn).toBeGreaterThan(1.5);
    expect(jan.avgReturn).toBeLessThan(2.5);
    expect(jan.winRate).toBe(1);

    expect(feb.avgReturn).toBeLessThan(-0.5);
    expect(feb.avgReturn).toBeGreaterThan(-1.5);
    expect(feb.winRate).toBe(0);

    // March should be near-zero; the running price step compounds slightly
    // but stays well within ±0.5 over three sample years.
    expect(Math.abs(mar.avgReturn)).toBeLessThan(0.5);
  });

  it('reports the lookback years used', () => {
    const result = computeSeasonalityCalendar(syntheticPriceData(), 10);
    expect(result.years).toEqual([2023, 2024, 2025]);
  });
});
