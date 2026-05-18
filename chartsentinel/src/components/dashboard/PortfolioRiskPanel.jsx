import { useEffect, useState } from 'react'
import api from '../../services/api'

// Portfolio-level risk metrics + pairwise correlation matrix. Mounts
// on the Portfolio tab beneath the score table. Fires two parallel
// requests; either side can fail without the other being hidden so a
// user with one delisted ticker still sees the working view.

const fmtPct = (n, digits = 1) =>
    n === null || n === undefined || Number.isNaN(n)
        ? '—'
        : `${(n * 100).toFixed(digits)}%`
const fmtRatio = (n) =>
    n === null || n === undefined || Number.isNaN(n) ? '—' : n.toFixed(2)

const TONE_FOR_SHARPE = (n) => {
    if (n === null || n === undefined) return 'text-text-muted'
    if (n >= 1) return 'text-emerald-300'
    if (n >= 0) return 'text-emerald-400/80'
    if (n >= -0.5) return 'text-amber-300'
    return 'text-red-300'
}

// 0 → grey, +1 → red (highly correlated), -1 → green (good
// diversifier). Used to colour the correlation heatmap cells.
function corrTone(c) {
    if (c === null || c === undefined) return { bg: 'rgba(255,255,255,0.04)', text: '#a1a1aa' }
    const intensity = Math.min(1, Math.abs(c))
    if (c >= 0) {
        // Red shades for positive correlation (clustered risk).
        const alpha = 0.1 + 0.4 * intensity
        return {
            bg: `rgba(239, 68, 68, ${alpha})`,
            text: intensity > 0.5 ? '#fff' : '#fecaca',
        }
    }
    // Green for negative correlation (real diversification).
    const alpha = 0.1 + 0.4 * intensity
    return {
        bg: `rgba(34, 197, 94, ${alpha})`,
        text: intensity > 0.5 ? '#fff' : '#bbf7d0',
    }
}

export default function PortfolioRiskPanel({ portfolioId }) {
    const [risk, setRisk] = useState({ status: 'loading' })
    const [corr, setCorr] = useState({ status: 'loading' })

    useEffect(() => {
        if (!portfolioId) return
        let active = true
        setRisk({ status: 'loading' })
        setCorr({ status: 'loading' })
        api
            .get(`/portfolios/${portfolioId}/risk`)
            .then((data) => active && setRisk({ status: 'ready', data }))
            .catch((err) => active && setRisk({ status: 'error', error: err.message }))
        api
            .get(`/portfolios/${portfolioId}/correlations`)
            .then((data) => active && setCorr({ status: 'ready', data }))
            .catch((err) => active && setCorr({ status: 'error', error: err.message }))
        return () => {
            active = false
        }
    }, [portfolioId])

    return (
        <div className="space-y-5">
            {/* Risk metrics */}
            <section className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
                <div className="flex items-baseline justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">Portfolio risk</h3>
                    {risk.status === 'ready' && (
                        <span className="text-[10px] text-text-muted">
                            {risk.data.windowDays} trading days · {risk.data.holdings.length} holdings
                        </span>
                    )}
                </div>

                {risk.status === 'loading' && (
                    <div className="grid grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-16 bg-white/5 rounded animate-pulse" />
                        ))}
                    </div>
                )}
                {risk.status === 'error' && (
                    <p className="text-sm text-red-300">{risk.error}</p>
                )}
                {risk.status === 'ready' && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <Tile
                                label="95% VaR"
                                value={fmtPct(risk.data.metrics.varDaily95)}
                                tone="text-red-300"
                                sub="daily worst-case"
                            />
                            <Tile
                                label="Annual vol"
                                value={fmtPct(risk.data.metrics.annualVolatility)}
                                sub="weighted σ"
                            />
                            <Tile
                                label="Sharpe"
                                value={fmtRatio(risk.data.metrics.sharpe)}
                                tone={TONE_FOR_SHARPE(risk.data.metrics.sharpe)}
                            />
                            <Tile
                                label="Max drawdown"
                                value={fmtPct(risk.data.metrics.maxDrawdown)}
                                tone="text-red-300"
                                sub="peak → trough"
                            />
                        </div>
                        {risk.data.droppedHoldings?.length > 0 && (
                            <p className="text-[10px] text-amber-300">
                                Skipped (no price data):{' '}
                                {risk.data.droppedHoldings.join(', ')}
                            </p>
                        )}
                    </>
                )}
            </section>

            {/* Correlation heatmap */}
            <section className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-1">Correlation matrix</h3>
                <p className="text-[11px] text-text-muted mb-4">
                    Pairwise Pearson over the last year. Red = clustered (moves together — no
                    diversification). Green = inverse (real diversifier).
                </p>

                {corr.status === 'loading' && (
                    <div className="h-32 bg-white/5 rounded animate-pulse" />
                )}
                {corr.status === 'error' && (
                    <p className="text-sm text-text-muted">{corr.error}</p>
                )}
                {corr.status === 'ready' && corr.data.tickers.length < 2 && (
                    <p className="text-sm text-text-muted">
                        Add at least 2 holdings to see correlations.
                    </p>
                )}
                {corr.status === 'ready' && corr.data.tickers.length >= 2 && (
                    <div className="overflow-x-auto">
                        <table className="text-xs">
                            <thead>
                                <tr>
                                    <th className="p-2"></th>
                                    {corr.data.tickers.map((t) => (
                                        <th
                                            key={t}
                                            className="p-2 text-[10px] uppercase tracking-widest text-text-muted font-bold"
                                        >
                                            {t}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {corr.data.tickers.map((rowT, i) => (
                                    <tr key={rowT}>
                                        <th className="p-2 text-[10px] uppercase tracking-widest text-text-muted font-bold text-right">
                                            {rowT}
                                        </th>
                                        {corr.data.tickers.map((colT, j) => {
                                            const c = corr.data.matrix[i][j]
                                            const { bg, text } = corrTone(c)
                                            return (
                                                <td
                                                    key={colT}
                                                    className="p-2 text-center font-mono tabular-nums"
                                                    style={{ backgroundColor: bg, color: text }}
                                                    title={`${rowT} vs ${colT}: ${
                                                        c === null ? 'n/a' : c.toFixed(2)
                                                    }`}
                                                >
                                                    {c === null ? '—' : c.toFixed(2)}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}

function Tile({ label, value, sub, tone = 'text-white' }) {
    return (
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
            <div className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-1">
                {label}
            </div>
            <div className={`text-base font-mono font-bold tabular-nums ${tone}`}>{value}</div>
            {sub && <div className="text-[9px] text-text-muted mt-0.5">{sub}</div>}
        </div>
    )
}
