import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import RealtimeBinanceChart from '../ui/RealtimeBinanceChart';

// Premium terminal view ported in spirit from the preregister site's
// /terminal page. Uses Binance's public REST + WebSocket endpoints
// directly (no auth, CORS-friendly) so this works without extending
// the GhostLM-shaped backend.
//
// Live data sources:
//   - REST: api.binance.com/api/v3/ticker/24hr  (24h stats)
//   - REST: api.binance.com/api/v3/depth         (initial orderbook)
//   - WS:   stream.binance.com/ws/<symbol>@depth (orderbook deltas)
//   - WS:   stream.binance.com/ws/<symbol>@trade (recent trades)

const SYMBOLS = [
    { symbol: 'BTCUSDT', label: 'BTC / USDT' },
    { symbol: 'ETHUSDT', label: 'ETH / USDT' },
    { symbol: 'SOLUSDT', label: 'SOL / USDT' },
];

function formatPrice(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (value >= 1) return value.toFixed(2);
    return value.toFixed(4);
}

function formatAmount(value) {
    if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (value >= 1) return value.toFixed(2);
    return value.toFixed(4);
}

function timeAgo(ts) {
    const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    return `${Math.floor(sec / 3600)}h`;
}

function StatTile({ label, value, accent }) {
    return (
        <div className="px-4 py-3 rounded-xl bg-black/40 border border-white/5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">{label}</p>
            <p className={`text-base font-mono font-bold ${accent || 'text-text-primary'}`}>{value}</p>
        </div>
    );
}

export default function Terminal() {
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [stats24h, setStats24h] = useState(null);
    const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
    const [trades, setTrades] = useState([]);
    const tradesWsRef = useRef(null);
    const depthWsRef = useRef(null);

    // 24h ticker — refresh every 15s. The websocket carries deltas but the
    // 24h aggregate update is cheap to poll and survives WS drops.
    useEffect(() => {
        let cancelled = false;
        const fetch24h = async () => {
            try {
                const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
                const data = await res.json();
                if (cancelled) return;
                setStats24h({
                    price: parseFloat(data.lastPrice),
                    change: parseFloat(data.priceChange),
                    changePct: parseFloat(data.priceChangePercent),
                    high: parseFloat(data.highPrice),
                    low: parseFloat(data.lowPrice),
                    volume: parseFloat(data.volume),
                    quoteVolume: parseFloat(data.quoteVolume),
                });
            } catch {
                // Silent — the chart and ticker are independent feeds, so a
                // 24h fetch hiccup doesn't degrade the whole panel.
            }
        };
        fetch24h();
        const id = setInterval(fetch24h, 15000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [symbol]);

    // Orderbook snapshot + diff stream. The depth-stream returns updates
    // relative to a snapshot; we take the snapshot once per symbol and
    // then throw away the stream's diffs in favor of just polling the
    // top-of-book every 2s. Simpler than a full sequence-number reconciliation
    // and the visual difference is imperceptible at this update rate.
    useEffect(() => {
        let cancelled = false;
        const fetchDepth = async () => {
            try {
                const res = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=12`);
                const data = await res.json();
                if (cancelled) return;
                const map = (rows) => rows.map(([price, amount]) => ({
                    price: parseFloat(price),
                    amount: parseFloat(amount),
                }));
                setOrderBook({ bids: map(data.bids), asks: map(data.asks) });
            } catch {
                /* noop */
            }
        };
        fetchDepth();
        const id = setInterval(fetchDepth, 2000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [symbol]);

    // Recent trades — WebSocket stream. Drop the connection on symbol change
    // so we never have two streams open feeding stale-symbol trades.
    useEffect(() => {
        const lower = symbol.toLowerCase();
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${lower}@trade`);
        tradesWsRef.current = ws;
        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            const trade = {
                id: msg.t,
                price: parseFloat(msg.p),
                amount: parseFloat(msg.q),
                isBuyerMaker: msg.m,
                ts: msg.T,
            };
            setTrades((prev) => [trade, ...prev].slice(0, 20));
        };
        ws.onerror = () => {
            // Silent — Binance occasionally drops idle connections; the next
            // mount will reconnect when the user navigates back.
        };
        return () => {
            try { ws.close(); } catch { /* noop */ }
        };
    }, [symbol]);

    const isUp = stats24h && stats24h.changePct >= 0;
    const accent = isUp ? 'text-green-400' : 'text-red-400';
    const sign = isUp ? '+' : '';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            {/* Header: symbol selector + 24h stats */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-semibold mb-2">
                        Live Terminal
                    </p>
                    <div className="flex items-center gap-3">
                        <select
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                            {SYMBOLS.map((s) => (
                                <option key={s.symbol} value={s.symbol} className="bg-surface-dark">
                                    {s.label}
                                </option>
                            ))}
                        </select>
                        {stats24h && (
                            <div className="flex items-baseline gap-3">
                                <span className="font-mono text-2xl font-bold text-text-primary">
                                    ${formatPrice(stats24h.price)}
                                </span>
                                <span className={`font-mono text-sm ${accent}`}>
                                    {sign}{formatPrice(stats24h.change)} ({sign}{stats24h.changePct.toFixed(2)}%)
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                {stats24h && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatTile label="24h High" value={`$${formatPrice(stats24h.high)}`} />
                        <StatTile label="24h Low" value={`$${formatPrice(stats24h.low)}`} />
                        <StatTile label="Volume" value={formatAmount(stats24h.volume)} />
                        <StatTile label="Quote Vol" value={`$${formatAmount(stats24h.quoteVolume)}`} />
                    </div>
                )}
            </div>

            {/* Main grid: chart left, orderbook + trades right */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Chart panel — spans 2 cols on xl */}
                <div className="xl:col-span-2 bg-black/30 border border-white/5 rounded-2xl p-4">
                    <RealtimeBinanceChart symbol={symbol} height={420} />
                </div>

                {/* Right rail */}
                <div className="space-y-6">
                    {/* Orderbook */}
                    <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold">
                                Order Book
                            </h3>
                            <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] text-primary font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                Live
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 text-[11px] font-mono">
                            <div>
                                <p className="text-[9px] uppercase tracking-[0.15em] text-text-muted mb-2">Bids</p>
                                <div className="space-y-1">
                                    {orderBook.bids.slice(0, 8).map((b, i) => (
                                        <div key={i} className="flex justify-between">
                                            <span className="text-green-400">{formatPrice(b.price)}</span>
                                            <span className="text-text-muted">{b.amount.toFixed(4)}</span>
                                        </div>
                                    ))}
                                    {orderBook.bids.length === 0 && (
                                        <p className="text-text-muted text-[10px] italic">Loading…</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] uppercase tracking-[0.15em] text-text-muted mb-2">Asks</p>
                                <div className="space-y-1">
                                    {orderBook.asks.slice(0, 8).map((a, i) => (
                                        <div key={i} className="flex justify-between">
                                            <span className="text-red-400">{formatPrice(a.price)}</span>
                                            <span className="text-text-muted">{a.amount.toFixed(4)}</span>
                                        </div>
                                    ))}
                                    {orderBook.asks.length === 0 && (
                                        <p className="text-text-muted text-[10px] italic">Loading…</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent trades */}
                    <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
                        <h3 className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-semibold mb-3">
                            Recent Trades
                        </h3>
                        <div className="space-y-1 text-[11px] font-mono max-h-[300px] overflow-y-auto pr-1">
                            {trades.length === 0 && (
                                <p className="text-text-muted text-[10px] italic">Listening to live trade stream…</p>
                            )}
                            {trades.map((t) => (
                                <div key={t.id} className="grid grid-cols-3 gap-2">
                                    <span className={t.isBuyerMaker ? 'text-red-400' : 'text-green-400'}>
                                        {formatPrice(t.price)}
                                    </span>
                                    <span className="text-text-secondary text-right">{t.amount.toFixed(4)}</span>
                                    <span className="text-text-muted text-right">{timeAgo(t.ts)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
