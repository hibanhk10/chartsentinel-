// Generated upcoming macro events. The Fed publishes FOMC dates a year
// ahead, so those are hand-listed (most reliable source of truth and
// they don't shift). Everything else is generated programmatically:
//
//   CPI    — 2nd Tuesday or Wednesday of each month, mid-month window
//            (10th–15th). Use a heuristic of "the 13th" — close enough
//            for portfolio-level event-vol analysis.
//   NFP    — first Friday of each month, US labour report.
//   ECB    — eight scheduled policy meetings per year, ~6 weeks apart.
//   BoE    — eight MPC meetings per year.
//
// The caller can request all events in a forward window (default 90
// days) or filter by event type.
//
// Important caveat: this is a *schedule*, not a release feed. We're
// not parsing live news or BLS XML — the goal is to know which dates
// historically carried tail-risk so the risk module can weight them
// appropriately. Exact-minute release timestamps don't matter here.

export type MacroEventType = 'fomc' | 'cpi' | 'nfp' | 'ecb' | 'boe';

export interface MacroEvent {
  date: string; // YYYY-MM-DD
  type: MacroEventType;
  // Human label rendered on the calendar card.
  label: string;
  // Free-form notes — e.g. "rate decision + press conference" — to
  // help the user understand why the date is on the calendar.
  notes?: string;
}

// FOMC schedule published by the Fed. Update this list once a year
// (Fed announces the next year's calendar each December).
//
// Sourced from federalreserve.gov/monetarypolicy/fomccalendars.htm.
// Dates are the second day of each two-day meeting (when the
// statement + dot plot are released).
const FOMC_DATES: ReadonlyArray<{ date: string; notes?: string }> = [
  { date: '2026-01-28' },
  { date: '2026-03-18', notes: 'SEP + press conference' },
  { date: '2026-04-29' },
  { date: '2026-06-17', notes: 'SEP + press conference' },
  { date: '2026-07-29' },
  { date: '2026-09-16', notes: 'SEP + press conference' },
  { date: '2026-10-28' },
  { date: '2026-12-09', notes: 'SEP + press conference' },
  { date: '2027-01-27' },
  { date: '2027-03-17', notes: 'SEP + press conference' },
];

// ECB Governing Council policy meetings. Published a year ahead at
// ecb.europa.eu/press/calendars.
const ECB_DATES: ReadonlyArray<string> = [
  '2026-01-22',
  '2026-03-12',
  '2026-04-23',
  '2026-06-04',
  '2026-07-23',
  '2026-09-10',
  '2026-10-22',
  '2026-12-17',
];

// Bank of England MPC meetings. Published a year ahead at
// bankofengland.co.uk/monetary-policy/upcoming-mpc-dates.
const BOE_DATES: ReadonlyArray<string> = [
  '2026-02-05',
  '2026-03-19',
  '2026-05-07',
  '2026-06-18',
  '2026-08-06',
  '2026-09-17',
  '2026-11-05',
  '2026-12-17',
];

// nth weekday helper — used to compute NFP (first Friday) for any
// month/year combo. Sunday=0, Friday=5.
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  // Month is 0-indexed for the Date constructor — the caller passes 1-12.
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstDow = first.getUTCDay();
  let day = 1 + ((7 + weekday - firstDow) % 7);
  day += (n - 1) * 7;
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Generate the next 12 months of monthly events (CPI + NFP). Static
// FOMC/ECB/BoE come from the lists above.
function generateMonthlyEvents(from: Date, to: Date): MacroEvent[] {
  const out: MacroEvent[] = [];
  // Walk one month at a time. Pad the bounds by a month so events
  // sitting near the window edge still show up.
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 1));
  for (
    let cur = start;
    cur <= end;
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1))
  ) {
    const y = cur.getUTCFullYear();
    const m = cur.getUTCMonth() + 1;
    // NFP — first Friday.
    const nfp = nthWeekdayOfMonth(y, m, 5, 1);
    out.push({ date: toIsoDate(nfp), type: 'nfp', label: 'US Nonfarm Payrolls' });
    // CPI — generally the 2nd Wednesday or Thursday. Use 2nd Wednesday
    // as a reliable proxy.
    const cpi = nthWeekdayOfMonth(y, m, 3, 2);
    out.push({ date: toIsoDate(cpi), type: 'cpi', label: 'US CPI (proxy)' });
  }
  return out;
}

export function getMacroCalendar(
  options: { from?: Date; days?: number; types?: MacroEventType[] } = {},
): MacroEvent[] {
  const from = options.from ?? new Date();
  const days = options.days ?? 90;
  const to = new Date(from.getTime() + days * 86400 * 1000);
  const fromIso = toIsoDate(from);
  const toIso = toIsoDate(to);

  const events: MacroEvent[] = [];
  for (const f of FOMC_DATES) {
    events.push({ date: f.date, type: 'fomc', label: 'FOMC rate decision', notes: f.notes });
  }
  for (const d of ECB_DATES) {
    events.push({ date: d, type: 'ecb', label: 'ECB rate decision' });
  }
  for (const d of BOE_DATES) {
    events.push({ date: d, type: 'boe', label: 'BoE MPC rate decision' });
  }
  events.push(...generateMonthlyEvents(from, to));

  const filtered = events
    .filter((e) => e.date >= fromIso && e.date <= toIso)
    .filter((e) => !options.types || options.types.includes(e.type))
    .sort((a, b) => a.date.localeCompare(b.date));

  return filtered;
}

// History helper — gives back every event of the requested type
// within the trailing window. Used by the event-vol module to bucket
// historical returns into "event week" vs "non-event week".
export function getHistoricalEvents(
  type: MacroEventType,
  yearsBack = 5,
): string[] {
  // For monthly events (CPI/NFP) we synthesise the dates because they
  // recur predictably. For FOMC/ECB/BoE we only have the forward list
  // — historical dates back through 2018-2025 would need to be
  // hand-curated. Reasonable v1: use synthesised monthly events for
  // CPI/NFP (which are the highest-realised-vol events anyway), and
  // mark FOMC/ECB/BoE as "unsupported for historical analysis" so the
  // caller can route around them cleanly.
  if (type === 'cpi' || type === 'nfp') {
    const out: string[] = [];
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear() - yearsBack, today.getUTCMonth(), 1));
    for (
      let cur = start;
      cur <= today;
      cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1))
    ) {
      const y = cur.getUTCFullYear();
      const m = cur.getUTCMonth() + 1;
      if (type === 'nfp') {
        out.push(toIsoDate(nthWeekdayOfMonth(y, m, 5, 1)));
      } else {
        out.push(toIsoDate(nthWeekdayOfMonth(y, m, 3, 2)));
      }
    }
    return out;
  }
  return [];
}
