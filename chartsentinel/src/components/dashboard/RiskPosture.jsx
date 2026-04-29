import { useEffect, useMemo, useState } from 'react';

// Risk Posture Dial — given the current vol regime + the user's
// stated drawdown tolerance + horizon + base exposure, suggest a
// target gross/net. The math is intentionally simple and transparent
// so users can sanity-check it; it is a *nudge* surface, not a
// portfolio optimizer. All inputs persist to localStorage so the
// user only configures their profile once.

const STORAGE_KEY = 'cs.risk-posture.v1';

// Coarse vol regimes. The score is roughly "what fraction of full
// risk should you carry in this regime" — higher score = friendlier
// environment for risk-on exposure. Numbers are illustrative; the
// production version reads VIX + cross-asset realized vol weekly.
const REGIMES = [
    { id: 'calm',      label: 'Calm',         vix: '<14',  score: 1.0, blurb: 'Realized vol low, dispersion compressed. Risk-on environment.' },
    { id: 'normal',    label: 'Normal',       vix: '14–18', score: 0.85, blurb: 'Typical vol. Standard sizing OK; watch correlations.' },
    { id: 'elevated',  label: 'Elevated',     vix: '18–24', score: 0.65, blurb: 'Two-way risk picking up. Trim concentrated names.' },
    { id: 'stressed',  label: 'Stressed',     vix: '24–32', score: 0.4,  blurb: 'Drawdowns clustering. Defensive posture warranted.' },
    { id: 'crisis',    label: 'Crisis',       vix: '>32',  score: 0.2,  blurb: 'Capital preservation mode. Reduce gross significantly.' },
];

// Tolerance bands map to multipliers on the regime score. Conservative
// users get scaled down further; aggressive users hold closer to full.
const TOLERANCE = [
    { id: 'conservative', label: 'Conservative',  mult: 0.6 },
    { id: 'balanced',     label: 'Balanced',      mult: 0.85 },
    { id: 'aggressive',   label: 'Aggressive',    mult: 1.05 }, // can lever above base when calm
];

const HORIZON = [
    { id: 'short',  label: 'Short (days)',   factor: 0.85 },
    { id: 'medium', label: 'Medium (weeks)', factor: 1.0  },
    { id: 'long',   label: 'Long (months)',  factor: 1.1  },
];

function loadProfile() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
        return null;
    }
}

function saveProfile(profile) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

const DashboardRiskPosture = () => {
    // Lazy-init from localStorage on first render; avoids the setState-
    // in-effect lint and the wasted render the effect would have caused.
    const initial = loadProfile() || {};
    const [regimeId, setRegimeId] = useState(initial.regimeId || 'normal');
    const [toleranceId, setToleranceId] = useState(initial.toleranceId || 'balanced');
    const [horizonId, setHorizonId] = useState(initial.horizonId || 'medium');
    const [baseGross, setBaseGross] = useState(
        typeof initial.baseGross === 'number' ? initial.baseGross : 100
    );

    useEffect(() => {
        saveProfile({ regimeId, toleranceId, horizonId, baseGross });
    }, [regimeId, toleranceId, horizonId, baseGross]);

    const { regime, tolerance, horizon, target, deltaPct } = useMemo(() => {
        const r = REGIMES.find((x) => x.id === regimeId);
        const t = TOLERANCE.find((x) => x.id === toleranceId);
        const h = HORIZON.find((x) => x.id === horizonId);
        // Multiplicative composition keeps the inputs interpretable.
        const factor = r.score * t.mult * h.factor;
        const tg = Math.round(baseGross * factor);
        const dp = ((tg - baseGross) / baseGross) * 100;
        return { regime: r, tolerance: t, horizon: h, target: tg, deltaPct: dp };
    }, [regimeId, toleranceId, horizonId, baseGross]);

    const dialAngle = Math.max(-180, Math.min(0, -180 + (target / Math.max(1, baseGross * 1.2)) * 180));
    const deltaColor
        = deltaPct < -15 ? 'text-red-400'
        : deltaPct < -5 ? 'text-amber-400'
        : deltaPct > 0 ? 'text-emerald-400'
        : 'text-cyan-300';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Risk Posture
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    How much risk to wear.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    A nudge, not a prescription. Given the vol regime, your tolerance, and
                    your horizon, this surface suggests where to set gross exposure.
                </p>
            </header>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Dial */}
                <div className="bg-surface-dark border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center">
                    <svg viewBox="0 0 200 130" className="w-full max-w-xs">
                        <defs>
                            <linearGradient id="riskArc" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#22c55e" />
                                <stop offset="50%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                        </defs>
                        {/* arc */}
                        <path
                            d="M 20 110 A 80 80 0 0 1 180 110"
                            fill="none"
                            stroke="url(#riskArc)"
                            strokeWidth="14"
                            strokeLinecap="round"
                            opacity="0.25"
                        />
                        <path
                            d="M 20 110 A 80 80 0 0 1 180 110"
                            fill="none"
                            stroke="url(#riskArc)"
                            strokeWidth="14"
                            strokeLinecap="round"
                            strokeDasharray="251"
                            strokeDashoffset={`${251 - (251 * (target / Math.max(1, baseGross * 1.2)))}`}
                        />
                        {/* needle */}
                        <g transform={`rotate(${dialAngle} 100 110)`}>
                            <line x1="100" y1="110" x2="100" y2="40" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                            <circle cx="100" cy="110" r="5" fill="#d946ef" />
                        </g>
                    </svg>
                    <div className="text-center -mt-4">
                        <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
                            Suggested gross
                        </p>
                        <p className="text-4xl font-bold text-white tabular-nums">{target}%</p>
                        <p className={`text-xs font-mono mt-1 ${deltaColor}`}>
                            {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}% vs your base
                        </p>
                    </div>
                </div>

                {/* Inputs */}
                <div className="bg-surface-dark border border-white/5 rounded-2xl p-6 space-y-5">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                            Vol regime <span className="text-text-muted/60 normal-case">({regime.vix} VIX)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {REGIMES.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setRegimeId(r.id)}
                                    className={`px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-full border transition-colors ${
                                        regimeId === r.id
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-text-muted mt-2 leading-relaxed">{regime.blurb}</p>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                            Tolerance
                        </label>
                        <div className="flex gap-2">
                            {TOLERANCE.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setToleranceId(t.id)}
                                    className={`flex-1 px-3 py-2 text-[11px] uppercase tracking-widest font-bold rounded-lg border transition-colors ${
                                        toleranceId === t.id
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                            Horizon
                        </label>
                        <div className="flex gap-2">
                            {HORIZON.map((h) => (
                                <button
                                    key={h.id}
                                    type="button"
                                    onClick={() => setHorizonId(h.id)}
                                    className={`flex-1 px-3 py-2 text-[11px] uppercase tracking-widest font-bold rounded-lg border transition-colors ${
                                        horizonId === h.id
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    {h.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                            Your base gross exposure: <span className="text-white">{baseGross}%</span>
                        </label>
                        <input
                            type="range"
                            min={20}
                            max={200}
                            step={5}
                            value={baseGross}
                            onChange={(e) => setBaseGross(Number(e.target.value))}
                            className="w-full accent-fuchsia-500"
                        />
                        <div className="flex justify-between text-[9px] uppercase tracking-widest text-text-muted font-bold mt-1">
                            <span>20%</span>
                            <span>100%</span>
                            <span>200%</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-surface-dark border border-white/5 rounded-2xl p-5">
                <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-3">
                    Math (so you can sanity-check)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-black/30 rounded-lg p-3">
                        <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">Regime score</p>
                        <p className="text-white font-mono">{regime.score.toFixed(2)}</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                        <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">Tolerance ×</p>
                        <p className="text-white font-mono">{tolerance.mult.toFixed(2)}</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                        <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">Horizon ×</p>
                        <p className="text-white font-mono">{horizon.factor.toFixed(2)}</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                        <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">Composite</p>
                        <p className="text-primary font-mono font-bold">
                            {(regime.score * tolerance.mult * horizon.factor).toFixed(2)}×
                        </p>
                    </div>
                </div>
            </section>

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                Heuristic only · Live VIX-driven regime read in next data update
            </p>
        </div>
    );
};

export default DashboardRiskPosture;
