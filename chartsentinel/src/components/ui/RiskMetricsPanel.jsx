import { useEffect, useState } from 'react'
import { API_CONFIG } from '../../config/api'

// VaR / Sharpe / Sortino / max-drawdown panel for a single ticker.
// Pulls /api/signals/risk/:ticker which returns nulls for any metric
// it couldn't compute (insufficient data, zero vol). UI renders "—"
// in those cells rather than crashing the whole panel.

const fmtPct = (n, digits = 2) =>
    n === null || n === undefined || Number.isNaN(n)
        ? '—'
        : `${(n * 100).toFixed(digits)}%`
const fmtRatio = (n) =>
    n === null || n === undefined || Number.isNaN(n) ? '—' : n.toFixed(2)
const fmtDate = (s) =>
    s ? new Date(s).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'

const TONE_FOR_SHARPE = (n) => {
    if (n === null || n === undefined) return 'text-text-muted'
    if (n >= 1) return 'text-emerald-300'
    if (n >= 0) return 'text-emerald-400/80'
    if (n >= -0.5) return 'text-amber-300'
    return 'text-red-300'
}

// |β| ≈ 1 = roughly market-tracking, low signal. >1.3 or <0.7 is
// where the user should actually pay attention — amber/emerald
// respectively, since high-beta = more risk while low-beta is
// defensive but typically positive framing.
const TONE_FOR_BETA = (n) => {
    if (n === null || n === undefined) return 'text-text-muted'
    const a = Math.abs(n)
    if (a >= 1.3) return 'text-amber-300'
    if (a <= 0.7) return 'text-emerald-300'
    return 'text-white'
}

export default function RiskMetricsPanel({ ticker, years = 3 }) {
    const [state, setState] = useState({ status: 'loading', data: null, error: null })

    useEffect(() => {
        if (!ticker) return
        let active = true
        fetch(`${API_CONFIG.baseURL}/signals/risk/${encodeURIComponent(ticker)}?years=${years}`, {
            headers: API_CONFIG.headers,
        })
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
    }, [ticker, years])

    if (state.status === 'loading') {
        return (
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="h-4 bg-white/5 rounded w-28 mb-3 animate-pulse" />
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-white/5 rounded animate-pulse" />
                    ))}
                </div>
            </section>
        )
    }
    if (state.status === 'error') return null

    const m = state.data?.metrics
    if (!m || m.samples < 30) return null

    return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                    Risk · last {years}y
                </h3>
                <span className="text-[10px] text-text-muted">
                    {m.samples} trading days
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Tile label="95% VaR" value={fmtPct(m.varDaily95)} sub="daily worst-case (5%)" tone="text-red-300" />
                <Tile label="99% VaR" value={fmtPct(m.varDaily99)} sub="daily worst-case (1%)" tone="text-red-300" />
                <Tile label="Annual vol" value={fmtPct(m.annualVolatility, 1)} sub="annualised σ" />
                <Tile label="Annual return" value={fmtPct(m.annualReturn, 1)} tone={m.annualReturn > 0 ? 'text-emerald-300' : 'text-red-300'} />
                <Tile label="Sharpe" value={fmtRatio(m.sharpe)} tone={TONE_FOR_SHARPE(m.sharpe)} sub="return / total vol" />
                <Tile label="Sortino" value={fmtRatio(m.sortino)} tone={TONE_FOR_SHARPE(m.sortino)} sub="return / downside vol" />
                <Tile
                    label="Max drawdown"
                    value={fmtPct(m.maxDrawdown, 1)}
                    tone="text-red-300"
                    sub={
                        m.maxDrawdownPeakDate && m.maxDrawdownTroughDate
                            ? `${fmtDate(m.maxDrawdownPeakDate)} → ${fmtDate(m.maxDrawdownTroughDate)}`
                            : 'peak → trough'
                    }
                />
                {/* Beta tiles only render when a benchmark was actually
                    used. For SPY-itself we skip the benchmark fetch
                    server-side so these fields come back null. */}
                {m.beta !== null && m.beta !== undefined && (
                    <Tile
                        label={`Beta vs SPY`}
                        value={fmtRatio(m.beta)}
                        tone={TONE_FOR_BETA(m.beta)}
                        sub={
                            m.benchmarkRSquared !== null && m.benchmarkRSquared !== undefined
                                ? `r² ${(m.benchmarkRSquared * 100).toFixed(0)}%`
                                : 'market sensitivity'
                        }
                    />
                )}
                {m.idiosyncraticVol !== null && m.idiosyncraticVol !== undefined && (
                    <Tile
                        label="Stock-specific risk"
                        value={fmtPct(m.idiosyncraticVol, 1)}
                        sub="residual σ (annualised)"
                    />
                )}
                <Tile
                    label="EWMA vol"
                    value={fmtPct(m.ewmaVolatility, 1)}
                    sub="recent-weighted σ"
                />
            </div>

            <p className="text-[10px] text-text-muted mt-3">
                Historical-method VaR (no normality assumption). Sharpe / Sortino assume 0% risk-free
                rate. EWMA (λ=0.94) over-weights recent returns to catch regime shifts faster than the
                simple annualised σ. Past performance is not a forecast.
            </p>
        </section>
    )
}

function Tile({ label, value, sub, tone = 'text-white' }) {
    return (
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
            <div className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">
                {label}
            </div>
            <div className={`text-lg font-mono font-bold tabular-nums ${tone}`}>{value}</div>
            {sub && <div className="text-[9px] text-text-muted mt-0.5">{sub}</div>}
        </div>
    )
}
