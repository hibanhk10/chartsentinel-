import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import MarketRadar from '../ui/MarketRadar';

// Crypto Fear & Greed Index from alternative.me — public, no key.
// Returns a 0-100 score plus a label like "Extreme Fear" / "Greed".
// One request per mount + a 5-minute refresh is well below their
// rate cap.
function FearGreedGauge() {
    const [data, setData] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const fetchIndex = async () => {
            try {
                const res = await fetch('https://api.alternative.me/fng/?limit=1');
                const json = await res.json();
                if (cancelled) return;
                const item = json?.data?.[0];
                if (!item) return;
                setData({
                    value: parseInt(item.value, 10),
                    label: item.value_classification,
                    timestamp: parseInt(item.timestamp, 10) * 1000,
                });
            } catch {
                /* keep prior value */
            }
        };
        fetchIndex();
        const id = setInterval(fetchIndex, 5 * 60 * 1000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    // Color stops follow the same convention alternative.me's UI uses.
    // 0-25 deep red, 26-44 amber, 45-55 neutral, 56-75 light green,
    // 76-100 deep green.
    const colorFor = (v) => {
        if (v <= 25) return '#ef4444';
        if (v <= 44) return '#f59e0b';
        if (v <= 55) return '#a3a3a3';
        if (v <= 75) return '#84cc16';
        return '#22c55e';
    };

    const value = data?.value ?? null;
    const color = value !== null ? colorFor(value) : '#525252';

    // Semicircle gauge geometry: center at (100, 100), radius 80, stroke
    // sweeps 180° from left to right. dasharray length on the visible
    // arc is π·r ≈ 251.3; the filled portion is value/100 of that arc.
    const arcLength = Math.PI * 80;
    const filled = value !== null ? (value / 100) * arcLength : 0;

    return (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 h-full flex flex-col items-center justify-between">
            <div className="w-full flex items-center justify-between">
                <span className="text-[10px] font-black tracking-widest uppercase text-primary">
                    Fear & Greed
                </span>
                <span className="text-text-muted text-[9px] font-mono">
                    {data ? new Date(data.timestamp).toLocaleDateString() : '—'}
                </span>
            </div>

            <div className="relative w-[220px] h-[140px] my-2">
                <svg viewBox="0 0 200 110" className="w-full h-full">
                    {/* Track */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="14"
                        strokeLinecap="round"
                    />
                    {/* Filled arc */}
                    <motion.path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke={color}
                        strokeWidth="14"
                        strokeLinecap="round"
                        initial={{ strokeDasharray: `0 ${arcLength}` }}
                        animate={{ strokeDasharray: `${filled} ${arcLength}` }}
                        transition={{ duration: 1.4, ease: 'easeOut' }}
                        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                    <span
                        className="text-4xl font-display font-black tabular-nums"
                        style={{ color }}
                    >
                        {value ?? '—'}
                    </span>
                </div>
            </div>

            <div className="text-center">
                <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">
                    Sentiment
                </p>
                <p className="text-base font-bold" style={{ color }}>
                    {data?.label ?? 'Loading…'}
                </p>
                <p className="text-[10px] text-text-muted mt-3 max-w-[240px] leading-relaxed">
                    Crypto market sentiment from alternative.me. Extreme readings on
                    either side often precede mean reversion.
                </p>
            </div>
        </div>
    );
}

export default function Mood() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-semibold mb-2">
                    Market Mood
                </p>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-text-primary tracking-tight">
                    Sentiment & Live Movers
                </h1>
                <p className="text-text-secondary mt-2 max-w-2xl">
                    Two views of where the crowd is right now: a Fear & Greed gauge for
                    aggregate posture, and the Market Radar for which individual majors are
                    leading or lagging in real time.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1 h-[500px]">
                    <FearGreedGauge />
                </div>
                <div className="xl:col-span-2 h-[500px]">
                    <MarketRadar />
                </div>
            </div>
        </motion.div>
    );
}
