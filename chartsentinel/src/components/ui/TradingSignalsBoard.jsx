import { motion } from 'framer-motion'

const signals = [
    { asset: 'BTC', action: 'BUY', confidence: 92, entry: '42,150', target: '45,000', timeframe: '4H' },
    { asset: 'ETH', action: 'SELL', confidence: 78, entry: '2,890', target: '2,750', timeframe: '1D' },
    { asset: 'SOL', action: 'BUY', confidence: 85, entry: '98.50', target: '105.00', timeframe: '1H' },
    { asset: 'GOLD', action: 'BUY', confidence: 88, entry: '2,045', target: '2,100', timeframe: '1W' },
]

export default function TradingSignalsBoard() {
    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 h-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Active Signals</h3>
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold border border-primary/50">
                    LIVE
                </span>
            </div>

            <div className="space-y-4">
                {signals.map((signal, i) => (
                    <motion.div
                        key={signal.asset}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.15 }}
                        className="relative group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />

                        <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-primary/50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xl font-bold text-white font-mono">{signal.asset}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${signal.action === 'BUY' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
                                            }`}>
                                            {signal.action}
                                        </span>
                                    </div>
                                    <div className="text-xs text-secondary">Timeframe: {signal.timeframe}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-secondary mb-1">Confidence</div>
                                    <div className="text-2xl font-bold text-primary font-mono">{signal.confidence}%</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                                <div>
                                    <div className="text-[10px] text-secondary uppercase mb-1">Entry</div>
                                    <div className="text-sm font-mono text-white font-bold">${signal.entry}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-secondary uppercase mb-1">Target</div>
                                    <div className="text-sm font-mono text-green-400 font-bold">${signal.target}</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
