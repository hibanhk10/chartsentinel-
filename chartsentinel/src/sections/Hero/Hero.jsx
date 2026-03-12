import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { GridPattern } from '../../components/ui/Patterns'
import LiveTicker from '../../components/ui/LiveTicker'
import RealtimeBinanceChart from '../../components/ui/RealtimeBinanceChart'
/* eslint-disable no-unused-vars */
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Hero() {
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()
    const titleRef = useRef()
    const subtitleRef = useRef()

    useEffect(() => {
        const tl = gsap.timeline()
        tl.fromTo(titleRef.current, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.5, ease: "power3.out", delay: 0.5 })
        tl.fromTo(subtitleRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.5, ease: "power3.out" }, "-=1.0")
    }, [])

    return (
        <header className="relative pt-32 pb-20 overflow-hidden min-h-screen flex flex-col items-center justify-center">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-background-dark/90 z-10" /> {/* Values fade */}
                <GridPattern
                    className="absolute inset-0 z-0 opacity-20 text-primary"
                    yOffset={-10}
                    squares={[
                        [4, 4], [5, 1], [8, 2], [6, 6], [12, 12], [20, 5]
                    ]}
                />
                {/* Radial gradient burst removed */}
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 text-center w-full">
                <div
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm shadow-[0_0_15px_rgba(217,70,239,0.3)]">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">System Online</span>
                </div>

                <h1 ref={titleRef} className="text-5xl md:text-8xl font-display font-bold mb-8 leading-[1.1] tracking-tighter text-white drop-shadow-2xl">
                    TRADING WITH<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-primary to-fuchsia-400">INFO YOU NEED</span>
                </h1>

                <p ref={subtitleRef} className="text-lg md:text-xl text-secondary max-w-2xl mx-auto mb-12 font-light">
                    Elevate your trading with a terminal-grade interface. Real-time insights, AI prediction models, and institutional data access.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
                    <button
                        onClick={() => {
                            if (isAuthenticated) {
                                navigate('/dashboard');
                            } else {
                                navigate('/?login=true');
                            }
                        }}
                        className="w-full sm:w-auto px-10 py-4 bg-primary text-white font-semibold rounded-full glow-button hover:scale-105 transition-transform active:scale-95"
                    >
                        Launch Terminal
                    </button>
                    <button 
                        onClick={() => window.open('https://chartsentinel-preregister.vercel.app/', '_blank')}
                        className="w-full sm:w-auto px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-full border border-white/10 transition-all backdrop-blur-sm flex items-center gap-2"
                    >
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Pre-register Now
                    </button>
                </div>

                {/* Dashboard Mockup - Floating "Glass" Interface */}
                <motion.div
                    initial={{ opacity: 0, y: 100, rotateX: 20 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ duration: 1.2, delay: 0.5 }}
                    className="relative mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-2 shadow-2xl"
                >
                    {/* Header of fake browser/app */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/5 rounded-t-xl">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/50" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                        </div>
                        <div className="ml-4 h-6 w-96 rounded-full bg-white/5 text-[10px] flex items-center px-3 text-secondary font-mono">
                            chartsentinel.io/terminal/v2
                        </div>
                    </div>

                    {/* Grid Layout of Widgets */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                        {/* Main Chart */}
                        <RealtimeBinanceChart symbol="BTCUSDT" height={280} />

                        {/* Side Widgets */}
                        <div className="space-y-4">
                            <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                                <h4 className="text-xs text-secondary mb-2 uppercase tracking-wide">Market Sentiment</h4>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-bold text-green-400">Bullish</span>
                                    <span className="text-xs text-secondary">76%</span>
                                </div>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-green-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: '76%' }}
                                        transition={{ duration: 1.5, delay: 1 }}
                                    />
                                </div>
                            </div>

                            <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex-grow">
                                <h4 className="text-xs text-secondary mb-2 uppercase tracking-wide">Top Gainers</h4>
                                <div className="space-y-3">
                                    {[{ s: 'SOL', p: '+12%' }, { s: 'AVAX', p: '+8.5%' }, { s: 'LINK', p: '+5.2%' }].map(coin => (
                                        <div key={coin.s} className="flex justify-between items-center text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0">
                                            <span className="font-bold">{coin.s}</span>
                                            <span className="text-green-400 font-mono">{coin.p}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="absolute bottom-0 w-full z-20">
                <LiveTicker />
            </div>
        </header>
    )
}
