import { useEffect, useState } from 'react'
import { API_CONFIG } from '../../config/api'

// Compact "what's coming up" macro panel. Public — no auth, no DB —
// the data is generated server-side from a hard-coded FOMC/ECB/BoE
// schedule plus programmatic CPI/NFP dates. Renders the next 6 events
// in the supplied window (default 60 days).

const TYPE_META = {
    fomc: { label: 'FOMC', tone: 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/30' },
    cpi: { label: 'CPI', tone: 'bg-amber-500/15 text-amber-200 border-amber-400/30' },
    nfp: { label: 'NFP', tone: 'bg-sky-500/15 text-sky-200 border-sky-400/30' },
    ecb: { label: 'ECB', tone: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30' },
    boe: { label: 'BoE', tone: 'bg-red-500/15 text-red-200 border-red-400/30' },
}

function daysUntil(iso) {
    const target = new Date(iso + 'T12:00:00Z')
    const now = new Date()
    const ms = target.getTime() - now.getTime()
    return Math.round(ms / 86400000)
}

function fmtDate(iso) {
    return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    })
}

export default function MacroCalendarWidget({ days = 60, max = 6, title = 'Macro events' }) {
    const [state, setState] = useState({ status: 'loading', events: [] })

    useEffect(() => {
        let active = true
        fetch(`${API_CONFIG.baseURL}/signals/calendar?days=${days}`, {
            headers: API_CONFIG.headers,
        })
            .then((r) => r.json())
            .then((body) => {
                if (!active) return
                if (Array.isArray(body.events)) {
                    setState({ status: 'ready', events: body.events.slice(0, max) })
                } else {
                    setState({ status: 'error', events: [] })
                }
            })
            .catch(() => active && setState({ status: 'error', events: [] }))
        return () => {
            active = false
        }
    }, [days, max])

    if (state.status === 'loading') {
        return (
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="h-4 bg-white/5 rounded w-32 mb-3 animate-pulse" />
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />
                    ))}
                </div>
            </section>
        )
    }
    if (state.events.length === 0) return null

    return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-3">
                {title} · next {days}d
            </h3>
            <ul className="space-y-1.5">
                {state.events.map((e) => {
                    const meta = TYPE_META[e.type] || {
                        label: e.type.toUpperCase(),
                        tone: 'bg-white/10 text-text-primary border-white/15',
                    }
                    const d = daysUntil(e.date)
                    return (
                        <li
                            key={`${e.type}-${e.date}`}
                            className="flex items-center gap-3 text-sm"
                        >
                            <span
                                className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border ${meta.tone}`}
                            >
                                {meta.label}
                            </span>
                            <span className="flex-1 truncate text-text-secondary">{e.label}</span>
                            <span className="text-[11px] text-text-muted tabular-nums whitespace-nowrap">
                                {fmtDate(e.date)} · {d === 0 ? 'today' : `${d}d`}
                            </span>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
