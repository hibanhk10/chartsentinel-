import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

const generateMarketData = () => {
    const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AAPL', 'TSLA', 'GOLD', 'EUR/USD', 'GBP/USD']
    return symbols.map(symbol => ({
        symbol,
        price: (Math.random() * 1000 + 100).toFixed(2),
        change: ((Math.random() - 0.5) * 10).toFixed(2),
        volume: (Math.random() * 1000).toFixed(0) + 'M'
    }))
}

export default function LiveMarketFeed() {
    const [data, setData] = useState(() => generateMarketData())

    useEffect(() => {
        const interval = setInterval(() => {
            setData(generateMarketData())
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-full overflow-hidden">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Market Feed</h3>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {data.map((item, i) => (
                    <motion.div
                        key={item.symbol}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                    >
                        <div className="flex-1">
                            <div className="font-bold text-white text-sm font-mono">{item.symbol}</div>
                            <div className="text-xs text-secondary">Vol: {item.volume}</div>
                        </div>
                        <div className="text-right">
                            <div className="font-mono text-white font-bold">${item.price}</div>
                            <div className={`text-xs font-bold ${parseFloat(item.change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {parseFloat(item.change) >= 0 ? '+' : ''}{item.change}%
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
