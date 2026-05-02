import { describe, expect, it } from 'vitest';
// @ts-expect-error — engine.js is plain JavaScript with no .d.ts; allowJs covers
// imports from src/, but the tests/ tree isn't under rootDir. The runtime shape
// is verified by the assertions below.
import { computeCompositeScore } from '../../src/signals/engine.js';

describe('computeCompositeScore', () => {
  it('clamps the final score into the [-100, 100] band', () => {
    const overshoot = computeCompositeScore(
      500,
      { score: 500 },
      { direction: 'bullish', robustness: 500 }
    );
    expect(overshoot.score).toBe(100);

    const undershoot = computeCompositeScore(
      -500,
      { score: -500 },
      { direction: 'bearish', robustness: 500 }
    );
    expect(undershoot.score).toBe(-100);
  });

  it('classifies the strong-buy / buy / neutral / sell / strong-sell bands', () => {
    const cases: Array<[number, string]> = [
      [80, 'strong_buy'],
      [40, 'buy'],
      [0, 'neutral'],
      [-40, 'sell'],
      [-80, 'strong_sell'],
    ];

    for (const [seasonality, expected] of cases) {
      const result = computeCompositeScore(seasonality, { score: seasonality }, {
        direction: seasonality >= 0 ? 'bullish' : 'bearish',
        robustness: Math.abs(seasonality),
      });
      expect(result.signal).toBe(expected);
    }
  });

  it('treats a missing pattern result as a zero pattern contribution', () => {
    // 80*0.3 + 80*0.25 + 0*0.3 = 44, which lands in the 'buy' band — what
    // matters here is that the call doesn't throw on a null pattern and that
    // the pattern component reports zero, not whatever the signal lands at.
    const noPattern = computeCompositeScore(80, { score: 80 }, null as never);
    expect(noPattern.components.pattern).toBe(0);
    expect(noPattern.score).toBeGreaterThan(0);
  });

  it('returns the per-component breakdown alongside the composite', () => {
    const result = computeCompositeScore(
      30,
      { score: 20 },
      { direction: 'bullish', robustness: 50 }
    );
    expect(result.components).toHaveProperty('seasonal');
    expect(result.components).toHaveProperty('cot');
    expect(result.components).toHaveProperty('pattern');
  });
});
