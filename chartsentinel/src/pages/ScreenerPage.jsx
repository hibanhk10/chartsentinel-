import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import SEO from '../components/ui/SEO'
import Footer from '../sections/Footer/Footer'
import { API_CONFIG } from '../config/api'
import { scoreTint, signalForScore, SIGNAL_LABEL } from '../lib/score-format'

// Public read-only screener at /screener. Fulfils the Free-tier promise
// of "public dashboard read-only access" without forcing a login.
// Pulls /api/signals/screener (already public + server-cached) and
// renders a sortable / filterable table with score badges.

const CATEGORY_FILTERS = ['All', 'Forex', 'Crypto', 'Stocks']
const SORT_OPTIONS = [
    { value: 'score-desc', label: 'Score (high → low)' },
    { value: 'score-asc', label: 'Score (low → high)' },
    { value: 'ticker', label: 'Ticker (A → Z)' },
]

function categorize(ticker) {
    if (ticker.endsWith('=X')) return 'Forex'
    if (ticker.endsWith('-USD')) return 'Crypto'
    return 'Stocks'
}

export default function ScreenerPage() {
    const [state, setState] = useState({ status: 'loading', data: null, error: null })
    const [category, setCategory] = useState('All')
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState('score-desc')

    useEffect(() => {
        let active = true
        fetch(`${API_CONFIG.baseURL}/signals/screener`, { headers: API_CONFIG.headers })
            .then(async (r) => {
                const body = await r.json().catch(() => ({}))
                if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
                return body
            })
            .then((data) => active && setState({ status: 'ready', data, error: null }))
            .catch((err) => active && setState({ status: 'error', data: null, error: err.message }))
        return () => {
            active = false
        }
    }, [])

    const assets = state.data?.assets ?? []

    const filtered = useMemo(() => {
        const q = search.trim().toUpperCase()
        return assets
            .filter((a) => (category === 'All' || categorize(a.ticker) === category))
            .filter((a) => !q || a.ticker.toUpperCase().includes(q))
            .sort((a, b) => {
                if (sort === 'score-desc') return (b.score ?? -Infinity) - (a.score ?? -Infinity)
                if (sort === 'score-asc') return (a.score ?? Infinity) - (b.score ?? Infinity)
                return a.ticker.localeCompare(b.ticker)
            })
    }, [assets, category, search, sort])

    const stats = useMemo(() => {
        if (assets.length === 0) return null
        const scored = assets.filter((a) => a.score != null)
        const bullish = scored.filter((a) => a.score >= 25).length
        const bearish = scored.filter((a) => a.score <= -25).length
        return { total: scored.length, bullish, bearish }
    }, [assets])

    return (
        <div className="relative z-10 w-full bg-background-dark text-text-primary min-h-screen">
            <SEO
                title="Public screener"
                description="Live composite signal scores across FX, crypto, and equities — read-only view of the ChartSentinel screener, free for everyone."
                path="/screener"
            />

            <div className="max-w-6xl mx-auto px-6 pt-32 pb-20">
                <motion.header
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-10 text-center"
                >
                    <span className="font-display text-primary text-sm font-bold tracking-widest uppercase glow-magenta">
                        Live screener
                    </span>
                    <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tighter text-white mt-3">
                        Every ticker, every score, every minute
                    </h1>
                    <p className="text-text-secondary max-w-xl mx-auto mt-4">
                        Composite scores blended from seasonality, COT positioning, and chart-pattern
                        matches across the full universe — free, no login.
                    </p>
                </motion.header>

                {stats && (
                    <div className="grid grid-cols-3 gap-3 mb-8 max-w-2xl mx-auto">
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur p-4 text-center">
                            <div className="text-[10px] uppercase tracking-widest text-text-muted">Tracked</div>
                            <div className="text-2xl font-bold text-white tabular-nums">{stats.total}</div>
                        </div>
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur p-4 text-center">
                            <div className="text-[10px] uppercase tracking-widest text-emerald-300">Bullish</div>
                            <div className="text-2xl font-bold text-emerald-300 tabular-nums">{stats.bullish}</div>
                        </div>
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 backdrop-blur p-4 text-center">
                            <div className="text-[10px] uppercase tracking-widest text-red-300">Bearish</div>
                            <div className="text-2xl font-bold text-red-300 tabular-nums">{stats.bearish}</div>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search ticker…"
                        className="flex-1 min-w-[200px] bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-primary/50"
                    />
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                    >
                        {CATEGORY_FILTERS.map((c) => (
                            <option key={c} value={c} className="bg-background-dark">{c}</option>
                        ))}
                    </select>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value} className="bg-background-dark">{o.label}</option>
                        ))}
                    </select>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur overflow-hidden">
                    {state.status === 'loading' && (
                        <div className="text-text-muted text-sm text-center py-12">Computing scores…</div>
                    )}
                    {state.status === 'error' && (
                        <div className="text-red-300 text-sm text-center py-12">{state.error}</div>
                    )}
                    {state.status === 'ready' && filtered.length === 0 && (
                        <div className="text-text-muted text-sm text-center py-12">No matches.</div>
                    )}
                    {state.status === 'ready' && filtered.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-[10px] uppercase tracking-widest text-text-muted">
                                    <tr className="border-b border-white/5">
                                        <th className="text-left py-3 px-4">Ticker</th>
                                        <th className="text-left py-3 px-2 hidden md:table-cell">Class</th>
                                        <th className="text-right py-3 px-2">Signal</th>
                                        <th className="text-right py-3 px-4">Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((a) => {
                                        const score = a.score
                                        const signal = score != null ? signalForScore(score) : null
                                        const label = signal ? SIGNAL_LABEL[signal] : '—'
                                        const tint = scoreTint(score)
                                        return (
                                            <tr key={a.ticker} className="border-b border-white/5 hover:bg-white/[0.02]">
                                                <td className="py-3 px-4">
                                                    <Link to={`/t/${a.ticker}`} className="text-white font-bold font-mono hover:text-primary">
                                                        {a.ticker}
                                                    </Link>
                                                </td>
                                                <td className="py-3 px-2 text-xs text-text-muted hidden md:table-cell">
                                                    {categorize(a.ticker)}
                                                </td>
                                                <td className="py-3 px-2 text-right text-xs text-text-secondary uppercase tracking-wide">
                                                    {label}
                                                </td>
                                                <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${tint}`}>
                                                    {score == null ? '—' : `${score >= 0 ? '+' : ''}${Math.round(score)}`}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <p className="text-[10px] text-text-muted text-center mt-6 max-w-2xl mx-auto">
                    Scores refresh on the screener cache (~5-min staleness). Sign up free to add tickers
                    to your watchlist, set thresholds, and get alerts.
                </p>

                <div className="mt-10 text-center">
                    <Link
                        to="/funnel"
                        className="inline-block px-8 py-3 rounded-full bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors"
                    >
                        Start free
                    </Link>
                </div>
            </div>

            <Footer />
        </div>
    )
}
