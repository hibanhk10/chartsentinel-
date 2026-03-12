import { motion } from 'framer-motion'
import { useLivePrices } from '../../hooks/useLivePrices'

export default function LiveTicker() {
    const lp = useLivePrices()

    const fmt = (val, dec = 2) =>
        val !== null ? val.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '...'

    const pct = (val) =>
        val !== undefined ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}%` : '...'

    const items = [
        { symbol: 'BTC', price: fmt(lp.BTC.price), change: pct(lp.BTC.changePercent), pos: lp.BTC.isPositive },
        { symbol: 'ETH', price: fmt(lp.ETH.price), change: pct(lp.ETH.changePercent), pos: lp.ETH.isPositive },
        { symbol: 'SOL', price: fmt(lp.SOL.price), change: pct(lp.SOL.changePercent), pos: lp.SOL.isPositive },
        { symbol: 'EUR/USD', price: lp.EURUSD.price ? lp.EURUSD.price.toFixed(4) : '...', change: '', pos: lp.EURUSD.isPositive },
        { symbol: 'GBP/USD', price: lp.GBPUSD.price ? lp.GBPUSD.price.toFixed(4) : '...', change: '', pos: lp.GBPUSD.isPositive },
    ]

    const repeated = [...items, ...items, ...items, ...items]

    return (
        <div className="w-full overflow-hidden bg-white/5 border-y border-white/5 backdrop-blur-sm py-2">
            <motion.div
                className="flex items-center gap-12 whitespace-nowrap"
                animate={{ x: ['0%', '-50%'] }}
                transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
            >
                {repeated.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm font-mono">
                        <span className="font-bold text-slate-300">{item.symbol}</span>
                        <span className="text-white">{item.price}</span>
                        {item.change && (
                            <span className={item.pos ? 'text-green-400' : 'text-red-400'}>
                                {item.change}
                            </span>
                        )}
                    </div>
                ))}
            </motion.div>
        </div>
    )
}
