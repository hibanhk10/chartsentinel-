import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { insiderService } from '../../services/insiderService'

// Ultimate-only "history scrubber" — drag a slider through the past 90
// days, see which clusters fired that week and the tickers that
// caught flow. Cheap to render: pulls /clusters/history once and
// filters in-memory, so the slider is instant after load.

const fmtMoney = (n) => {
    if (!n) return '$0'
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
    return `$${n.toFixed(0)}`
}

function dateMinusDays(days) {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d
}

export default function TimeScrubber() {
    const [state, setState] = useState({ status: 'loading', data: null, error: null })
    const [daysAgo, setDaysAgo] = useState(0)

    useEffect(() => {
        let active = true
        insiderService
            .getClusterHistory({ days: 90, limit: 200 })
            .then((data) => active && setState({ status: 'ready', data, error: null }))
            .catch((err) => active && setState({ status: 'error', data: null, error: err.message }))
        return () => {
            active = false
        }
    }, [])

    const events = state.data?.events ?? []

    const targetDate = useMemo(() => dateMinusDays(daysAgo), [daysAgo])

    // Show events within ±3 days of the target date — wide enough that
    // a slow-news week still has something on screen, narrow enough
    // that scrubbing feels meaningful.
    const filtered = useMemo(() => {
        if (events.length === 0) return []
        const target = targetDate.getTime()
        return events
            .filter((e) => Math.abs(new Date(e.detectedAt).getTime() - target) < 3 * 86_400_000)
            .sort((a, b) => b.totalValue - a.totalValue)
    }, [events, targetDate])

    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur p-6">
            <header className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
                <div>
                    <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
                        Time scrubber · Ultimate
                    </div>
                    <h3 className="text-lg font-bold text-white">Replay 90 days of insider clusters</h3>
                </div>
                <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-text-muted">
                        Showing
                    </div>
                    <div className="text-sm text-white font-bold tabular-nums">
                        {targetDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                        {daysAgo === 0 && (
                            <span className="ml-2 text-[10px] uppercase tracking-widest text-emerald-300">
                                Today
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <div className="px-1 mb-4">
                <input
                    type="range"
                    min={0}
                    max={90}
                    step={1}
                    value={daysAgo}
                    onChange={(e) => setDaysAgo(Number(e.target.value))}
                    aria-label="Days ago"
                    className="w-full accent-primary cursor-grab"
                />
                <div className="flex justify-between text-[10px] uppercase tracking-widest text-text-muted mt-1">
                    <span>Today</span>
                    <span>30d ago</span>
                    <span>60d ago</span>
                    <span>90d ago</span>
                </div>
            </div>

            {state.status === 'loading' && (
                <div className="text-text-muted text-sm text-center py-8">
                    Loading 90-day history…
                </div>
            )}
            {state.status === 'error' && (
                <div className="text-red-300 text-sm text-center py-8">{state.error}</div>
            )}
            {state.status === 'ready' && filtered.length === 0 && (
                <div className="text-text-muted text-sm text-center py-8">
                    No clusters in the ±3-day window around this date.
                </div>
            )}
            {state.status === 'ready' && filtered.length > 0 && (
                <motion.div
                    key={daysAgo}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                >
                    {filtered.slice(0, 10).map((e) => (
                        <Link
                            key={e.id}
                            to={`/t/${e.ticker}`}
                            className="flex items-center justify-between gap-4 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] hover:bg-emerald-500/10 px-4 py-2.5 transition-colors"
                        >
                            <div className="flex items-baseline gap-3 min-w-0">
                                <span className="text-white font-bold text-sm">{e.ticker}</span>
                                <span className="text-[10px] uppercase tracking-widest text-emerald-300">
                                    {e.buyerCount} buyers
                                </span>
                            </div>
                            <div className="flex items-baseline gap-4 shrink-0">
                                <span className="text-white tabular-nums text-sm font-semibold">
                                    {fmtMoney(e.totalValue)}
                                </span>
                                <span className="text-[10px] text-text-muted hidden sm:inline">
                                    {new Date(e.detectedAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </span>
                            </div>
                        </Link>
                    ))}
                </motion.div>
            )}
        </div>
    )
}
