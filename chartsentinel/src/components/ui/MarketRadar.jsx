import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const SYMBOLS = [
    { symbol: 'BTC', name: 'Bitcoin', pair: 'BTCUSDT' },
    { symbol: 'ETH', name: 'Ethereum', pair: 'ETHUSDT' },
    { symbol: 'SOL', name: 'Solana', pair: 'SOLUSDT' },
    { symbol: 'BNB', name: 'Binance Coin', pair: 'BNBUSDT' },
    { symbol: 'XRP', name: 'Ripple', pair: 'XRPUSDT' },
    { symbol: 'DOGE', name: 'Dogecoin', pair: 'DOGEUSDT' },
    { symbol: 'ADA', name: 'Cardano', pair: 'ADAUSDT' },
    { symbol: 'AVAX', name: 'Avalanche', pair: 'AVAXUSDT' },
];

const categoryColors = {
    Crypto: '#d946ef',
};

// Inline SVGs replace lucide-react.
function TrendingUpIcon({ className = '' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    );
}
function TrendingDownIcon({ className = '' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
            <polyline points="16 17 22 17 22 11" />
        </svg>
    );
}
function MinusIcon({ className = '' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

export default function MarketRadar() {
    const [assets, setAssets] = useState([]);
    const [lastUpdate, setLastUpdate] = useState('—');

    useEffect(() => {
        let cancelled = false;
        const fetchCrypto = async () => {
            try {
                // Binance accepts a JSON-encoded list of symbols on its
                // 24hr ticker endpoint; one request beats N parallel calls.
                const url
                    = 'https://api.binance.com/api/v3/ticker/24hr?symbols='
                    + encodeURIComponent(JSON.stringify(SYMBOLS.map((s) => s.pair)));
                const res = await fetch(url);
                const data = await res.json();
                if (cancelled || !Array.isArray(data)) return;

                const fetched = data.map((d) => {
                    const info = SYMBOLS.find((s) => s.pair === d.symbol);
                    return {
                        symbol: info?.symbol || d.symbol,
                        name: info?.name || d.symbol,
                        price: parseFloat(d.lastPrice).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                        }),
                        change: parseFloat(d.priceChange),
                        changePercent: parseFloat(d.priceChangePercent),
                        category: 'Crypto',
                    };
                });
                fetched.sort(
                    (a, b) =>
                        SYMBOLS.findIndex((s) => s.symbol === a.symbol)
                        - SYMBOLS.findIndex((s) => s.symbol === b.symbol)
                );
                setAssets(fetched);
                setLastUpdate(new Date().toLocaleTimeString());
            } catch {
                // Keep existing values on a transient fetch hiccup.
            }
        };
        fetchCrypto();
        const id = setInterval(fetchCrypto, 10000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    return (
        <div className="flex flex-col h-full bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                <span className="text-[10px] font-black tracking-widest uppercase text-primary">
                    Market Radar
                </span>
                <span className="text-text-muted text-[9px] font-mono">Updated: {lastUpdate}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
                {assets.length === 0 && (
                    <div className="p-4 text-center text-text-muted text-[10px] uppercase tracking-widest mt-4">
                        Connecting to live exchange...
                    </div>
                )}
                {assets.map((asset, i) => {
                    const isPos = asset.changePercent > 0.005;
                    const isNeg = asset.changePercent < -0.005;
                    const color = categoryColors[asset.category] || '#d946ef';
                    const trendColor = isPos ? 'text-green-400' : isNeg ? 'text-red-400' : 'text-text-muted';
                    return (
                        <motion.div
                            key={asset.symbol}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                        >
                            <div
                                className="w-10 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${color}15` }}
                            >
                                <span className="text-[9px] font-black" style={{ color }}>
                                    {asset.symbol}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-text-primary text-[11px] font-bold truncate">{asset.name}</p>
                                <span
                                    className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                                    style={{ backgroundColor: `${color}15`, color }}
                                >
                                    {asset.category}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-text-primary text-xs font-mono font-black">${asset.price}</p>
                                <div className="flex items-center justify-end gap-1 text-[10px] font-bold">
                                    {isPos && <TrendingUpIcon className="w-3 h-3 text-green-400" />}
                                    {isNeg && <TrendingDownIcon className="w-3 h-3 text-red-400" />}
                                    {!isPos && !isNeg && <MinusIcon className="w-3 h-3 text-text-muted" />}
                                    <span className={trendColor}>
                                        {asset.changePercent >= 0 ? '+' : ''}
                                        {asset.changePercent.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
