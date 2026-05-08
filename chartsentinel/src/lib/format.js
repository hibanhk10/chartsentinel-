// Smart number / time formatters used across the dashboard. Built on
// Intl.NumberFormat so locale and abbreviation behaviour are consistent
// (and free) instead of every component rolling its own toFixed() logic.
//
// Design choice: every helper takes a primitive (or null/undefined) and
// returns a string. They never throw — bad input always renders "—".
// Components that want fancier fallbacks (e.g. a pulsing skeleton) can
// short-circuit to their own UI before calling these.

const COMPACT_FMT = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
});

const MONEY_FMT = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
});

const MONEY_COMPACT_FMT = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
});

const PCT_FMT = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

// Auto-switching money formatter: $1,234 below 10k, $12.3K through
// $999K, $1.23M past that. Matches the way Bloomberg / Refinitiv render
// numbers in compact tables.
export function fmtMoney(value) {
    if (value == null || Number.isNaN(value)) return '—';
    if (Math.abs(value) < 10_000) return MONEY_FMT.format(value);
    return MONEY_COMPACT_FMT.format(value);
}

// Compact integer or float: 1.2K, 3.4M, 7.8B. Uncolored — caller picks
// tinting based on direction.
export function fmtCompact(value) {
    if (value == null || Number.isNaN(value)) return '—';
    return COMPACT_FMT.format(value);
}

// Percentage with explicit + on positives. Input is the raw fractional
// value (0.025 → "+2.50%"), matching what financial APIs return for
// daily change.
export function fmtPercent(value) {
    if (value == null || Number.isNaN(value)) return '—';
    const formatted = PCT_FMT.format(value);
    return value > 0 ? `+${formatted}` : formatted;
}

// Same as fmtPercent but takes a value already in points (2.5 → "+2.50%")
// — used by the screener day-change column where the API returns points.
export function fmtPercentPoints(value) {
    if (value == null || Number.isNaN(value)) return '—';
    const fixed = value.toFixed(2);
    return value > 0 ? `+${fixed}%` : `${fixed}%`;
}

// Relative time ("3m ago", "2h ago", "yesterday") for compact log/feed
// rows. Crosses to absolute date past 7d so the hover-context isn't
// "245 days ago".
const RELATIVE_FMT = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
const ABS_FMT = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

export function fmtRelativeTime(input) {
    if (!input) return '—';
    const date = input instanceof Date ? input : new Date(input);
    const diffMs = date.getTime() - Date.now();
    const absMs = Math.abs(diffMs);
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;

    if (absMs < minute) return 'just now';
    if (absMs < hour) return RELATIVE_FMT.format(Math.round(diffMs / minute), 'minute');
    if (absMs < day) return RELATIVE_FMT.format(Math.round(diffMs / hour), 'hour');
    if (absMs < week) return RELATIVE_FMT.format(Math.round(diffMs / day), 'day');
    return ABS_FMT.format(date);
}

// Absolute date — used in tooltips and detail panels where exact value
// matters more than "14 days ago".
const FULL_DATE_FMT = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export function fmtAbsoluteDate(input) {
    if (!input) return '—';
    const date = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(date.getTime())) return '—';
    return FULL_DATE_FMT.format(date);
}
