// Shared formatting helpers for composite-score values.
//
// Pulled out of Portfolio.jsx, Signals.jsx, etc. so they can be unit-tested
// without mounting the surrounding component tree, and so the colour bands
// and signal labels stay consistent across surfaces. Pure functions only.

export const SIGNAL_LABEL = {
    strong_buy: 'Strong buy',
    buy: 'Buy',
    neutral: 'Neutral',
    sell: 'Sell',
    strong_sell: 'Strong sell',
};

// Tailwind class for a score on the -100..+100 scale. Symmetric bands
// around zero so a +30 reads as visually equivalent to a -30.
export function scoreTint(score) {
    if (score == null || Number.isNaN(score)) return 'text-text-muted';
    if (score >= 60) return 'text-emerald-300';
    if (score >= 25) return 'text-emerald-400';
    if (score <= -60) return 'text-red-300';
    if (score <= -25) return 'text-red-400';
    return 'text-text-secondary';
}

// Map a raw score to its server-side signal label. Mirrors the logic in
// engine.js's computeCompositeScore so the frontend can label a number
// it didn't fetch through the score endpoint (e.g. portfolio aggregate).
export function signalForScore(score) {
    if (score == null || Number.isNaN(score)) return 'neutral';
    if (score >= 60) return 'strong_buy';
    if (score >= 25) return 'buy';
    if (score <= -60) return 'strong_sell';
    if (score <= -25) return 'sell';
    return 'neutral';
}

// Signed integer with explicit '+' for positives. Used everywhere a raw
// composite score is rendered. Returns '—' for null/NaN.
export function fmtSignedInt(value) {
    if (value == null || Number.isNaN(value)) return '—';
    const n = Math.round(value);
    return `${n >= 0 ? '+' : ''}${n}`;
}

// Signed percentage with one decimal place. Used by the seasonality
// calendar tiles and the backtester's stat cards.
export function fmtSignedPct(value) {
    if (value == null || Number.isNaN(value)) return '—';
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}
