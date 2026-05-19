import { describe, expect, it } from 'vitest';
import { getMacroCalendar, getHistoricalEvents } from '../../src/lib/macro-calendar';

describe('getMacroCalendar', () => {
  it('returns events sorted by date within the requested window', () => {
    const from = new Date('2026-05-01T00:00:00Z');
    const events = getMacroCalendar({ from, days: 90 });
    expect(events.length).toBeGreaterThan(0);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date >= events[i - 1].date).toBe(true);
    }
    for (const e of events) {
      expect(e.date >= '2026-05-01').toBe(true);
    }
  });

  it('respects the types filter', () => {
    const events = getMacroCalendar({
      from: new Date('2026-05-01T00:00:00Z'),
      days: 180,
      types: ['fomc'],
    });
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.type === 'fomc')).toBe(true);
  });

  it('generates monthly CPI + NFP events in every full month of the window', () => {
    const events = getMacroCalendar({
      from: new Date('2026-06-01T00:00:00Z'),
      days: 90,
      types: ['cpi', 'nfp'],
    });
    // 3 months of CPI + 3 months of NFP = 6 events minimum.
    expect(events.length).toBeGreaterThanOrEqual(6);
  });
});

describe('getHistoricalEvents', () => {
  it('produces ~one NFP per month for the lookback window', () => {
    const dates = getHistoricalEvents('nfp', 2);
    // 24 months ±1 depending on where today lands in the calendar.
    expect(dates.length).toBeGreaterThanOrEqual(22);
    expect(dates.length).toBeLessThanOrEqual(28);
    // Every NFP date should be a Friday.
    for (const d of dates) {
      const dow = new Date(d + 'T00:00:00Z').getUTCDay();
      expect(dow).toBe(5);
    }
  });

  it('returns empty for unsupported event types (FOMC etc.)', () => {
    expect(getHistoricalEvents('fomc', 5)).toEqual([]);
  });
});
