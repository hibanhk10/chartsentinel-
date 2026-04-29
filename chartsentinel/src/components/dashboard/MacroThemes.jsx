import { useMemo, useState } from 'react';

// Live Macro Themes — narrative tracker. Mock content here represents
// what the LLM-clustered output looks like once wired; the production
// version will run a daily clustering job over news + reports and
// re-rank by recency × impact. Theme + headline payload structure is
// the contract the eventual job emits.

const THEMES = [
    {
        id: 'ai-capex',
        title: 'AI Capex Reality Check',
        sentiment: 'bearish',
        momentum: -2,
        impact: 'high',
        summary: 'Hyperscaler capex guides have softened two quarters running. Power-grid + GPU bottleneck commentary is shifting from "constraint" to "demand softening" in transcripts.',
        tickers: ['NVDA', 'AVGO', 'MSFT', 'META', 'GOOGL'],
        regions: ['US'],
        headlines: [
            { source: 'FT',          time: '2h ago',  text: 'Microsoft trims FY27 datacenter buildout target by 18%' },
            { source: 'Bloomberg',   time: '6h ago',  text: 'Meta delays Anson site phase 2; Capex run-rate flat QoQ' },
            { source: 'Reuters',     time: '1d ago',  text: 'Power utilities revise interconnect queue projections lower' },
        ],
    },
    {
        id: 'boj-pivot',
        title: 'BoJ Pivot Watch',
        sentiment: 'neutral',
        momentum: 1,
        impact: 'high',
        summary: 'JGB curve steepening accelerated post the latest CPI print. Carry-trade unwind risk is the dominant cross-asset narrative; FX vol surface skew has flipped.',
        tickers: ['JPY', 'NKY', 'USDJPY', 'TLT'],
        regions: ['Japan', 'Global'],
        headlines: [
            { source: 'Nikkei',      time: '4h ago',  text: 'Ueda hints at faster QT pace in committee minutes' },
            { source: 'Bloomberg',   time: '12h ago', text: '10Y JGB yield prints fresh post-2008 high at 1.82%' },
            { source: 'Reuters',     time: '2d ago',  text: 'Real-money funds report largest JPY long since 2011' },
        ],
    },
    {
        id: 'china-stim',
        title: 'China Stimulus Throughput',
        sentiment: 'bullish',
        momentum: 3,
        impact: 'medium',
        summary: 'Property completions are stabilizing; consumer confidence index ticked up 3.4 points. Local-government refinancing is being executed faster than expected.',
        tickers: ['FXI', 'BABA', 'HSI', 'CNH'],
        regions: ['China'],
        headlines: [
            { source: 'SCMP',        time: '5h ago',  text: 'Beijing approves CNY 1.2T LGFV refinancing tranche' },
            { source: 'Reuters',     time: '1d ago',  text: '70-city home price index logs first MoM gain in 22 months' },
            { source: 'Bloomberg',   time: '2d ago',  text: 'Industrial profit surprise; SOEs lead the print' },
        ],
    },
    {
        id: 'energy-tail',
        title: 'Energy Tail Risk Re-pricing',
        sentiment: 'bearish',
        momentum: -1,
        impact: 'medium',
        summary: 'Brent backwardation is steepening on Strait of Hormuz incident frequency. Insurance premia for tanker traffic up ~40% MoM. Refining margins remain wide.',
        tickers: ['CL', 'BZ', 'XOM', 'XLE'],
        regions: ['Middle East'],
        headlines: [
            { source: 'Reuters',     time: '3h ago',  text: 'Two tankers reroute around Cape after Houthi statement' },
            { source: 'Lloyd\'s List', time: '8h ago', text: 'War-risk insurance premium hits 0.85% of hull value' },
            { source: 'Bloomberg',   time: '1d ago',  text: 'Backwardation widens to $1.30 between M1-M3 Brent' },
        ],
    },
    {
        id: 'fed-hawkish',
        title: 'Fed Hawkish Repricing',
        sentiment: 'bearish',
        momentum: -2,
        impact: 'high',
        summary: 'Fed funds futures took out one full cut over the past two weeks. Sticky-services inflation is anchoring the path; FOMC speakers leaning into "higher for longer".',
        tickers: ['DXY', 'TLT', 'SPX', 'GOLD'],
        regions: ['US'],
        headlines: [
            { source: 'WSJ',         time: '6h ago',  text: 'Powell: "incremental progress" on inflation, no hurry to cut' },
            { source: 'Bloomberg',   time: '1d ago',  text: 'OIS curve prices 1.3 cuts through year-end, down from 2.4' },
            { source: 'Reuters',     time: '2d ago',  text: 'Three regional Fed presidents push back on cut timing' },
        ],
    },
    {
        id: 'em-fx',
        title: 'EM FX Differentiation',
        sentiment: 'neutral',
        momentum: 0,
        impact: 'low',
        summary: 'High-carry LATAM currencies outperforming low-carry CEE on stickier inflation differentials. BRL +3.2% MTD; PLN -1.4% MTD. Carry trade is back, selectively.',
        tickers: ['BRL', 'MXN', 'PLN', 'ZAR'],
        regions: ['LATAM', 'CEE'],
        headlines: [
            { source: 'FT',          time: '1d ago',  text: 'Brazilian real hits 12-month high on hawkish BCB minutes' },
            { source: 'Bloomberg',   time: '2d ago',  text: 'NBP holds rates; zloty drops 1.1% intraday' },
            { source: 'Reuters',     time: '3d ago',  text: 'EM carry index posts best month since Jan 2024' },
        ],
    },
];

const sentimentClasses = {
    bullish: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    bearish: 'text-red-400 bg-red-500/10 border-red-500/30',
    neutral: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
};

const impactDots = {
    low: 1, medium: 2, high: 3,
};

function ThemeCard({ theme, expanded, onToggle }) {
    const sentimentClass = sentimentClasses[theme.sentiment];
    const dots = impactDots[theme.impact];
    const arrow = theme.momentum > 0 ? '▲' : theme.momentum < 0 ? '▼' : '▶';
    const arrowClass = theme.momentum > 0 ? 'text-emerald-400' : theme.momentum < 0 ? 'text-red-400' : 'text-text-muted';

    return (
        <div className={`bg-surface-dark border rounded-2xl p-5 transition-colors ${expanded ? 'border-primary/30' : 'border-white/5 hover:border-white/15'}`}>
            <button
                type="button"
                onClick={onToggle}
                className="w-full text-left"
            >
                <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
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
                        <h3 className="text-base font-bold text-white">{theme.title}</h3>
                    </div>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed mb-3">{theme.summary}</p>
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {theme.tickers.map((t) => (
                        <span key={t} className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                            {t}
                        </span>
                    ))}
                </div>
            </button>

            {expanded && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2 animate-in fade-in duration-300">
                    {theme.headlines.map((h, i) => (
                        <div key={i} className="flex items-start gap-3 text-xs">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-primary mt-0.5 flex-shrink-0 w-20">
                                {h.source}
                            </span>
                            <span className="flex-1 text-text-secondary leading-relaxed">{h.text}</span>
                            <span className="text-[10px] text-text-muted flex-shrink-0">{h.time}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const DashboardMacroThemes = () => {
    const [expandedId, setExpandedId] = useState(null);
    const [filter, setFilter] = useState('all');

    const filtered = useMemo(() => {
        if (filter === 'all') return THEMES;
        return THEMES.filter((t) => t.sentiment === filter);
    }, [filter]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        Live Macro Themes
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight mb-3">
                    What the world's pricing.
                </h1>
                <p className="text-text-secondary max-w-2xl text-base leading-relaxed">
                    Narratives clustered from the global news + reports stream. Each theme
                    accumulates evidence over time — sentiment, momentum, and the tickers
                    moving with it.
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

            <p className="text-[10px] uppercase tracking-widest text-text-muted text-center pt-4">
                Themes are illustrative · LLM clustering pipeline ships in next data update
            </p>
        </div>
    );
};

export default DashboardMacroThemes;
