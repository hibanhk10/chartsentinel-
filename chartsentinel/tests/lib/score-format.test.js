import { describe, expect, it } from 'vitest';
import {
    SIGNAL_LABEL,
    scoreTint,
    signalForScore,
    fmtSignedInt,
    fmtSignedPct,
} from '../../src/lib/score-format';

describe('signalForScore', () => {
    it('mirrors engine.js bands for buy / sell / neutral', () => {
        expect(signalForScore(80)).toBe('strong_buy');
        expect(signalForScore(60)).toBe('strong_buy');
        expect(signalForScore(40)).toBe('buy');
        expect(signalForScore(25)).toBe('buy');
        expect(signalForScore(0)).toBe('neutral');
        expect(signalForScore(-25)).toBe('sell');
        expect(signalForScore(-60)).toBe('strong_sell');
        expect(signalForScore(-90)).toBe('strong_sell');
    });

    it('treats null and NaN as neutral', () => {
        expect(signalForScore(null)).toBe('neutral');
        expect(signalForScore(undefined)).toBe('neutral');
        expect(signalForScore(NaN)).toBe('neutral');
    });
});

describe('scoreTint', () => {
    it('uses the muted class for null/NaN inputs', () => {
        expect(scoreTint(null)).toBe('text-text-muted');
        expect(scoreTint(NaN)).toBe('text-text-muted');
    });

    it('is symmetric around zero', () => {
        // Same magnitude, opposite directions, should pick the same band.
        expect(scoreTint(70).replace('emerald', 'red')).toBe(scoreTint(-70));
        expect(scoreTint(40).replace('emerald', 'red')).toBe(scoreTint(-40));
    });

    it('uses the neutral text class inside the +/-25 band', () => {
        expect(scoreTint(0)).toBe('text-text-secondary');
        expect(scoreTint(20)).toBe('text-text-secondary');
        expect(scoreTint(-20)).toBe('text-text-secondary');
    });
});

describe('fmtSignedInt', () => {
    it('prefixes positives with +', () => {
        expect(fmtSignedInt(7)).toBe('+7');
        expect(fmtSignedInt(0)).toBe('+0');
    });

    it('keeps the - on negatives', () => {
        expect(fmtSignedInt(-12)).toBe('-12');
    });

    it('rounds floats', () => {
        expect(fmtSignedInt(3.7)).toBe('+4');
        expect(fmtSignedInt(-3.4)).toBe('-3');
    });

    it('renders missing values as a dash', () => {
        expect(fmtSignedInt(null)).toBe('—');
        expect(fmtSignedInt(NaN)).toBe('—');
    });
});

describe('fmtSignedPct', () => {
    it('prints one decimal with +/-', () => {
        expect(fmtSignedPct(2.345)).toBe('+2.3%');
        expect(fmtSignedPct(-1.05)).toBe('-1.1%');
    });

    it('renders missing values as a dash', () => {
        expect(fmtSignedPct(null)).toBe('—');
    });
});

describe('SIGNAL_LABEL', () => {
    it('covers every band signalForScore can return', () => {
        const bands = ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'];
        for (const b of bands) {
            expect(SIGNAL_LABEL[b]).toBeTruthy();
        }
    });
});
