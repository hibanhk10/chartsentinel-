import { useState } from 'react'
import { DotPattern } from '../../components/ui/Patterns'
/* eslint-disable no-unused-vars */
import { motion } from 'framer-motion' // Added this import as motion.div is used

export default function TradingVisualization() {
    // Generate candlestick data - moved to useState to avoid purity errors in React 19
    const [candlesticks] = useState(() =>
        Array.from({ length: 20 }, () => { // Changed (_) to ()
            const open = 100 + Math.random() * 50
            const close = open + (Math.random() - 0.5) * 20
            const high = Math.max(open, close) + Math.random() * 10
            const low = Math.min(open, close) - Math.random() * 10
            return { open, close, high, low, bullish: close > open }
        })
    )

    const [bids] = useState(() => [42150, 42148, 42145].map(price => ({
        price,
        size: (Math.random() * 5).toFixed(2)
    })))

    const [asks] = useState(() => [42152, 42155, 42158].map(price => ({
        price,
        size: (Math.random() * 5).toFixed(2)
    })))

    const maxPrice = Math.max(...candlesticks.map(c => c.high))
    const minPrice = Math.min(...candlesticks.map(c => c.low))
    const priceRange = maxPrice - minPrice

    return (
        <div className="relative w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden flex flex-col border border-white/10 rounded-3xl">
            <DotPattern className="absolute inset-0 text-slate-800 opacity-20" />

            {/* Header */}
            <div className="relative z-10 p-6 border-b border-white/5 flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-bold text-white font-mono">BTC/USD</h3>
                    <p className="text-green-400 text-sm font-mono">+2.4% • $42,150.20</p>
                </div>
                <div className="flex gap-2">
                    {['1H', '4H', '1D', '1W'].map(t => (
                        <span key={t} className="px-3 py-1 rounded bg-white/5 text-xs text-secondary hover:text-white cursor-pointer transition-colors border border-white/10">
                            {t}
                        </span>
                    ))}
                </div>
            </div>

            {/* Candlestick Chart */}
            <div className="relative flex-1 p-6">
                <div className="absolute inset-6 flex items-end gap-1">
                    {candlesticks.map((candle, i) => {
                        const bodyHeight = Math.abs(candle.close - candle.open) / priceRange * 100
                        const wickHeight = (candle.high - candle.low) / priceRange * 100
                        const bodyBottom = (candle.close < candle.open ? candle.close : candle.open - minPrice) / priceRange * 100
                        const wickBottom = (candle.low - minPrice) / priceRange * 100

                        return (
                            <motion.div
                                key={i}
                                className="relative flex-1 flex flex-col items-center justify-end"
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                transition={{ duration: 0.5, delay: i * 0.05 }}
                            >
                                {/* Wick */}
                                <div
                                    className={`w-0.5 ${candle.bullish ? 'bg-green-500' : 'bg-red-500'}`}
                                    style={{ height: `${wickHeight}%`, marginBottom: `${wickBottom}%` }}
                                />
                                {/* Body */}
                                <div
                                    className={`w-full ${candle.bullish ? 'bg-green-500' : 'bg-red-500'} absolute bottom-0`}
                                    style={{ height: `${bodyHeight}%`, bottom: `${bodyBottom}%` }}
                                />
                            </motion.div>
                        )
                    })}
                </div>

                {/* Price Grid Lines */}
                {[0, 25, 50, 75, 100].map(pct => (
                    <div
                        key={pct}
                        className="absolute left-6 right-6 border-t border-white/5"
                        style={{ bottom: `${pct}%` }}
                    >
                        <span className="absolute -left-2 -translate-x-full text-[10px] text-muted font-mono">
                            ${(minPrice + (priceRange * pct / 100)).toFixed(0)}
                        </span>
                    </div>
                ))}
            </div>

            {/* Order Book Footer */}
            <div className="relative z-10 p-4 border-t border-white/5 bg-black/40 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    {/* Bids */}
                    <div>
                        <h4 className="text-green-400 mb-2 font-bold">BIDS</h4>
                        {bids.map((bid, i) => (
                            <motion.div
                                key={bid.price}
                                className="flex justify-between py-1 border-b border-white/5"
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <span className="text-green-400">${bid.price}</span>
                                <span className="text-secondary">{bid.size}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Asks */}
                    <div>
                        <h4 className="text-red-400 mb-2 font-bold">ASKS</h4>
                        {asks.map((ask, i) => (
                            <motion.div
                                key={ask.price}
                                className="flex justify-between py-1 border-b border-white/5"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <span className="text-red-400">${ask.price}</span>
                                <span className="text-secondary">{ask.size}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating Trade Indicators */}
            <motion.div
                className="absolute top-1/4 right-10 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/50"
                animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                BUY 2.5 BTC
            </motion.div>

            <motion.div
                className="absolute bottom-1/3 left-10 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/50"
                animate={{ y: [0, 10, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            >
                SELL 1.8 BTC
            </motion.div>
        </div>
    )
}
