import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries } from 'lightweight-charts'

export default function RealtimeBinanceChart({ symbol = 'BTCUSDT', height = 250 }) {
    const chartContainerRef = useRef()
    const chartInstanceRef = useRef(null)
    const seriesRef = useRef(null)
    const wsRef = useRef(null)
    
    const [currentPrice, setCurrentPrice] = useState('Loading...')
    const [priceChange, setPriceChange] = useState({ percent: 0, isPositive: true })

    useEffect(() => {
        if (!chartContainerRef.current) return

        // Initialize Lightweight Chart
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
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            crosshair: {
                mode: 0,
                vertLine: {
                    color: 'rgba(217, 70, 239, 0.5)',
                    labelBackgroundColor: '#d946ef',
                },
                horzLine: {
                    color: 'rgba(217, 70, 239, 0.5)',
                    labelBackgroundColor: '#d946ef',
                }
            }
        })
        
        chartInstanceRef.current = chart

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444'
        })
        seriesRef.current = candlestickSeries

        // Fetch recent historical data
        fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=100`)
            .then(res => res.json())
            .then(data => {
                const formattedData = data.map(d => ({
                    time: d[0] / 1000,
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                }))
                candlestickSeries.setData(formattedData)
                
                const lastClose = formattedData[formattedData.length - 1].close
                const firstOpen = formattedData[0].open
                const change = lastClose - firstOpen
                const pct = (change / firstOpen) * 100
                
                setCurrentPrice(`$${lastClose.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
                setPriceChange({
                    percent: pct,
                    isPositive: change >= 0
                })
            })
            .catch(err => console.error("Failed to fetch historical data", err))

        // Connect to Binance WebSocket for live 1m kline updates
        const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_1m`
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data)
            const kline = message.k
            
            const livePrice = parseFloat(kline.c)
            setCurrentPrice(`$${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
            
            candlestickSeries.update({
                time: kline.t / 1000,
                open: parseFloat(kline.o),
                high: parseFloat(kline.h),
                low: parseFloat(kline.l),
                close: parseFloat(kline.c)
            })
        }

        // Handle resizing
        const handleResize = () => {
            if (chartContainerRef.current && chartInstanceRef.current) {
                chartInstanceRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth
                })
            }
        }
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            if (wsRef.current) wsRef.current.close()
            if (chartInstanceRef.current) chartInstanceRef.current.remove()
        }
    }, [symbol, height])

    return (
        <div className="col-span-2 bg-black/40 rounded-xl p-4 border border-white/5 h-full flex flex-col relative overflow-hidden group">
            {/* Background glow decoration */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-1000"></div>
            
            <div className="flex justify-between mb-2 relative z-10 w-full min-w-0">
                <div className="min-w-0">
                    <h4 className="text-sm text-secondary font-semibold tracking-wider flex items-center shrink-0">
                        {symbol.replace('USDT', '/USD')} LIVE
                        <span className="ml-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse"></span>
                    </h4>
                    <div className="flex items-baseline gap-3 mt-1 sm:mt-0 flex-wrap">
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight break-all">{currentPrice}</div>
                        <div className={`text-sm font-semibold font-mono whitespace-nowrap ${priceChange.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {priceChange.isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%
                        </div>
                    </div>
                </div>
                <div className="hidden sm:flex gap-2 self-start shrink-0 ml-4">
                    {['1M', '5M', '15M', '1H'].map(t => (
                        <span key={t} className={`px-2 py-1 rounded text-xs transition-colors ${t === '1M' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-secondary border border-transparent'}`}>
                            {t}
                        </span>
                    ))}
                </div>
            </div>
            {/* The chart container */}
            <div ref={chartContainerRef} className="w-full flex-grow relative z-10" style={{ height }} />
        </div>
    )
}
