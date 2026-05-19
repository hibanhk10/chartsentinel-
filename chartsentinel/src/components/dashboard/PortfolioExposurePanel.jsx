import { useEffect, useState } from 'react'
import api from '../../services/api'

// Factor decomposition of the active portfolio. Static-classification
// engine on the backend — no live regression yet, so the values are
// stable across sessions for the same holdings. The panel highlights
// the most-loaded factor with its colour so the user immediately sees
// "you're mostly long tech" or "you're carrying a lot of duration".

const FACTOR_META = {
    tech: { label: 'Tech', tone: 'bg-sky-500/20 text-sky-200 border-sky-400/30' },
    usd: { label: 'USD', tone: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' },
    china: { label: 'China', tone: 'bg-red-500/20 text-red-200 border-red-400/30' },
    energy: { label: 'Energy', tone: 'bg-amber-500/20 text-amber-200 border-amber-400/30' },
    rate: { label: 'Rate-sens', tone: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/30' },
    beta: { label: 'Mkt β', tone: 'bg-white/10 text-text-primary border-white/15' },
}

function fmtPct(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—'
    return `${(n * 100).toFixed(0)}%`
}

// Signed factor weights for things like USD (negative = short USD).
function fmtSigned(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—'
    const sign = n > 0 ? '+' : ''
    return `${sign}${(n * 100).toFixed(0)}%`
}

export default function PortfolioExposurePanel({ portfolioId }) {
    const [state, setState] = useState({ status: 'loading', data: null, error: null })

    useEffect(() => {
        let active = true
        // Load the portfolio, then call the public exposure endpoint
        // with its holdings normalised. Doing it from the front-end
        // means we don't need a new auth-gated server route — the
        // decomposer itself is pure math.
        async function load() {
            try {
                const { data: portfolio } = await api.get(`/portfolios/${portfolioId}`)
                if (!portfolio?.items?.length) {
                    if (active) setState({ status: 'empty', data: null, error: null })
                    return
                }
                const totalWeight = portfolio.items.reduce(
                    (s, it) => s + (Number(it.weight) || 0),
                    0,
                )
                if (totalWeight <= 0) {
                    if (active) setState({ status: 'empty', data: null, error: null })
                    return
                }
                const holdings = portfolio.items.map((it) => ({
                    ticker: it.ticker,
                    weight: it.weight / totalWeight,
                }))
                const { data: breakdown } = await api.post('/signals/exposure', { holdings })
                if (active) setState({ status: 'ready', data: breakdown, error: null })
            } catch (err) {
                if (active) {
                    setState({
                        status: 'error',
                        data: null,
                        error: err.response?.data?.error || err.message,
                    })
                }
            }
        }
        load()
        return () => {
            active = false
        }
    }, [portfolioId])

    if (state.status === 'loading') {
        return (
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="h-4 bg-white/5 rounded w-32 mb-3 animate-pulse" />
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-white/5 rounded animate-pulse" />
                    ))}
                </div>
            </section>
        )
    }
    if (state.status === 'empty' || state.status === 'error') return null

    const b = state.data
    if (!b) return null

    const factorEntries = Object.entries(b.factors || {}).filter(
        ([, v]) => Number.isFinite(v) && Math.abs(v) >= 0.05,
    )
    // Sort by absolute exposure so the loudest factors render first.
    factorEntries.sort(([, a], [, c]) => Math.abs(c) - Math.abs(a))

    const sectors = Object.entries(b.bySector || {}).sort(([, a], [, c]) => c - a)
    const regions = Object.entries(b.byRegion || {}).sort(([, a], [, c]) => c - a)

    return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                    Exposure decomposition
                </h3>
                {b.unclassifiedWeight > 0.05 && (
                    <span className="text-[10px] text-amber-300">
                        {fmtPct(b.unclassifiedWeight)} unclassified
                    </span>
                )}
            </div>

            {/* Headline factor chips. Signed for USD; absolute for the rest. */}
            <div className="flex flex-wrap gap-2 mb-5">
                {factorEntries.length === 0 ? (
                    <span className="text-xs text-text-muted">
                        No dominant factor exposure detected.
                    </span>
                ) : (
                    factorEntries.map(([k, v]) => {
                        const meta = FACTOR_META[k] || FACTOR_META.beta
                        const display = k === 'usd' ? fmtSigned(v) : fmtPct(Math.abs(v))
                        return (
                            <span
                                key={k}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${meta.tone}`}
                            >
                                <span className="uppercase tracking-wider font-bold">
                                    {meta.label}
                                </span>
                                <span className="tabular-nums">{display}</span>
                            </span>
                        )
                    })
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                        By sector
                    </div>
                    <div className="space-y-1.5">
                        {sectors.length === 0 ? (
                            <span className="text-xs text-text-muted">No sector data.</span>
                        ) : (
                            sectors.slice(0, 6).map(([s, w]) => (
                                <Bar key={s} label={s} value={w} />
                            ))
                        )}
                    </div>
                </div>
                <div>
                    <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                        By region
                    </div>
                    <div className="space-y-1.5">
                        {regions.slice(0, 6).map(([r, w]) => (
                            <Bar key={r} label={r} value={w} />
                        ))}
                    </div>
                </div>
            </div>

            {b.unclassifiedTickers?.length > 0 && (
                <p className="text-[10px] text-text-muted mt-4">
                    Not yet classified: {b.unclassifiedTickers.slice(0, 8).join(', ')}
                    {b.unclassifiedTickers.length > 8 ? ', …' : ''}
                </p>
            )}
        </section>
    )
}

function Bar({ label, value }) {
    const pct = Math.max(0, Math.min(1, value)) * 100
    return (
        <div className="flex items-center gap-3">
            <span className="text-[11px] text-text-secondary min-w-[80px]">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                    className="h-full bg-primary/70"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-[11px] font-mono tabular-nums text-text-secondary min-w-[40px] text-right">
                {pct.toFixed(0)}%
            </span>
        </div>
    )
}
