import { motion } from 'framer-motion'

const newsItems = [
    {
        id: 1,
        title: 'Fed Maintains Rates, Signals Potential Cuts Later This Year',
        category: 'ECONOMY',
        impact: 'HIGH',
        time: '10m ago',
        summary: 'The Federal Reserve kept interest rates steady but opened the door for potential easing...'
    },
    {
        id: 2,
        title: 'Bitcoin Reaches New All-Time High Amid Institutional Inflows',
        category: 'CRYPTO',
        impact: 'CRITICAL',
        time: '25m ago',
        summary: 'Spot ETF approval continues to drive massive capital into the primary cryptocurrency...'
    },
    {
        id: 3,
        title: 'Nvidia GPU Demand Surges as AI Revolution Accelerates',
        category: 'TECH',
        impact: 'HIGH',
        time: '1h ago',
        summary: 'Cloud providers increase capital expenditure for specialized hardware to power large language models...'
    },
    {
        id: 4,
        title: 'Global Markets React to Shifting Energy Policy Trends',
        category: 'COMMODITIES',
        impact: 'MEDIUM',
        time: '2h ago',
        summary: 'OPEC+ decisions on production limits influence Brent Crude prices across international exchanges...'
    },
]

export default function TradingSignalsBoard() {
    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 h-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Market Intelligence</h3>
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold border border-primary/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    LIVE UPDATES
                </span>
            </div>

            <div className="space-y-4">
                {newsItems.map((news, i) => (
                    <motion.div
                        key={news.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="relative group cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />

                        <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-primary/50 transition-all duration-300">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300 border border-white/5 uppercase tracking-wide">
                                        {news.category}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium">{news.time}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${news.impact === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                        news.impact === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    }`}>
                                    {news.impact} IMPACT
                                </span>
                            </div>

                            <h4 className="text-sm font-bold text-white mb-2 line-clamp-2 leading-relaxed group-hover:text-primary transition-colors">
                                {news.title}
                            </h4>
                            <p className="text-xs text-slate-400 line-clamp-1 italic">
                                {news.summary}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <button className="w-full mt-6 py-3 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest">
                View Full Feed
            </button>
        </div>
    )
}
