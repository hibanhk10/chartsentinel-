import { describe, expect, it } from 'vitest';
import { detectTickerAnomaly, rankAnomalies } from '../../src/lib/anomaly';

function isoDay(offset: number): string {
    const d = new Date('2026-01-01T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
}

// Build a price series that's quiet until the final bar, then jumps.
// Volume mirrors the price spike so we can check both z-scores fire.
function spikeySeries(spikePct: number, volSpikeMultiplier = 1): { date: string; close: number; volume: number }[] {
    const bars: { date: string; close: number; volume: number }[] = [];
    let price = 100;
    for (let i = 0; i < 60; i++) {
        // Tiny noise — keeps the trailing stddev small so the spike
        // shows up as a high-z print rather than washing into the noise.
        price *= 1 + (Math.sin(i / 3) * 0.001);
        // Volume jitters around 1M; without variance the stddev would
        // be zero and the z-score test would short-circuit to null.
        const vol = 1_000_000 + Math.sin(i) * 50_000;
        bars.push({ date: isoDay(i), close: price, volume: vol });
    }
    const last = bars[bars.length - 1];
    bars.push({
        date: isoDay(60),
        close: last.close * (1 + spikePct),
        volume: 1_000_000 * volSpikeMultiplier,
    });
    return bars;
}

describe('detectTickerAnomaly', () => {
    it('returns empty result on short series', () => {
        const result = detectTickerAnomaly('AAPL', [
            { date: isoDay(0), close: 100 },
            { date: isoDay(1), close: 101 },
        ]);
        expect(result.returnZ).toBeNull();
        expect(result.volumeZ).toBeNull();
        expect(result.maxZ).toBeNull();
    });

    it('flags a price spike with high return z-score', () => {
        const bars = spikeySeries(0.05); // 5% jump on tail
        const result = detectTickerAnomaly('TEST', bars);
        expect(result.returnZ).not.toBeNull();
        expect(result.returnZ!).toBeGreaterThan(3);
        expect(result.type).toBe('price');
        expect(result.return).toBeCloseTo(0.05, 3);
    });

    it('flags a volume spike when price is calm', () => {
        const bars = spikeySeries(0.001, 8); // negligible price move, 8× volume
        const result = detectTickerAnomaly('TEST', bars);
        expect(result.volumeZ).not.toBeNull();
        expect(result.volumeZ!).toBeGreaterThan(3);
        expect(result.type).toBe('volume');
    });

    it('reports asOf = the last bar date', () => {
        const bars = spikeySeries(0.03);
        const result = detectTickerAnomaly('TEST', bars);
        expect(result.asOf).toBe(isoDay(60));
    });
});

describe('rankAnomalies', () => {
    it('drops sub-threshold rows and sorts by descending maxZ', () => {
        const rows = [
            { ticker: 'A', asOf: '2026-01-01', return: 0.01, returnZ: 1.5, volumeZ: 1.0, maxZ: 1.5, type: 'price' as const },
            { ticker: 'B', asOf: '2026-01-01', return: 0.04, returnZ: 4.5, volumeZ: 0.5, maxZ: 4.5, type: 'price' as const },
            { ticker: 'C', asOf: '2026-01-01', return: 0.02, returnZ: 2.5, volumeZ: 3.2, maxZ: 3.2, type: 'volume' as const },
        ];
        const ranked = rankAnomalies(rows, 2);
        expect(ranked.map((r) => r.ticker)).toEqual(['B', 'C']);
    });

    it('returns empty when no rows clear threshold', () => {
        const rows = [
            { ticker: 'A', asOf: '2026-01-01', return: 0.01, returnZ: 1.5, volumeZ: 1.0, maxZ: 1.5, type: 'price' as const },
        ];
        expect(rankAnomalies(rows, 2)).toEqual([]);
    });
});
