// Event-aware realised volatility. Slices a ticker's return history
// into "within ±N days of event" vs "everything else" and reports the
// vol multiplier between the two buckets.
//
// Output framing for the UI: "Your portfolio is historically 1.8× more
// volatile during CPI weeks." That single number is the headline most
// users actually need — they don't want a full statistical breakdown,
// they want to know whether to scale down their position size before
// the print.

import type { PricePoint } from './risk-metrics';
import { logReturns } from './risk-metrics';
import { getHistoricalEvents } from './macro-calendar';
import type { MacroEventType } from './macro-calendar';

export interface EventVolReport {
  eventType: MacroEventType;
  windowDays: number;
  sampleEvents: number;
  // Daily stddev — kept on the daily scale for honest reporting.
  // Annualising would just multiply both buckets by √252 and the
  // ratio (which is what we care about) is unchanged.
  eventVol: number | null;
  baselineVol: number | null;
  // The headline: eventVol / baselineVol. >1 means the ticker is
  // more volatile during the event window than outside it.
  multiplier: number | null;
  // How many daily returns landed in each bucket. Surfaced so the UI
  // can disclaim small-sample inferences.
  eventReturns: number;
  baselineReturns: number;
}

// Build the set of dates that fall within ±windowDays of any event.
function buildEventDateSet(eventDates: string[], windowDays: number): Set<string> {
  const out = new Set<string>();
  for (const dateStr of eventDates) {
    const d = new Date(dateStr + 'T00:00:00Z');
    for (let offset = -windowDays; offset <= windowDays; offset++) {
      const shifted = new Date(d.getTime() + offset * 86400 * 1000);
      out.add(shifted.toISOString().slice(0, 10));
    }
  }
  return out;
}

function stddev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((s, x) => s + x, 0) / values.length;
  const variance = values.reduce((s, x) => s + (x - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function computeEventVol(
  prices: PricePoint[],
  eventType: MacroEventType,
  options: { windowDays?: number; yearsBack?: number } = {},
): EventVolReport {
  const windowDays = options.windowDays ?? 2;
  const yearsBack = options.yearsBack ?? 5;
  const eventDates = getHistoricalEvents(eventType, yearsBack);
  const eventSet = buildEventDateSet(eventDates, windowDays);

  // Need both the return and the date it occurred on so we can bucket.
  const cleaned = prices
    .filter((p) => p && Number.isFinite(p.close) && p.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const returnsWithDates: { date: string; r: number }[] = [];
  const flatReturns = logReturns(cleaned);
  for (let i = 0; i < flatReturns.length; i++) {
    returnsWithDates.push({ date: cleaned[i + 1].date, r: flatReturns[i] });
  }

  const eventBucket: number[] = [];
  const baselineBucket: number[] = [];
  for (const { date, r } of returnsWithDates) {
    if (eventSet.has(date)) eventBucket.push(r);
    else baselineBucket.push(r);
  }

  const eventVol = stddev(eventBucket);
  const baselineVol = stddev(baselineBucket);
  const multiplier =
    eventVol !== null && baselineVol !== null && baselineVol > 0
      ? eventVol / baselineVol
      : null;

  return {
    eventType,
    windowDays,
    sampleEvents: eventDates.length,
    eventVol,
    baselineVol,
    multiplier,
    eventReturns: eventBucket.length,
    baselineReturns: baselineBucket.length,
  };
}
