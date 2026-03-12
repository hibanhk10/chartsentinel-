import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries } from 'lightweight-charts'

const TIMEFRAMES = [
    { label: '1M',  interval: '1m'  },
    { label: '5M',  interval: '5m'  },
    { label: '15M', interval: '15m' },
    { label: '1H',  interval: '1h'  },
]

export default function RealtimeBinanceChart({ symbol = 'BTCUSDT', height = 250 }) {
    const chartContainerRef = useRef()
    const chartInstanceRef = useRef(null)
    const seriesRef = useRef(null)
    const wsRef = useRef(null)

    const [currentPrice, setCurrentPrice] = useState('Loading...')
    const [priceChange, setPriceChange] = useState({ percent: 0, isPositive: true })
    const [activeInterval, setActiveInterval] = useState('1m')

    // Initialize chart instance once on mount
    useEffect(() => {
        if (!chartContainerRef.current) return

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: height,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                rightOffset: 12,
            },
            rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.1)' },
            crosshair: {
                mode: 0,
                vertLine: { color: 'rgba(217, 70, 239, 0.5)', labelBackgroundColor: '#d946ef' },
                horzLine: { color: 'rgba(217, 70, 239, 0.5)', labelBackgroundColor: '#d946ef' },
            }
        })
        chartInstanceRef.current = chart

        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444'
        })
        seriesRef.current = series

        const handleResize = () => {
            if (chartContainerRef.current && chartInstanceRef.current) {
                chartInstanceRef.current.applyOptions({ width: chartContainerRef.current.clientWidth })
            }
        }
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            if (wsRef.current) wsRef.current.close()
            chart.remove()
        }
    }, [symbol, height])

    // Re-run whenever the active interval changes — loads new candles + new WS
    useEffect(() => {
        if (!seriesRef.current) return

        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }

        fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${activeInterval}&limit=100`)
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data)) return
                const formatted = data.map(d => ({
                    time: d[0] / 1000,
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                }))
                seriesRef.current?.setData(formatted)

                const last = formatted[formatted.length - 1]
                const first = formatted[0]
                const change = last.close - first.open
                const pct = (change / first.open) * 100
                setCurrentPrice(`$${last.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
                setPriceChange({ percent: pct, isPositive: change >= 0 })
            })
            .catch(err => console.error('Failed to fetch klines', err))

        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${activeInterval}`)
        wsRef.current = ws

        ws.onmessage = (event) => {
            const { k } = JSON.parse(event.data)
            const livePrice = parseFloat(k.c)
            setCurrentPrice(`$${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
            seriesRef.current?.update({
                time: k.t / 1000,
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: livePrice,
            })
        }

        return () => {
            if (wsRef.current) wsRef.current.close()
        }
    }, [symbol, activeInterval])

    return (
        <div className="col-span-2 bg-black/40 rounded-xl p-4 border border-white/5 h-full flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-1000" />

            <div className="flex justify-between mb-2 relative z-10 w-full min-w-0">
                <div className="min-w-0">
                    <h4 className="text-sm text-secondary font-semibold tracking-wider flex items-center shrink-0">
                        {symbol.replace('USDT', '/USD')} LIVE
                        <span className="ml-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
                    </h4>
                    <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight break-all">{currentPrice}</div>
                        <div className={`text-sm font-semibold font-mono whitespace-nowrap ${priceChange.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {priceChange.isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%
                        </div>
                    </div>
                </div>
                <div className="hidden sm:flex gap-2 self-start shrink-0 ml-4">
                    {TIMEFRAMES.map(({ label, interval }) => (
                        <button
                            key={label}
                            onClick={() => setActiveInterval(interval)}
                            className={`px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                                activeInterval === interval
                                    ? 'bg-primary/20 text-primary border border-primary/30'
                                    : 'text-secondary border border-transparent hover:text-white hover:border-white/20'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div ref={chartContainerRef} className="w-full flex-grow relative z-10" style={{ height }} />
        </div>
    )
}
