import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Geopolitical risk dashboard ported from the preregister site as a
// marketing-side teaser of the kind of intelligence layer the
// platform surfaces inside the app. Data is curated + simulated
// fluctuations rather than live — the demonstration is the point;
// the actual live feed sits behind the dashboard for paying users.

// Inline SVGs — main app doesn't have lucide-react and isn't pulling
// it in for one-shot icon needs.
function AlertTriangleIcon({ className = '', style }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}
function ZapIcon({ className = '', style }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}
function GlobeIcon({ className = '', style }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    );
}
function ShieldIcon({ className = '', style }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
}

const REGIONS = [
    {
        name: 'Eastern Europe',
        Icon: AlertTriangleIcon,
        overallRisk: 82,
        trend: 'escalating',
        factors: [
            { label: 'Military Activity', level: 90, color: '#ef4444' },
            { label: 'Economic Pressure', level: 75, color: '#f59e0b' },
            { label: 'Cyber Threat', level: 78, color: '#d946ef' },
            { label: 'Displacement', level: 85, color: '#ef4444' },
        ],
    },
    {
        name: 'Middle East',
        Icon: ZapIcon,
        overallRisk: 74,
        trend: 'escalating',
        factors: [
            { label: 'Armed Conflict', level: 80, color: '#ef4444' },
            { label: 'Energy Risk', level: 70, color: '#f59e0b' },
            { label: 'Proxy Activity', level: 72, color: '#d946ef' },
            { label: 'Naval Threat', level: 65, color: '#22d3ee' },
        ],
    },
    {
        name: 'Asia-Pacific',
        Icon: GlobeIcon,
        overallRisk: 55,
        trend: 'stable',
        factors: [
            { label: 'Strait Risk', level: 62, color: '#f59e0b' },
            { label: 'Trade Tension', level: 58, color: '#d946ef' },
            { label: 'Naval Presence', level: 55, color: '#22d3ee' },
            { label: 'Cyber Intel', level: 48, color: '#22d3ee' },
        ],
    },
    {
        name: 'West Africa / Sahel',
        Icon: ShieldIcon,
        overallRisk: 61,
        trend: 'escalating',
        factors: [
            { label: 'Insurgency', level: 70, color: '#ef4444' },
            { label: 'Coup Risk', level: 65, color: '#f59e0b' },
            { label: 'Humanitarian', level: 75, color: '#d946ef' },
            { label: 'Economic', level: 55, color: '#22c55e' },
        ],
    },
];

const trendColors = {
    escalating: '#ef4444',
    stable: '#22d3ee',
    'de-escalating': '#22c55e',
};
const trendLabels = {
    escalating: '▲ ESCALATING',
    stable: '● STABLE',
    'de-escalating': '▼ DE-ESCALATING',
};

function RiskBar({ level, color, label }) {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-[9px] text-text-muted font-semibold tracking-wide">{label}</span>
                <span className="text-[9px] font-black" style={{ color }}>
                    {level}
                </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${level}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
                />
            </div>
        </div>
    );
}

export default function ThreatMatrix() {
    const [regions, setRegions] = useState(REGIONS);

    // Simulate small fluctuations every 3s — gives the panel a live-data
    // feel without any backend dependency. The numbers are bounded so
    // values never wander far from their seed and the UI doesn't churn.
    useEffect(() => {
        const interval = setInterval(() => {
            setRegions((prev) =>
                prev.map((r) => ({
                    ...r,
                    overallRisk: Math.max(10, Math.min(99, r.overallRisk + (Math.random() - 0.5) * 2)),
                    factors: r.factors.map((f) => ({
                        ...f,
                        level: Math.max(5, Math.min(99, f.level + (Math.random() - 0.5) * 2)),
                    })),
                }))
            );
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col h-full bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"
                    />
                    <span className="text-[10px] font-black tracking-widest uppercase text-red-400">
                        Threat Matrix
                    </span>
                </div>
                <span className="text-text-muted text-[9px] tracking-widest uppercase">{regions.length} Regions</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {regions.map((region, i) => {
                    const riskColor
                        = region.overallRisk > 75 ? '#ef4444'
                            : region.overallRisk > 50 ? '#f59e0b'
                                : '#22c55e';
                    const Icon = region.Icon;
                    return (
                        <motion.div
                            key={region.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Icon className="w-3.5 h-3.5" style={{ color: riskColor }} />
                                    <span className="text-text-primary text-xs font-bold">{region.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="text-[8px] font-bold tracking-widest"
                                        style={{ color: trendColors[region.trend] }}
                                    >
                                        {trendLabels[region.trend]}
                                    </span>
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs"
                                        style={{ backgroundColor: `${riskColor}15`, color: riskColor }}
                                    >
                                        {Math.round(region.overallRisk)}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {region.factors.map((factor) => (
                                    <RiskBar
                                        key={factor.label}
                                        level={Math.round(factor.level)}
                                        color={factor.color}
                                        label={factor.label}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
