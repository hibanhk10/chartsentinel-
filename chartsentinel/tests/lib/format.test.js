import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    fmtMoney,
    fmtCompact,
    fmtPercent,
    fmtPercentPoints,
    fmtRelativeTime,
    fmtAbsoluteDate,
} from '../../src/lib/format';

describe('fmtMoney', () => {
    it('uses full notation under $10K', () => {
        expect(fmtMoney(123.45)).toBe('$123.45');
        expect(fmtMoney(9999)).toBe('$9,999.00');
    });

    it('switches to compact at $10K and above', () => {
        expect(fmtMoney(10_000)).toBe('$10K');
        expect(fmtMoney(1_234_567)).toBe('$1.23M');
    });

    it('renders missing values as a dash', () => {
        expect(fmtMoney(null)).toBe('—');
        expect(fmtMoney(NaN)).toBe('—');
    });

    it('handles negatives', () => {
        expect(fmtMoney(-1500)).toBe('-$1,500.00');
        expect(fmtMoney(-2_500_000)).toBe('-$2.5M');
    });
});

describe('fmtCompact', () => {
    it('compacts large numbers', () => {
        expect(fmtCompact(1_500)).toBe('1.5K');
        expect(fmtCompact(2_300_000)).toBe('2.3M');
    });

    it('keeps small numbers as-is', () => {
        expect(fmtCompact(42)).toBe('42');
    });

    it('handles missing values', () => {
        expect(fmtCompact(undefined)).toBe('—');
    });
});

describe('fmtPercent', () => {
    it('takes fractions and prefixes positives with +', () => {
        expect(fmtPercent(0.025)).toBe('+2.50%');
        expect(fmtPercent(-0.013)).toBe('-1.30%');
        expect(fmtPercent(0)).toBe('0.00%');
    });

    it('handles missing values', () => {
        expect(fmtPercent(null)).toBe('—');
    });
});

describe('fmtPercentPoints', () => {
    it('takes points and prefixes positives with +', () => {
        expect(fmtPercentPoints(2.5)).toBe('+2.50%');
        expect(fmtPercentPoints(-1.3)).toBe('-1.30%');
    });
});

describe('fmtRelativeTime', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-08T12:00:00Z'));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('says "just now" within the same minute', () => {
        expect(fmtRelativeTime(new Date('2026-05-08T11:59:30Z'))).toBe('just now');
    });

    it('renders minutes ago', () => {
        expect(fmtRelativeTime(new Date('2026-05-08T11:55:00Z'))).toBe('5 minutes ago');
    });

    it('renders hours ago', () => {
        expect(fmtRelativeTime(new Date('2026-05-08T09:00:00Z'))).toBe('3 hours ago');
    });

    it('renders days ago for last week', () => {
        expect(fmtRelativeTime(new Date('2026-05-06T12:00:00Z'))).toBe('2 days ago');
    });

    it('switches to absolute date past 7 days', () => {
        // 14 days ago — formatter falls back to "Apr 24, 2026" form
        const result = fmtRelativeTime(new Date('2026-04-24T12:00:00Z'));
        expect(result).toMatch(/Apr 24, 2026/);
    });

    it('handles null', () => {
        expect(fmtRelativeTime(null)).toBe('—');
    });
});

describe('fmtAbsoluteDate', () => {
    it('renders a readable date+time string', () => {
        const out = fmtAbsoluteDate(new Date('2026-05-08T14:30:00Z'));
        // Locale-ish; strict shape isn't worth pinning, just that it has
        // year + month + a time component.
        expect(out).toMatch(/2026/);
        expect(out).toMatch(/May/);
    });

    it('handles invalid input', () => {
        expect(fmtAbsoluteDate('not-a-date')).toBe('—');
        expect(fmtAbsoluteDate(null)).toBe('—');
    });
});
