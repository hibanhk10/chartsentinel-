import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import SEO from '../components/ui/SEO'
import Footer from '../sections/Footer/Footer'
import { API_CONFIG } from '../config/api'
import { scoreTint, signalForScore, SIGNAL_LABEL } from '../lib/score-format'

// /compare?a=AAPL&b=MSFT — public side-by-side composite comparison.
// Hits the existing /api/signals/score/:ticker endpoint twice; the
// shareable URL is the whole point: traders post these in Discord and
// each share is a free backlink + brand impression.

const fmtNumber = (n, digits = 1) =>
    n === null || n === undefined || Number.isNaN(n) ? '—' : Number(n).toFixed(digits)

function ScoreCircle({ score, size = 'lg' }) {
    if (score === null || score === undefined) {
        return (
            <div className={`${size === 'lg' ? 'w-32 h-32' : 'w-20 h-20'} rounded-full border-4 border-white/10 flex items-center justify-center text-text-muted`}>
                <span className="text-3xl">—</span>
            </div>
        )
    }
    const tint = scoreTint(score)
    const dim = size === 'lg' ? 'w-32 h-32 text-5xl' : 'w-20 h-20 text-3xl'
    return (
        <div className={`${dim} rounded-full border-4 ${tint.border} ${tint.bg} flex items-center justify-center font-bold tabular-nums ${tint.text}`}>
            {Math.round(score)}
        </div>
    )
}

function fetchScore(ticker) {
    return fetch(`${API_CONFIG.baseURL}/signals/score/${encodeURIComponent(ticker)}`, {
        headers: API_CONFIG.headers,
    }).then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
        return body
    })
}

function TickerColumn({ ticker, accent }) {
    const [state, setState] = useState({ status: 'loading', data: null, error: null })

    useEffect(() => {
        if (!ticker) return
        let active = true
        setState({ status: 'loading', data: null, error: null })
        fetchScore(ticker)
            .then((data) => active && setState({ status: 'ready', data, error: null }))
            .catch((err) => active && setState({ status: 'error', data: null, error: err.message }))
        return () => {
            active = false
        }
    }, [ticker])

    const composite = state.data?.composite
    const score = composite?.score ?? null
    const signal = score !== null ? signalForScore(score) : null
    const label = signal ? SIGNAL_LABEL[signal] : '—'

    return (
        <div className={`rounded-3xl border ${accent ? 'border-primary/30 bg-primary/5' : 'border-white/10 bg-white/[0.02]'} backdrop-blur p-8`}>
            <div className="text-center">
                <Link to={`/t/${ticker}`} className="text-3xl font-bold text-white hover:text-primary">
                    {ticker || '—'}
                </Link>
                <div className="text-[10px] uppercase tracking-widest text-text-muted mt-1">
                    {state.status === 'ready' ? composite?.signalLabel || label : ''}
                </div>
            </div>

            <div className="flex justify-center my-8">
                {state.status === 'loading' && (
                    <div className="w-32 h-32 rounded-full border-4 border-white/10 animate-pulse" />
                )}
                {state.status === 'error' && (
                    <div className="text-red-300 text-sm text-center max-w-xs">
                        {state.error}
                    </div>
                )}
                {state.status === 'ready' && <ScoreCircle score={score} />}
            </div>

            {state.status === 'ready' && composite && (
                <div className="space-y-3">
                    <ComponentRow
                        label="Seasonality"
                        value={composite.components?.seasonal?.score}
                        contribution={composite.components?.seasonal?.weight}
                    />
                    <ComponentRow
                        label="COT positioning"
                        value={composite.components?.cot?.score}
                        contribution={composite.components?.cot?.weight}
                    />
                    <ComponentRow
                        label="Pattern match"
                        value={composite.components?.pattern?.score}
                        contribution={composite.components?.pattern?.weight}
                    />
                    <ComponentRow
                        label="Base"
                        value={composite.components?.base?.score}
                        contribution={composite.components?.base?.weight}
                    />
                </div>
            )}
        </div>
    )
}

function ComponentRow({ label, value, contribution }) {
    return (
        <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-text-secondary">{label}</span>
            <div className="flex items-baseline gap-2">
                <span className="text-white font-mono tabular-nums">
                    {fmtNumber(value, 0)}
                </span>
                {contribution !== undefined && (
                    <span className="text-[10px] text-text-muted">
                        × {fmtNumber(contribution, 2)}
                    </span>
                )}
            </div>
        </div>
    )
}

export default function ComparePage() {
    const [params, setParams] = useSearchParams()
    const initialA = (params.get('a') || '').toUpperCase()
    const initialB = (params.get('b') || '').toUpperCase()
    const [a, setA] = useState(initialA)
    const [b, setB] = useState(initialB)

    const handleSwap = () => {
        const next = new URLSearchParams()
        next.set('a', b || '')
        next.set('b', a || '')
        setParams(next)
        setA(b)
        setB(a)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const next = new URLSearchParams()
        if (a) next.set('a', a.toUpperCase())
        if (b) next.set('b', b.toUpperCase())
        setParams(next)
    }

    return (
        <div className="relative z-10 w-full bg-background-dark text-text-primary min-h-screen">
            <SEO
                title={initialA && initialB ? `${initialA} vs ${initialB}` : 'Compare tickers'}
                description={
                    initialA && initialB
                        ? `Side-by-side composite score comparison: ${initialA} vs ${initialB} on ChartSentinel.`
                        : 'Compare any two tickers side-by-side: composite score, seasonality, COT positioning, and pattern matches.'
                }
                path={`/compare${initialA && initialB ? `?a=${initialA}&b=${initialB}` : ''}`}
            />

            <div className="max-w-5xl mx-auto px-6 pt-32 pb-20">
                <motion.header
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-10 text-center"
                >
                    <span className="font-display text-primary text-sm font-bold tracking-widest uppercase glow-magenta">
                        Compare
                    </span>
                    <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tighter text-white mt-3">
                        Two tickers, side-by-side
                    </h1>
                    <p className="text-text-secondary max-w-xl mx-auto mt-4">
                        Composite scores blended from seasonality, COT positioning, pattern matches,
                        and base — the same engine that drives the live dashboard.
                    </p>
                </motion.header>

                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch justify-center gap-3 mb-12 max-w-2xl mx-auto">
                    <input
                        type="text"
                        value={a}
                        onChange={(e) => setA(e.target.value.toUpperCase())}
                        placeholder="First ticker (e.g. AAPL)"
                        className="flex-1 px-4 py-3 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-text-muted text-sm focus:outline-none focus:border-primary/50"
                    />
                    <button
                        type="button"
                        onClick={handleSwap}
                        title="Swap"
                        className="hidden sm:flex w-12 h-12 rounded-full bg-white/5 border border-white/10 items-center justify-center text-white hover:bg-white/10 transition-colors"
                    >
                        <span className="material-icons text-base">sync_alt</span>
                    </button>
                    <input
                        type="text"
                        value={b}
                        onChange={(e) => setB(e.target.value.toUpperCase())}
                        placeholder="Second ticker (e.g. MSFT)"
                        className="flex-1 px-4 py-3 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-text-muted text-sm focus:outline-none focus:border-primary/50"
                    />
                    <button
                        type="submit"
                        className="px-6 py-3 rounded-full bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors"
                    >
                        Compare
                    </button>
                </form>

                {(initialA && initialB) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <TickerColumn ticker={initialA} />
                        <TickerColumn ticker={initialB} accent />
                    </div>
                ) : (
                    <div className="text-center py-12 text-text-muted">
                        Enter two tickers above to compare.
                    </div>
                )}

                <div className="mt-12 text-center">
                    <Link to="/services" className="text-sm text-primary hover:underline">
                        How the composite score works
                    </Link>
                </div>
            </div>

            <Footer />
        </div>
    )
}
