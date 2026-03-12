import { motion } from 'framer-motion'
import { useLivePrices } from '../../hooks/useLivePrices'

const fmt = (val, dec = 2) =>
    val !== null && val !== undefined
        ? val.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })
        : '...'

// Static rows for assets we don't have free live feeds for
const STATIC_ROWS = [
    { symbol: 'AAPL',    price: null, change: null, volume: '142M' },
    { symbol: 'TSLA',    price: null, change: null, volume: '89M'  },
    { symbol: 'GOLD',    price: null, change: null, volume: '54M'  },
    { symbol: 'GBP/USD', price: null, change: null, volume: '31M'  },
]

export default function LiveMarketFeed() {
    const lp = useLivePrices()

    const liveRows = [
        { symbol: 'BTC/USD', price: fmt(lp.BTC.price), change: lp.BTC.changePercent, isPos: lp.BTC.isPositive,   volume: '28B'  },
        { symbol: 'ETH/USD', price: fmt(lp.ETH.price), change: lp.ETH.changePercent, isPos: lp.ETH.isPositive,   volume: '12B'  },
        { symbol: 'SOL/USD', price: fmt(lp.SOL.price), change: lp.SOL.changePercent, isPos: lp.SOL.isPositive,   volume: '3.1B' },
        { symbol: 'EUR/USD', price: lp.EURUSD.price ? lp.EURUSD.price.toFixed(4) : '...', change: null, isPos: lp.EURUSD.isPositive, volume: '18B' },
    ]

    const allRows = [...liveRows, ...STATIC_ROWS]

    return (
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-full overflow-hidden">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Market Feed</h3>
                <span className="ml-auto text-[10px] text-secondary uppercase tracking-widest">Binance</span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {allRows.map((item, i) => (
                    <motion.div
                        key={item.symbol}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                    >
                        <div className="flex-1">
                            <div className="font-bold text-white text-sm font-mono">{item.symbol}</div>
                            <div className="text-xs text-secondary">Vol: {item.volume}</div>
                        </div>
                        <div className="text-right">
                            <div className="font-mono text-white font-bold">
                                {item.price ? (item.symbol.includes('/') && !item.symbol.includes('BTC') && !item.symbol.includes('ETH') && !item.symbol.includes('SOL') ? item.price : `$${item.price}`) : '—'}
                            </div>
                            {item.change !== null && item.change !== undefined ? (
                                <div className={`text-xs font-bold ${item.isPos ? 'text-green-400' : 'text-red-400'}`}>
                                    {item.isPos ? '+' : ''}{item.change.toFixed(2)}%
                                </div>
                            ) : (
                                <div className="text-xs text-secondary">—</div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
