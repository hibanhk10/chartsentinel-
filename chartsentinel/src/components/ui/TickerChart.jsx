import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries } from 'lightweight-charts'
import { API_CONFIG } from '../../config/api'

// Public daily-candle chart used on /t/:ticker. Pulls 1 year of bars
// from /api/signals/history/:ticker and renders them with
// lightweight-charts — same library the Terminal uses, so we get a
// consistent feel across the public + auth surfaces. No WebSocket
// stream here; the chart is a static snapshot, refreshed only when
// the component remounts.

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
    const [rangeIdx, setRangeIdx] = useState(2) // 1Y default
    const [state, setState] = useState({ status: 'loading', bars: null, error: null })

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

    return (
        <div className="relative">
            <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                    Daily candles
                </div>
                <div className="flex gap-1">
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
        </div>
    )
}
