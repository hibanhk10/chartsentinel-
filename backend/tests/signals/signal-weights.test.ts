import { describe, expect, it } from 'vitest';
// @ts-expect-error — engine.js is JS without a .d.ts
import { normalizeSignalWeights, DEFAULT_SIGNAL_WEIGHTS } from '../../src/signals/engine.js';

describe('normalizeSignalWeights', () => {
  it('returns the default blend when given null/undefined', () => {
    expect(normalizeSignalWeights(null)).toEqual(DEFAULT_SIGNAL_WEIGHTS);
    expect(normalizeSignalWeights(undefined)).toEqual(DEFAULT_SIGNAL_WEIGHTS);
  });

  it('rescales arbitrary positive weights to sum to 1.0', () => {
    const out = normalizeSignalWeights({ seasonal: 30, cot: 30, pattern: 30, base: 10 });
    expect(out.seasonal + out.cot + out.pattern + out.base).toBeCloseTo(1, 5);
    expect(out.seasonal).toBeCloseTo(0.3, 5);
    expect(out.base).toBeCloseTo(0.1, 5);
  });

  it('clamps negative components to zero', () => {
    const out = normalizeSignalWeights({ seasonal: -5, cot: 1, pattern: 1, base: 1 });
    expect(out.seasonal).toBe(0);
    expect(out.cot + out.pattern + out.base).toBeCloseTo(1, 5);
  });

  it('falls back to defaults when total is zero', () => {
    const out = normalizeSignalWeights({ seasonal: 0, cot: 0, pattern: 0, base: 0 });
    expect(out).toEqual(DEFAULT_SIGNAL_WEIGHTS);
  });

  it('fills in missing keys from the default blend', () => {
    const out = normalizeSignalWeights({ seasonal: 1 });
    // With only seasonal supplied, the others fall back to their default
    // values (cot=0.25, pattern=0.3, base=0.15, total=1.7) and the row
    // gets normalised down.
    expect(out.seasonal + out.cot + out.pattern + out.base).toBeCloseTo(1, 5);
    expect(out.seasonal).toBeGreaterThan(0);
  });
});
