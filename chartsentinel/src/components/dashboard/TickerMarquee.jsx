import { useEffect, useState } from 'react';
import { API_CONFIG } from '../../config/api';
import { fmtPercentPoints } from '../../lib/format';

// Bloomberg-style scrolling band of major-ticker prices, anchored under
// the dashboard top bar. Polls the /signals/screener endpoint every 60s
// — the engine itself caches for an hour, so the marquee just gets a
// fresh slice of whatever's already in cache and we're not hammering
// Yahoo.
//
// Render strategy: duplicate the row twice and CSS-translate it across
// its own width over 60 seconds. Pure CSS animation, no JS scroll work,
// so the marquee never blocks the main thread or shows scroll jank.

const POLL_MS = 60_000;
const TICKERS_TO_SHOW = 12;

// Curated list — the eight FX majors plus four crypto / equity index
// proxies. Keeps the band readable; rotating in 80 tickers makes it a
// blur. Same ticker IDs the screener returns.
const PREFERRED_TICKERS = new Set([
    'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X',
    'AUDUSD=X', 'NZDUSD=X', 'USDCAD=X', 'BTC-USD',
    'ETH-USD', 'SOL-USD', 'GC=F', 'CL=F',
]);

const TickerMarquee = () => {
    const [rows, setRows] = useState([]);
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    }, []);

    useEffect(() => {
        let active = true;
        const fetchOnce = async () => {
            try {
                const res = await fetch(`${API_CONFIG.baseURL}/signals/screener`, {
                    headers: API_CONFIG.headers,
                });
                if (!res.ok) return;
                const data = await res.json();
                if (!active) return;

                const all = Array.isArray(data?.assets) ? data.assets : [];
                // Filter to the curated list, fall back to top-by-score
                // if too few matches (curated list missing in cache, etc).
                let chosen = all.filter((a) => PREFERRED_TICKERS.has(a.ticker));
                if (chosen.length < 6) chosen = all.slice(0, TICKERS_TO_SHOW);
                else chosen = chosen.slice(0, TICKERS_TO_SHOW);
                setRows(chosen);
            } catch {
                // Silent — marquee is decorative, never block the page.
            }
        };

        fetchOnce();
        const id = setInterval(fetchOnce, POLL_MS);
        return () => {
            active = false;
            clearInterval(id);
        };
    }, []);

    // Static fallback if no data yet — 1px band so the layout doesn't
    // jump when data lands.
    if (rows.length === 0) {
        return <div className="h-9 bg-white/[0.02] border-b border-white/5" aria-hidden="true" />;
    }

    // Duplicate the row so the CSS marquee loops seamlessly.
    const sequence = [...rows, ...rows];

    return (
        <div className="relative h-9 bg-black/40 border-b border-white/5 overflow-hidden text-xs flex items-center backdrop-blur-sm">
            <div
                className={`flex whitespace-nowrap will-change-transform ${reduced ? '' : 'animate-marquee'}`}
                style={{ animationDuration: '60s' }}
            >
                {sequence.map((row, i) => {
                    const tint =
                        row.dayChange > 0
                            ? 'text-emerald-300'
                            : row.dayChange < 0
                              ? 'text-red-300'
                              : 'text-text-muted';
                    return (
                        <span key={`${row.ticker}-${i}`} className="mx-6 flex items-center gap-2">
                            <span className="font-mono text-white">{row.ticker}</span>
                            <span className={`font-mono ${tint}`}>{fmtPercentPoints(row.dayChange)}</span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

export default TickerMarquee;
