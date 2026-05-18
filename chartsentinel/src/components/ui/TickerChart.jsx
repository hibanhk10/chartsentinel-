import { useEffect, useMemo, useRef, useState } from 'react'
import { createChart, CandlestickSeries, AreaSeries, LineSeries } from 'lightweight-charts'
import { API_CONFIG } from '../../config/api'

// Public daily-candle chart used on /t/:ticker. Pulls history from
// /api/signals/history/:ticker and overlays a Monte Carlo probability
// cone from /api/signals/projection/:ticker so visitors see "where
// the model thinks this could land in N days." The cone is opt-in
// via the Project button — adds a couple percentile bands as a fan
// past the last candle.

const RANGES = [
    { label: '3M', years: 1, bars: 90 },
    { label: '6M', years: 1, bars: 180 },
    { label: '1Y', years: 1, bars: 252 },
    { label: '3Y', years: 3, bars: 252 * 3 },
    { label: '5Y', years: 5, bars: 252 * 5 },
]

export default function TickerChart({ ticker, height = 320 }) {
    const containerRef = useRef(null)
    const chartRef = useRef(null)
    const seriesRef = useRef(null)
    // Projection series — three line/area objects, plotted forward
    // from the last candle when the user toggles the cone on.
    const projSeriesRef = useRef({ upper: null, lower: null, median: null })
    const [rangeIdx, setRangeIdx] = useState(2) // 1Y default
    const [state, setState] = useState({ status: 'loading', bars: null, error: null })
    const [showProjection, setShowProjection] = useState(false)
    const [projectionHorizon, setProjectionHorizon] = useState(30)
    const [projection, setProjection] = useState({ status: 'idle', data: null })

    useEffect(() => {
        if (!containerRef.current) return
        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
            },
            timeScale: {
                timeVisible: false,
                borderColor: 'rgba(255, 255, 255, 0.08)',
            },
            rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' },
            crosshair: {
                mode: 0,
                vertLine: { color: 'rgba(217, 70, 239, 0.4)', labelBackgroundColor: '#d946ef' },
                horzLine: { color: 'rgba(217, 70, 239, 0.4)', labelBackgroundColor: '#d946ef' },
            },
            width: containerRef.current.clientWidth,
            height,
        })
        chartRef.current = chart
        seriesRef.current = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        })

        const handleResize = () => {
            if (containerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
            }
        }
        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
            chartRef.current = null
            seriesRef.current = null
        }
    }, [height])

    // Re-fetch when the ticker or selected range changes. We pull the
    // widest needed years span and slice client-side per range so the
    // server cache is hit consistently.
    useEffect(() => {
        if (!ticker) return
        let active = true
        const range = RANGES[rangeIdx]
        setState({ status: 'loading', bars: null, error: null })
        fetch(`${API_CONFIG.baseURL}/signals/history/${encodeURIComponent(ticker)}?years=${range.years}`, {
            headers: API_CONFIG.headers,
        })
            .then(async (r) => {
                const body = await r.json().catch(() => ({}))
                if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
                return body
            })
            .then((data) => {
                if (!active || !data?.bars) return
                const sliced = data.bars.slice(-range.bars)
                setState({ status: 'ready', bars: sliced, error: null })
            })
            .catch((err) => active && setState({ status: 'error', bars: null, error: err.message }))
        return () => {
            active = false
        }
    }, [ticker, rangeIdx])

    // Paint candles into the series whenever new bars arrive.
    useEffect(() => {
        if (state.status !== 'ready' || !seriesRef.current || !state.bars) return
        const data = state.bars
            .filter((b) => b && b.date)
            .map((b) => ({
                time: b.date,
                open: b.open,
                high: b.high,
                low: b.low,
                close: b.close,
            }))
        seriesRef.current.setData(data)
        if (chartRef.current) chartRef.current.timeScale().fitContent()
    }, [state])

    // Pull a fresh projection whenever the user toggles it on or
    // changes the horizon. Result lives in projection.data; the
    // next effect paints it onto the chart.
    useEffect(() => {
        if (!showProjection || !ticker) {
            setProjection({ status: 'idle', data: null })
            return
        }
        let active = true
        setProjection({ status: 'loading', data: null })
        fetch(
            `${API_CONFIG.baseURL}/signals/projection/${encodeURIComponent(ticker)}?days=${projectionHorizon}`,
            { headers: API_CONFIG.headers },
        )
            .then(async (r) => {
                const body = await r.json().catch(() => ({}))
                if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
                return body
            })
            .then((data) => active && setProjection({ status: 'ready', data }))
            .catch((err) => active && setProjection({ status: 'error', data: null, error: err.message }))
        return () => {
            active = false
        }
    }, [showProjection, projectionHorizon, ticker])

    // Paint projection lines on top of the candle series. Three
    // overlay series: median (solid), p95 (upper), p05 (lower).
    // Recreate them on each new projection so toggling off cleanly
    // removes the overlay.
    useEffect(() => {
        const chart = chartRef.current
        if (!chart) return
        // Always tear down old projection series first so a toggle
        // doesn't stack ghost lines.
        for (const k of ['upper', 'median', 'lower']) {
            const s = projSeriesRef.current[k]
            if (s) {
                try {
                    chart.removeSeries(s)
                } catch {
                    /* already removed */
                }
                projSeriesRef.current[k] = null
            }
        }
        if (!showProjection || projection.status !== 'ready' || !projection.data) return

        const startDate = projection.data.startDate
        const startPrice = projection.data.startPrice
        const bands = projection.data.bands ?? []
        // Use trading-day offsets forward from the last candle. We
        // don't try to be calendar-precise — weekends/holidays would
        // need a market-calendar service. Sequential dates are good
        // enough for the visual fan.
        const stepDate = (offset) => {
            const d = new Date(startDate)
            // Skip Sat/Sun naively to match trading-day cadence.
            let added = 0
            while (added < offset) {
                d.setUTCDate(d.getUTCDate() + 1)
                const dow = d.getUTCDay()
                if (dow !== 0 && dow !== 6) added++
            }
            return d.toISOString().slice(0, 10)
        }
        const seedPoint = { time: startDate, value: startPrice }
        const median = [
            seedPoint,
            ...bands.map((b) => ({ time: stepDate(b.dayIndex), value: b.values.p50 })),
        ]
        const upper = [
            seedPoint,
            ...bands.map((b) => ({ time: stepDate(b.dayIndex), value: b.values.p95 })),
        ]
        const lower = [
            seedPoint,
            ...bands.map((b) => ({ time: stepDate(b.dayIndex), value: b.values.p05 })),
        ]
        // Upper band as a translucent area, lower band as a darker
        // line — eye reads the gap as the probability cone.
        const upperSeries = chart.addSeries(AreaSeries, {
            topColor: 'rgba(34, 211, 238, 0.18)',
            bottomColor: 'rgba(34, 211, 238, 0.02)',
            lineColor: 'rgba(34, 211, 238, 0.6)',
            lineWidth: 1,
        })
        upperSeries.setData(upper)
        const lowerSeries = chart.addSeries(LineSeries, {
            color: 'rgba(217, 70, 239, 0.55)',
            lineWidth: 1,
        })
        lowerSeries.setData(lower)
        const medianSeries = chart.addSeries(LineSeries, {
            color: 'rgba(255, 255, 255, 0.7)',
            lineWidth: 2,
            lineStyle: 2, // dashed
        })
        medianSeries.setData(median)
        projSeriesRef.current = {
            upper: upperSeries,
            lower: lowerSeries,
            median: medianSeries,
        }
        chart.timeScale().fitContent()
    }, [showProjection, projection])

    // Headline drift + vol numbers the cone is grounded in — useful
    // honesty so the visitor sees the assumption.
    const projectionSummary = useMemo(() => {
        if (projection.status !== 'ready' || !projection.data) return null
        return {
            muPct: (projection.data.muAnnual * 100).toFixed(1),
            sigmaPct: (projection.data.sigmaAnnual * 100).toFixed(1),
        }
    }, [projection])

    return (
        <div className="relative">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                    Daily candles
                </div>
                <div className="flex gap-1 items-center flex-wrap">
                    {RANGES.map((r, i) => (
                        <button
                            key={r.label}
                            onClick={() => setRangeIdx(i)}
                            className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded transition-colors ${
                                rangeIdx === i
                                    ? 'bg-primary text-white'
                                    : 'bg-white/5 text-text-muted hover:bg-white/10'
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
                    <span className="mx-2 h-4 border-l border-white/10" />
                    {/* Projection toggle + horizon picker. Bands only
                        render past the last candle so the existing
                        history view stays clean when the cone is
                        toggled off. */}
                    <button
                        onClick={() => setShowProjection((v) => !v)}
                        className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded transition-colors ${
                            showProjection
                                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                                : 'bg-white/5 text-text-muted hover:bg-white/10'
                        }`}
                    >
                        {showProjection ? '✓ Project' : 'Project'}
                    </button>
                    {showProjection && (
                        <select
                            value={projectionHorizon}
                            onChange={(e) => setProjectionHorizon(Number(e.target.value))}
                            className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded bg-white/5 text-text-muted hover:bg-white/10 focus:outline-none"
                        >
                            <option value={14} className="bg-surface-dark">2w</option>
                            <option value={30} className="bg-surface-dark">30d</option>
                            <option value={60} className="bg-surface-dark">60d</option>
                            <option value={90} className="bg-surface-dark">90d</option>
                        </select>
                    )}
                </div>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/30 p-2" style={{ height: height + 16 }}>
                {state.status === 'error' && (
                    <div className="text-text-muted text-sm text-center py-12">
                        {state.error}
                    </div>
                )}
                <div ref={containerRef} className="w-full" style={{ height }} />
            </div>

            {showProjection && projection.status === 'error' && (
                <p className="text-[10px] text-red-300 mt-2">{projection.error}</p>
            )}
            {showProjection && projectionSummary && (
                <p className="text-[10px] text-text-muted mt-2">
                    Probability cone: {projectionHorizon} trading days forward, 1000-path Monte
                    Carlo using {projectionSummary.muPct}% annual drift and {projectionSummary.sigmaPct}%
                    annual volatility. Bands are p05 (lower) / p50 (median, dashed) / p95 (upper).
                    Informational only — not a forecast.
                </p>
            )}
        </div>
    )
}
