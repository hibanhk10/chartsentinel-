import { describe, expect, it } from 'vitest';
import { decomposeExposure, getTickerProfile } from '../../src/lib/exposure';

describe('getTickerProfile', () => {
  it('returns a profile for a covered ticker', () => {
    const p = getTickerProfile('AAPL');
    expect(p).not.toBeNull();
    expect(p!.assetClass).toBe('equity');
    expect(p!.factors.tech).toBeGreaterThan(0);
  });

  it('returns null for unknown tickers', () => {
    expect(getTickerProfile('NOT-A-REAL-TICKER')).toBeNull();
  });

  it('matches case-insensitively', () => {
    expect(getTickerProfile('aapl')!.ticker).toBe('AAPL');
  });
});

describe('decomposeExposure', () => {
  it('aggregates a 50/50 tech / bond split into the right factor weights', () => {
    const b = decomposeExposure([
      { ticker: 'QQQ', weight: 0.5 },
      { ticker: 'TLT', weight: 0.5 },
    ]);
    expect(b.totalWeight).toBeCloseTo(1, 6);
    expect(b.classifiedWeight).toBeCloseTo(1, 6);
    expect(b.unclassifiedWeight).toBe(0);
    expect(b.byAssetClass['etf-equity']).toBeCloseTo(0.5, 6);
    expect(b.byAssetClass['etf-bond']).toBeCloseTo(0.5, 6);
    // QQQ tech = 0.7 weighted at 0.5 → 0.35.
    expect(b.factors.tech).toBeCloseTo(0.35, 6);
    // TLT rate = 1.0 weighted at 0.5 → 0.5.
    expect(b.factors.rate).toBeCloseTo(0.5, 6);
  });

  it('buckets unclassified tickers without crashing', () => {
    const b = decomposeExposure([
      { ticker: 'AAPL', weight: 0.5 },
      { ticker: 'WIDGET', weight: 0.5 },
    ]);
    expect(b.unclassifiedTickers).toEqual(['WIDGET']);
    expect(b.unclassifiedWeight).toBeCloseTo(0.5, 6);
  });

  it('signs USD exposure correctly for FX pairs', () => {
    // 100% EURUSD = structurally short USD.
    const b = decomposeExposure([{ ticker: 'EURUSD=X', weight: 1.0 }]);
    expect(b.factors.usd).toBeCloseTo(-1.0, 6);
  });
});
