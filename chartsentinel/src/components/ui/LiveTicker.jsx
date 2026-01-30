import { motion } from 'framer-motion'

const TICKER_ITEMS = [
    { symbol: 'BTC', price: '42,150.20', change: '+2.4%' },
    { symbol: 'ETH', price: '2,890.15', change: '+1.8%' },
    { symbol: 'SOL', price: '98.45', change: '-0.5%' },
    { symbol: 'AAPL', price: '185.90', change: '+0.2%' },
    { symbol: 'NDX', price: '16,500.00', change: '+1.1%' },
    { symbol: 'EUR/USD', price: '1.0920', change: '-0.1%' },
    { symbol: 'GOLD', price: '2,045.50', change: '+0.4%' },
]

export default function LiveTicker() {
    return (
        <div className="w-full overflow-hidden bg-white/5 border-y border-white/5 backdrop-blur-sm py-2">
            <motion.div
                className="flex items-center gap-12 whitespace-nowrap"
                animate={{ x: [0, -1000] }}
                transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
            >
                {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => ( // Triple for seamless loop
                    <div key={i} className="flex items-center gap-3 text-sm font-mono">
                        <span className="font-bold text-slate-300">{item.symbol}</span>
                        <span className="text-white">{item.price}</span>
                        <span className={item.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}>
                            {item.change}
                        </span>
                    </div>
                ))}
            </motion.div>
        </div>
    )
}
