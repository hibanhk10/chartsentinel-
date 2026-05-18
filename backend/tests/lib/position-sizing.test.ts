import { describe, expect, it } from 'vitest';
import { calculatePositionSize } from '../../src/lib/position-sizing';

describe('calculatePositionSize', () => {
  it('returns shares = floor(risk / per-share-risk) for a long', () => {
    const r = calculatePositionSize({
      accountSize: 10_000,
      entry: 100,
      stop: 95,
      riskPercent: 1,
    });
    expect('shares' in r).toBe(true);
    if (!('shares' in r)) return;
    // Risk = $100, per-share = $5, shares = floor(100/5) = 20.
    expect(r.shares).toBe(20);
    expect(r.riskAmount).toBe(100);
    expect(r.perShareRisk).toBe(5);
    expect(r.notional).toBe(2000);
  });

  it('honours riskDollars when provided', () => {
    const r = calculatePositionSize({
      accountSize: 10_000,
      entry: 100,
      stop: 95,
      riskDollars: 50,
    });
    if (!('shares' in r)) throw new Error('expected success');
    expect(r.shares).toBe(10);
    expect(r.riskAmount).toBe(50);
  });

  it('rejects entry == stop', () => {
    const r = calculatePositionSize({
      accountSize: 10_000,
      entry: 100,
      stop: 100,
      riskPercent: 1,
    });
    expect('error' in r).toBe(true);
  });

  it('rejects long with stop above entry', () => {
    const r = calculatePositionSize({
      accountSize: 10_000,
      entry: 100,
      stop: 105,
      riskPercent: 1,
      side: 'long',
    });
    expect('error' in r).toBe(true);
  });

  it('rejects short with stop below entry', () => {
    const r = calculatePositionSize({
      accountSize: 10_000,
      entry: 100,
      stop: 95,
      riskPercent: 1,
      side: 'short',
    });
    expect('error' in r).toBe(true);
  });

  it('surfaces a warning when notional exceeds 50% of account', () => {
    // Tight stop → big position. 1% risk of $10k = $100. Stop $0.20
    // away → 500 shares × $100 = $50k notional = 500% of account.
    const r = calculatePositionSize({
      accountSize: 10_000,
      entry: 100,
      stop: 99.8,
      riskPercent: 1,
    });
    if (!('shares' in r)) throw new Error('expected success');
    expect(r.rrWarning).toBeDefined();
  });

  it('rejects bad account size', () => {
    expect('error' in calculatePositionSize({
      accountSize: -1,
      entry: 100,
      stop: 95,
      riskPercent: 1,
    })).toBe(true);
  });
});
