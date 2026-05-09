import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import SEO from '../components/ui/SEO'
import Footer from '../sections/Footer/Footer'
import { insiderService } from '../services/insiderService'

// "Caught it" wall — public-facing, evidence-based credibility page.
// Lists every cluster-buy event the snapshot cron has flagged in the
// last N days alongside the forward return since detection. The data
// is real (cluster_buy_events + Yahoo close prices) so the page only
// looks good if the platform is doing useful work — which is the
// point.

const fmtMoney = (n) => {
    if (!n) return '$0'
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
    return `$${n.toFixed(0)}`
}

const fmtPct = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return '—'
    const sign = n >= 0 ? '+' : ''
    return `${sign}${n.toFixed(1)}%`
}

const RETURN_TONE = (pct) => {
    if (pct === null || pct === undefined) return 'text-text-muted'
    if (pct >= 5) return 'text-emerald-300'
    if (pct >= 0) return 'text-emerald-400/80'
    if (pct > -5) return 'text-amber-300'
    return 'text-red-300'
}

const WINDOW_OPTIONS = [
    { value: 30, label: '30 days' },
    { value: 60, label: '60 days' },
    { value: 90, label: '90 days' },
    { value: 180, label: '6 months' },
]

export default function CaughtPage() {
    const [days, setDays] = useState(90)
    const [state, setState] = useState({ status: 'loading', data: null, error: null })

    useEffect(() => {
        let active = true
        setState((s) => ({ ...s, status: 'loading' }))
        insiderService
            .getClusterPerformance({ days, limit: 60 })
            .then((data) => active && setState({ status: 'ready', data, error: null }))
            .catch((err) => active && setState({ status: 'error', data: null, error: err.message }))
        return () => {
            active = false
        }
    }, [days])

    const events = state.data?.events ?? []

    const stats = useMemo(() => {
        const scored = events.filter((e) => e.returnPct !== null)
        if (scored.length === 0) return null
        const avg = scored.reduce((s, e) => s + e.returnPct, 0) / scored.length
        const wins = scored.filter((e) => e.returnPct > 0).length
        const winRate = (wins / scored.length) * 100
        const best = scored.reduce((m, e) => (e.returnPct > m.returnPct ? e : m), scored[0])
        const worst = scored.reduce((m, e) => (e.returnPct < m.returnPct ? e : m), scored[0])
        return { avg, winRate, best, worst, count: scored.length }
    }, [events])

    return (
        <div className="relative z-10 w-full bg-background-dark text-text-primary min-h-screen">
            <SEO
                title="What we caught"
                description="Every cluster-buy signal ChartSentinel flagged in the past 90 days, with the actual forward return on each ticker."
                path="/caught"
            />

            <div className="max-w-6xl mx-auto px-6 pt-32 pb-20">
                <motion.header
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-12 text-center"
                >
                    <span className="font-display text-primary text-sm font-bold tracking-widest uppercase glow-magenta">
                        Receipts
                    </span>
                    <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tighter text-white mt-3">
                        What we caught
                    </h1>
                    <p className="text-text-secondary max-w-2xl mx-auto mt-4 leading-relaxed">
                        Every cluster-buy signal — three or more insiders buying the same ticker
                        within a 14-day window — that fired in the past {days} days, paired with the
                        actual return since detection. No back-fitting, no cherry-picking. The
                        column above is real and live.
                    </p>
                </motion.header>

                {/* Summary tiles */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center backdrop-blur">
                            <div className="text-[10px] uppercase tracking-widest text-text-muted">Average return</div>
                            <div className={`text-3xl font-bold mt-2 tabular-nums ${RETURN_TONE(stats.avg)}`}>
                                {fmtPct(stats.avg)}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center backdrop-blur">
                            <div className="text-[10px] uppercase tracking-widest text-text-muted">Win rate</div>
                            <div className="text-3xl font-bold text-white mt-2 tabular-nums">
                                {stats.winRate.toFixed(0)}%
                            </div>
                        </div>
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center backdrop-blur">
                            <div className="text-[10px] uppercase tracking-widest text-emerald-300">Best</div>
                            <div className="text-2xl font-bold text-emerald-300 mt-2">{stats.best.ticker}</div>
                            <div className="text-emerald-300 text-xs tabular-nums">{fmtPct(stats.best.returnPct)}</div>
                        </div>
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-center backdrop-blur">
                            <div className="text-[10px] uppercase tracking-widest text-red-300">Worst</div>
                            <div className="text-2xl font-bold text-red-300 mt-2">{stats.worst.ticker}</div>
                            <div className="text-red-300 text-xs tabular-nums">{fmtPct(stats.worst.returnPct)}</div>
                        </div>
                    </div>
                )}

                {/* Window picker */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="flex flex-wrap gap-2">
                        {WINDOW_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setDays(opt.value)}
                                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${
                                    days === opt.value
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-text-muted">
                        {events.length} events
                    </span>
                </div>

                {/* Table */}
                <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur overflow-hidden">
                    {state.status === 'loading' && (
                        <div className="text-text-muted text-sm text-center py-12">
                            Loading historical clusters…
                        </div>
                    )}
                    {state.status === 'error' && (
                        <div className="text-red-300 text-sm text-center py-12">{state.error}</div>
                    )}
                    {state.status === 'ready' && events.length === 0 && (
                        <div className="text-text-muted text-sm text-center py-12">
                            No clusters in this window. The snapshot cron populates events daily —
                            check back as the database fills out.
                        </div>
                    )}
                    {state.status === 'ready' && events.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-[10px] uppercase tracking-widest text-text-muted">
                                    <tr className="border-b border-white/5">
                                        <th className="text-left py-3 px-4">Ticker</th>
                                        <th className="text-right py-3 px-2">Buyers</th>
                                        <th className="text-right py-3 px-2">Buy size</th>
                                        <th className="text-right py-3 px-2 hidden md:table-cell">Detected</th>
                                        <th className="text-right py-3 px-2">Days held</th>
                                        <th className="text-right py-3 px-4">Return</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((e) => (
                                        <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                            <td className="py-3 px-4">
                                                <Link to={`/t/${e.ticker}`} className="text-white font-bold hover:text-primary">
                                                    {e.ticker}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-2 text-right tabular-nums text-emerald-300">
                                                {e.buyerCount}
                                            </td>
                                            <td className="py-3 px-2 text-right tabular-nums text-white">
                                                {fmtMoney(e.totalValue)}
                                            </td>
                                            <td className="py-3 px-2 text-right text-xs text-text-muted hidden md:table-cell">
                                                {e.latestDate}
                                            </td>
                                            <td className="py-3 px-2 text-right tabular-nums text-text-muted">
                                                {e.daysHeld}d
                                            </td>
                                            <td className={`py-3 px-4 text-right tabular-nums font-bold ${RETURN_TONE(e.returnPct)}`}>
                                                {fmtPct(e.returnPct)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <p className="text-[10px] text-text-muted mt-6 max-w-2xl mx-auto text-center">
                    Returns measured from the cluster&apos;s most recent buy date through the latest
                    available close. Past performance is not investment advice; clusters are
                    information, not recommendations.
                </p>

                <div className="mt-12 text-center">
                    <Link
                        to="/insider"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                        See live insider activity
                        <span className="material-icons text-sm">arrow_forward</span>
                    </Link>
                </div>
            </div>

            <Footer />
        </div>
    )
}
