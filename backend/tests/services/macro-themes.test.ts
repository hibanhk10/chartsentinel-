import { describe, expect, it } from 'vitest';
import { __normaliseThemeForTests as normaliseTheme } from '../../src/services/macro-themes.service';

// Synthetic news fixture — what the cluster service hands the
// normaliser. publishedAt is set far back so the "isoToRelative"
// branch goes through the days-ago path rather than minutes-ago.
const NEWS = [
    { id: 'a1', title: 'Fed signals slower cut cadence', summary: '', publishedAt: '2026-05-19T10:00:00Z', source: 'WSJ', category: 'Markets', url: 'https://x/1', imageUrl: null, author: 'WSJ' },
    { id: 'a2', title: 'Hyperscalers trim capex guides', summary: '', publishedAt: '2026-05-19T11:00:00Z', source: 'FT', category: 'Markets', url: 'https://x/2', imageUrl: null, author: 'FT' },
    { id: 'a3', title: 'Brent backwardation steepens', summary: '', publishedAt: '2026-05-19T12:00:00Z', source: 'Reuters', category: 'Markets', url: 'https://x/3', imageUrl: null, author: 'Reuters' },
];

describe('normaliseTheme', () => {
    it('produces a complete theme from valid LLM output', () => {
        const raw = {
            id: 'ai-capex-reset',
            title: 'AI capex reality check',
            sentiment: 'bearish',
            momentum: -2,
            impact: 'high',
            summary: 'Hyperscaler capex guides have softened materially.',
            tickers: ['nvda', 'msft', 'avgo'],
            regions: ['US'],
            headlineIds: [1],
        };
        const t = normaliseTheme(raw, NEWS as never);
        expect(t).not.toBeNull();
        expect(t!.title).toBe('AI capex reality check');
        expect(t!.sentiment).toBe('bearish');
        expect(t!.momentum).toBe(-2);
        expect(t!.impact).toBe('high');
        expect(t!.tickers).toEqual(['NVDA', 'MSFT', 'AVGO']);
        expect(t!.headlines).toHaveLength(1);
        expect(t!.headlines[0].text).toBe('Hyperscalers trim capex guides');
        expect(t!.headlines[0].url).toBe('https://x/2');
    });

    it('returns null for themes with zero supporting headlines (rejects inventions)', () => {
        const raw = {
            id: 'invented',
            title: 'Theme with no evidence',
            sentiment: 'bullish',
            momentum: 1,
            impact: 'medium',
            summary: 'Pure speculation.',
            tickers: ['XYZ'],
            regions: ['US'],
            headlineIds: [],
        };
        expect(normaliseTheme(raw, NEWS as never)).toBeNull();
    });

    it('clamps momentum to [-3, 3] and falls back on garbage inputs', () => {
        const raw = {
            title: 'Some theme',
            summary: 'Summary text here.',
            sentiment: 'mauve',           // not a valid enum → falls back to neutral
            momentum: 99,                  // clamped to 3
            impact: 'extreme',             // not a valid enum → falls back to medium
            headlineIds: [0],
        };
        const t = normaliseTheme(raw, NEWS as never);
        expect(t).not.toBeNull();
        expect(t!.sentiment).toBe('neutral');
        expect(t!.momentum).toBe(3);
        expect(t!.impact).toBe('medium');
    });

    it('rejects themes missing required title or summary', () => {
        expect(normaliseTheme({ title: '', summary: 'x', headlineIds: [0] }, NEWS as never)).toBeNull();
        expect(normaliseTheme({ title: 'x', summary: '', headlineIds: [0] }, NEWS as never)).toBeNull();
    });

    it('deduplicates headlines and ignores out-of-range ids', () => {
        const raw = {
            title: 'Theme',
            summary: 'Summary.',
            sentiment: 'neutral',
            momentum: 0,
            impact: 'low',
            headlineIds: [0, 0, 99, 'a2', 2], // dup + OOR + parseable string + valid
        };
        // 0 → keep, 0 → dup, 99 → OOR, "a2" → parseInt strips letters → 2,
        // 2 → dup. Unique resolved set: [0, 2] = WSJ + Reuters.
        const t = normaliseTheme(raw, NEWS as never);
        expect(t).not.toBeNull();
        expect(t!.headlines).toHaveLength(2);
        expect(t!.headlines.map((h) => h.source)).toEqual(['WSJ', 'Reuters']);
    });
});
