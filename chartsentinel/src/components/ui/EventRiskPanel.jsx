import { useEffect, useState } from 'react'
import { API_CONFIG } from '../../config/api'

// Compact "how event-sensitive is this ticker" panel for a single
// symbol. Hits /api/signals/event-risk for both CPI and NFP — the
// two event types with enough historical samples to be reliable —
// and renders the multiplier alongside. Returns null silently if
// neither bucket produced a usable number (illiquid / new listings).

function fmtMult(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—'
    return `${n.toFixed(2)}×`
}

function toneFor(n) {
    if (n === null || n === undefined) return 'text-text-muted'
    if (n >= 1.3) return 'text-red-300'
    if (n >= 1.0) return 'text-amber-300'
    return 'text-emerald-300'
}

const EVENTS = [
    { key: 'cpi', label: 'CPI weeks' },
    { key: 'nfp', label: 'NFP weeks' },
]

export default function EventRiskPanel({ ticker, years = 5 }) {
    const [state, setState] = useState({ status: 'loading', reports: {} })

    useEffect(() => {
        if (!ticker) return
        let active = true
        Promise.all(
            EVENTS.map((e) =>
                fetch(
                    `${API_CONFIG.baseURL}/signals/event-risk/${encodeURIComponent(
                        ticker,
                    )}?event=${e.key}&years=${years}`,
                    { headers: API_CONFIG.headers },
                )
                    .then((r) => r.json())
                    .then((body) => [e.key, body])
                    .catch(() => [e.key, null]),
            ),
        ).then((pairs) => {
            if (!active) return
            const reports = {}
            for (const [k, v] of pairs) if (v && !v.error) reports[k] = v
            setState({ status: 'ready', reports })
        })
        return () => {
            active = false
        }
    }, [ticker, years])

    if (state.status === 'loading') return null
    const haveAny = EVENTS.some((e) => state.reports[e.key]?.multiplier !== null)
    if (!haveAny) return null

    return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                    Event-aware vol
                </h3>
                <span className="text-[10px] text-text-muted">last {years}y</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {EVENTS.map((e) => {
                    const r = state.reports[e.key]
                    const m = r?.multiplier ?? null
                    return (
                        <div
                            key={e.key}
                            className="rounded-xl border border-white/5 bg-black/20 p-3"
                        >
                            <div className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">
                                {e.label}
                            </div>
                            <div
                                className={`text-lg font-mono font-bold tabular-nums ${toneFor(
                                    m,
                                )}`}
                            >
                                {fmtMult(m)}
                            </div>
                            <div className="text-[9px] text-text-muted mt-0.5">
                                {r ? `vs baseline · ${r.eventReturns}d sample` : '—'}
                            </div>
                        </div>
                    )
                })}
            </div>
            <p className="text-[10px] text-text-muted mt-3">
                Realised vol inside ±2 trading days of each historical release, vs everything
                else. Multiplier &gt;1 = ticker is historically more volatile around the event.
            </p>
        </section>
    )
}
