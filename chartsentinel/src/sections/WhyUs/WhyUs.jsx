import { motion } from 'framer-motion'
import { GridPattern } from '../../components/ui/Patterns'
import LiveMarketFeed from '../../components/ui/LiveMarketFeed'
import TradingSignalsBoard from '../../components/ui/TradingSignalsBoard'
import TrendChart from '../../components/ui/TrendChart'

// WhyUs Component
export default function WhyUs() {
    return (
        <section id="reviews" className="relative py-16 md:py-24 bg-gradient-to-b from-background-dark via-slate-950 to-background-dark overflow-hidden">
            {/* Background Effects — the blur halo needs max-w so it doesn't
                push a horizontal scrollbar on narrow phones. */}
            <GridPattern className="absolute inset-0 text-primary opacity-5" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[400px] bg-primary/10 rounded-full blur-[150px]" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12 md:mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">Terminal Access</span>
                    </div>
                    <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-primary to-white">
                        COMMAND CENTER
                    </h2>
                    <p className="text-xl text-secondary max-w-3xl mx-auto">
                        Real-time market intelligence at your fingertips. Professional-grade tools for serious traders.
                    </p>
                </motion.div>

                {/* Main Terminal Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    {/* Left Panel - Market Feed */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-1"
                    >
                        <LiveMarketFeed />
                    </motion.div>

                    {/* Center Panel - Signals */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-1"
                    >
                        <TradingSignalsBoard />
                    </motion.div>

                    {/* Right Panel - Performance Dashboard */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-1 space-y-6"
                    >
                        {/* Performance Card */}
                        <div className="bg-gradient-to-br from-green-900/20 to-green-950/20 border border-green-500/30 rounded-2xl p-6 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-green-400 uppercase">Portfolio Growth</h3>
                                <span className="material-icons text-green-400 text-xl">trending_up</span>
                            </div>
                            <div className="text-5xl font-bold text-white mb-2 font-mono">+156%</div>
                            <p className="text-sm text-secondary mb-4">Average annual return</p>
                            <TrendChart height={80} color="#22c55e" />
                        </div>

                        {/* Win Rate Card */}
                        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white uppercase">Success Metrics</h3>
                                <span className="material-icons text-primary text-xl">verified</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-3xl font-bold text-white font-mono mb-1">73%</div>
                                    <div className="text-xs text-secondary">Win Rate</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-white font-mono mb-1">4.2</div>
                                    <div className="text-xs text-secondary">Risk/Reward</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-white font-mono mb-1">850+</div>
                                    <div className="text-xs text-secondary">Signals</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-white font-mono mb-1">24/7</div>
                                    <div className="text-xs text-secondary">Coverage</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Bottom CTA Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="relative group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-cyan-500/20 to-primary/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 md:p-12 text-center">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">Ready to Trade Like a Pro?</h3>
                        <p className="text-secondary mb-8 max-w-2xl mx-auto">
                            Join 1,000+ traders who trust ChartSentinel for institutional-grade market analysis and real-time signals.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button className="px-10 py-4 bg-primary text-white font-bold rounded-full hover:scale-105 transition-transform glow-button text-lg">
                                Start Free Trial
                            </button>
                            <button className="px-10 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-full hover:bg-white/10 transition-colors text-lg">
                                View Pricing
                            </button>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-white/10">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white mb-1">1,000+</div>
                                <div className="text-xs text-secondary">Active Traders</div>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white mb-1">98%</div>
                                <div className="text-xs text-secondary">Satisfaction</div>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white mb-1">24/7</div>
                                <div className="text-xs text-secondary">Support</div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
