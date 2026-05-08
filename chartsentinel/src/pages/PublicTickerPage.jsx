import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_CONFIG } from '../config/api';
import { fmtPercentPoints } from '../lib/format';
import { scoreTint, signalForScore, SIGNAL_LABEL } from '../lib/score-format';
import Sparkline from '../components/ui/Sparkline';
import SEO from '../components/ui/SEO';

// Public ticker page at /t/:ticker. Shows the live composite score,
// signal label, 30-day sparkline (from the screener cache when
// available), and a "Sign up to track" CTA.
//
// Strategy notes:
//   • No auth — every ticker page is a free landing page that doubles
//     as SEO real estate.
//   • The composite endpoint is the primary fetch; the screener gives
//     us the sparkline as a side effect when present.
//   • Meta tags are dynamic via SEO so social-card previews carry the
//     current score. We don't render an OG image — Twitter/LinkedIn
//     respect <meta property="og:title|description"> for text previews.

const PublicTickerPage = () => {
    const { ticker: tickerParam } = useParams();
    const ticker = (tickerParam || '').toUpperCase();
    const [scoreState, setScoreState] = useState({ status: 'loading', data: null, error: null });
    const [spark, setSpark] = useState(null);

    useEffect(() => {
        if (!ticker) return;
        let active = true;

        // Primary: composite score for this ticker.
        fetch(`${API_CONFIG.baseURL}/signals/score/${encodeURIComponent(ticker)}`, {
            headers: API_CONFIG.headers,
        })
            .then(async (r) => {
                const body = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
                return body;
            })
            .then((data) => active && setScoreState({ status: 'ready', data, error: null }))
            .catch((err) => active && setScoreState({ status: 'error', data: null, error: err.message }));

        // Side fetch: screener cache for the sparkline. Tolerated to fail.
        fetch(`${API_CONFIG.baseURL}/signals/screener`, { headers: API_CONFIG.headers })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!active || !data?.assets) return;
                const row = data.assets.find((a) => a.ticker === ticker);
                if (row?.spark) setSpark(row.spark);
            })
            .catch(() => {});

        return () => {
            active = false;
        };
    }, [ticker]);

    const composite = scoreState.data?.composite;
    const score = composite?.score ?? null;
    const signal = composite?.signal ?? signalForScore(score);
    const label = SIGNAL_LABEL[signal] ?? signal;
    const tint = scoreTint(score);

    // Dynamic meta tags so /t/btc-usd produces a shareable preview that
    // says "BTC-USD: Buy +47 on ChartSentinel" instead of a generic
    // marketing blurb.
    const seoTitle = score == null
        ? `${ticker} signal — ChartSentinel`
        : `${ticker} ${label} ${score >= 0 ? '+' : ''}${score} — ChartSentinel`;
    const seoDescription = score == null
        ? `Live composite signal for ${ticker} — seasonality, COT positioning, and pattern matching blended into one score.`
        : `${ticker} composite score is ${score >= 0 ? '+' : ''}${Math.round(score)} (${label}). Updated hourly with seasonality, COT positioning, and pattern matching.`;

    return (
        <div className="relative z-10 min-h-screen bg-background-dark text-text-primary pt-32 pb-20 px-6">
            <SEO title={seoTitle} description={seoDescription} path={`/t/${ticker}`} />

            <div className="max-w-3xl mx-auto">
                <Link to="/" className="text-xs text-text-muted hover:text-white inline-flex items-center gap-1 mb-8">
                    <span className="material-icons text-sm">arrow_back</span>
                    ChartSentinel
                </Link>

                <header className="mb-8">
                    <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                        Composite signal
                    </div>
                    <h1 className="text-5xl sm:text-6xl font-bold font-mono text-white mb-4">{ticker}</h1>
                </header>

                {scoreState.status === 'loading' && (
                    <div className="space-y-4">
                        <div className="h-24 bg-white/[0.04] rounded-xl animate-pulse" />
                        <div className="h-32 bg-white/[0.04] rounded-xl animate-pulse" />
                    </div>
                )}

                {scoreState.status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-sm text-red-300">
                        We couldn't load {ticker} right now: {scoreState.error}. Try again in a minute.
                    </div>
                )}

                {scoreState.status === 'ready' && (
                    <>
                        <section className="premium-card rounded-2xl p-8 mb-6">
                            <div className="flex items-end justify-between mb-4">
                                <div>
                                    <div className={`text-7xl font-bold font-mono ${tint}`}>
                                        {score == null ? '—' : `${score >= 0 ? '+' : ''}${Math.round(score)}`}
                                    </div>
                                    <div className="text-lg text-text-secondary mt-2">{label}</div>
                                </div>
                                <Sparkline data={spark} width={180} height={60} strokeWidth={2} />
                            </div>
                            <p className="text-xs text-text-muted">
                                Score range −100 to +100. Above +25 is buy territory; above +60 is strong.
                                Updated hourly from Yahoo Finance + CFTC + pattern matching.
                            </p>
                        </section>

                        {composite?.components && (
                            <section className="grid grid-cols-3 gap-3 mb-8">
                                {[
                                    { label: 'Seasonal', value: composite.components.seasonal },
                                    { label: 'COT', value: composite.components.cot },
                                    { label: 'Pattern', value: composite.components.pattern },
                                ].map((c) => (
                                    <div key={c.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                                        <div className="text-[10px] uppercase tracking-widest text-text-muted">
                                            {c.label}
                                        </div>
                                        <div className={`mt-1 text-2xl font-bold font-mono ${scoreTint(c.value)}`}>
                                            {c.value == null ? '—' : `${c.value >= 0 ? '+' : ''}${Math.round(c.value)}`}
                                        </div>
                                    </div>
                                ))}
                            </section>
                        )}

                        <section className="border-t border-white/5 pt-8 text-center">
                            <h2 className="text-xl font-bold text-white mb-2">
                                Track {ticker} every day.
                            </h2>
                            <p className="text-sm text-text-secondary mb-5 max-w-md mx-auto">
                                Add it to your watchlist and we'll email + Telegram you the moment the
                                composite crosses your threshold.
                            </p>
                            <Link
                                to="/?signup=1"
                                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors"
                            >
                                Sign up free
                                <span className="material-icons text-base">arrow_forward</span>
                            </Link>
                            <p className="text-[10px] text-text-muted mt-4">
                                Informational only — not investment advice.
                            </p>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default PublicTickerPage;
