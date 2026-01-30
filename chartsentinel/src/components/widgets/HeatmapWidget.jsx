/* eslint-disable no-unused-vars */
import { motion } from 'framer-motion'

export function HeatmapWidget() {
    const items = [
        { s: 'BTC', v: 4.2, c: 'bg-green-500' },
        { s: 'ETH', v: 3.1, c: 'bg-green-600' },
        { s: 'SOL', v: -1.2, c: 'bg-red-500' },
        { s: 'ADA', v: 0.5, c: 'bg-green-800' },
        { s: 'XRP', v: -2.4, c: 'bg-red-600' },
        { s: 'DOT', v: 1.8, c: 'bg-green-700' },
    ]

    return (
        <div className="bg-black/80 border border-white/10 rounded-xl p-4 w-full h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-secondary text-sm font-semibold">Heatmap</h3>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-grow">
                {items.map((item) => (
                    <motion.div
                        key={item.s}
                        whileHover={{ scale: 1.05 }}
                        className={`${item.c} rounded-lg p-2 flex flex-col justify-between relative overflow-hidden bg-opacity-80 hover:bg-opacity-100 transition-all cursor-pointer`}
                    >
                        <span className="text-xs font-bold text-white/90 z-10 relative">{item.s}</span>
                        <span className="text-lg font-bold text-white z-10 relative">{item.v > 0 ? '+' : ''}{item.v}%</span>

                        {/* Glossy overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
