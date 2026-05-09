import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_CONFIG } from '../config/api'
import { scoreTint, signalForScore, SIGNAL_LABEL } from '../lib/score-format'

// Embeddable signal badge at /embed/:ticker. Designed to be rendered
// inside a 320×120 iframe on a third-party site. We deliberately
// strip everything that doesn't serve the embed — no nav, no canvas,
// no tracking — so the bundle pulled by the iframe stays tiny and
// the badge feels native to wherever it lands.

export default function EmbedBadgePage() {
    const { ticker: tickerParam } = useParams()
    const ticker = (tickerParam || '').toUpperCase()
    const [state, setState] = useState({ status: 'loading', data: null })

    useEffect(() => {
        if (!ticker) return
        let active = true
        fetch(`${API_CONFIG.baseURL}/signals/score/${encodeURIComponent(ticker)}`, {
            headers: API_CONFIG.headers,
        })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
            .then((data) => active && setState({ status: 'ready', data }))
            .catch(() => active && setState({ status: 'error', data: null }))
        return () => {
            active = false
        }
    }, [ticker])

    const score = state.data?.composite?.score ?? null
    const signal = score !== null ? signalForScore(score) : null
    const label = signal ? SIGNAL_LABEL[signal] : '—'
    const tint = scoreTint(score)
    const home = `https://www.chartsentinel.com/t/${ticker}`

    return (
        <div className="min-h-screen w-full bg-background-dark text-white p-4 flex items-center justify-center">
            <a
                href={home}
                target="_top"
                rel="noopener"
                className="block w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-5 hover:border-primary/40 transition-colors"
            >
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                        ChartSentinel score
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-primary font-bold">
                        Live
                    </span>
                </div>
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <div className="text-3xl font-bold font-mono text-white">{ticker}</div>
                        <div className="text-xs text-text-secondary mt-1">{label}</div>
                    </div>
                    <div className={`text-5xl font-bold font-mono tabular-nums ${tint}`}>
                        {state.status === 'loading'
                            ? '…'
                            : score == null
                            ? '—'
                            : `${score >= 0 ? '+' : ''}${Math.round(score)}`}
                    </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-text-muted text-right">
                    chartsentinel.com →
                </div>
            </a>
        </div>
    )
}
