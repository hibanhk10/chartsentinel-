import { useEffect, useMemo, useState } from 'react';
import { API_CONFIG } from '../../config/api';

// Live Macro Themes — clustered from the news feed by the LLM and
// returned by /api/signals/macro-themes. Server-side cached for 4h
// so a refresh inside a session is free. When the LLM is offline the
// backend falls back to a single "Live feed" rollup so this view
// never goes blank.

const sentimentClasses = {
    bullish: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    bearish: 'text-red-400 bg-red-500/10 border-red-500/30',
    neutral: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
};

const impactDots = { low: 1, medium: 2, high: 3 };

function ThemeCard({ theme, expanded, onToggle }) {
    const sentimentClass = sentimentClasses[theme.sentiment] || sentimentClasses.neutral;
    const dots = impactDots[theme.impact] ?? 2;
    const arrow = theme.momentum > 0 ? '▲' : theme.momentum < 0 ? '▼' : '▶';
    const arrowClass = theme.momentum > 0
        ? 'text-emerald-400'
        : theme.momentum < 0 ? 'text-red-400' : 'text-text-muted';

    return (
        <div className={`bg-surface-dark border rounded-2xl p-5 transition-colors ${expanded ? 'border-primary/30' : 'border-white/5 hover:border-white/15'}`}>
            <button
                type="button"
                onClick={onToggle}
                className="w-full text-left"
            >
                <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${sentimentClass}`}>
                                {theme.sentiment}
                            </span>
                            <span className={`text-xs ${arrowClass} font-mono`}>
                                {arrow} {theme.momentum > 0 ? '+' : ''}{theme.momentum}
                            </span>
                            <span className="flex items-center gap-0.5 ml-auto">
                                {[0, 1, 2].map((i) => (
                                    <span key={i} className={`w-1 h-1 rounded-full ${i < dots ? 'bg-primary' : 'bg-white/10'}`} />
                                ))}
                            </span>
                        </div>
                        <h3 className="text-base font-bold text-text-primary">{theme.title}</h3>
                    </div>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed mb-3">{theme.summary}</p>
                {theme.tickers?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {theme.tickers.map((t) => (
                            <span key={t} className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                                {t}
                            </span>
                        ))}
                    </div>
                )}
            </button>

            {expanded && theme.headlines?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2 animate-in fade-in duration-300">
                    {theme.headlines.map((h, i) => {
                        const inner = (
                            <>
                                <span className="text-[9px] uppercase tracking-widest font-bold text-primary mt-0.5 flex-shrink-0 w-20 truncate">
                                    {h.source}
                                </span>
                                <span className="flex-1 text-text-secondary leading-relaxed">{h.text}</span>
                                <span className="text-[10px] text-text-muted flex-shrink-0">{h.time}</span>
                            </>
                        );
                        return h.url ? (
                            <a
                                key={i}
                                href={h.url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="flex items-start gap-3 text-xs hover:text-text-primary transition-colors"
                            >
                                {inner}
                            </a>
                        ) : (
                            <div key={i} className="flex items-start gap-3 text-xs">{inner}</div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const DashboardMacroThemes = () => {
    const [state, setState] = useState({ status: 'loading', themes: [], generatedAt: null });
    const [expandedId, setExpandedId] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        let active = true;
        fetch(`${API_CONFIG.baseURL}/signals/macro-themes`, { headers: API_CONFIG.headers })
            .then(async (r) => {
                const body = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
                return body;
            })
            .then((body) => {
                if (!active) return;
                setState({
                    status: 'ready',
                    themes: Array.isArray(body.themes) ? body.themes : [],
                    generatedAt: body.generatedAt || null,
                });
            })
            .catch(() => active && setState({ status: 'error', themes: [], generatedAt: null }));
        return () => { active = false; };
    }, []);

    const filtered = useMemo(() => {
        if (filter === 'all') return state.themes;
        return state.themes.filter((t) => t.sentiment === filter);
    }, [state.themes, filter]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Live Macro Themes
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-text-primary leading-tight mb-3">
                    What the world's pricing.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Narratives clustered from the live news + reports stream by the AI.
                    Each theme groups headlines about the same underlying story, scores its
                    sentiment + impact, and lists the tickers most exposed to it.
                </p>
            </header>

            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'all',     label: 'All' },
                    { id: 'bullish', label: 'Bullish' },
                    { id: 'bearish', label: 'Bearish' },
                    { id: 'neutral', label: 'Neutral' },
                ].map((f) => (
                    <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilter(f.id)}
                        className={`px-3 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-full border transition-colors ${
                            filter === f.id
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {state.status === 'loading' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            )}

            {state.status === 'error' && (
                <p className="text-red-400 text-sm">Failed to load macro themes.</p>
            )}

            {state.status === 'ready' && filtered.length === 0 && (
                <div className="bg-surface-dark border border-white/5 rounded-2xl p-8 text-center">
                    <p className="text-text-muted text-sm">
                        No themes matching that filter right now. The clustering pipeline
                        re-runs hourly as fresh news arrives.
                    </p>
                </div>
            )}

            {state.status === 'ready' && filtered.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((theme) => (
                        <ThemeCard
                            key={theme.id}
                            theme={theme}
                            expanded={expandedId === theme.id}
                            onToggle={() => setExpandedId(expandedId === theme.id ? null : theme.id)}
                        />
                    ))}
                </div>
            )}

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                {state.generatedAt
                    ? `Clustered ${new Date(state.generatedAt).toLocaleTimeString()} · cached 4h`
                    : 'Loading…'}
            </p>
        </div>
    );
};

export default DashboardMacroThemes;
