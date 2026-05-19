import { describe, expect, it } from 'vitest';
import { computeEventVol } from '../../src/lib/event-vol';
import { getHistoricalEvents } from '../../src/lib/macro-calendar';

// Build a synthetic price series where vol is amplified on event
// dates. computeEventVol should detect a multiplier > 1.
function isoDay(start: string, offset: number): string {
  const d = new Date(start + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

describe('computeEventVol', () => {
  it('detects an inflated vol multiplier on event windows', () => {
    const cpiDates = new Set(getHistoricalEvents('cpi', 5));
    let price = 100;
    const prices: { date: string; close: number }[] = [];
    // Build 5 years of daily prices. On event dates, inject larger
    // returns; off-event days carry small returns.
    for (let i = 0; i < 5 * 365; i++) {
      const date = isoDay('2021-01-01', i);
      const isEvent = cpiDates.has(date);
      const shock = (Math.random() - 0.5) * (isEvent ? 0.04 : 0.005);
      price *= 1 + shock;
      prices.push({ date, close: price });
    }
    const report = computeEventVol(prices, 'cpi', { windowDays: 0, yearsBack: 5 });
    expect(report.multiplier).not.toBeNull();
    expect(report.multiplier!).toBeGreaterThan(1.5);
  });

  it('returns null multiplier when there is no overlap', () => {
    const report = computeEventVol(
      [
        { date: '2024-01-01', close: 100 },
        { date: '2024-01-02', close: 101 },
      ],
      'cpi',
    );
    // 2 data points means at most 1 return → both buckets too small.
    expect(report.eventVol).toBeNull();
    expect(report.baselineVol).toBeNull();
  });
});
