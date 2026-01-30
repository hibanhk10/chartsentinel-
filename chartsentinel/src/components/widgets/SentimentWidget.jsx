/* eslint-disable no-unused-vars */
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function SentimentWidget() {
    const [score, setScore] = useState(72)

    useEffect(() => {
        const interval = setInterval(() => {
            setScore(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.5) * 10)))
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="bg-black/80 border border-white/10 rounded-xl p-4 w-full h-full flex flex-col justify-between">
            <h3 className="text-secondary text-sm font-semibold mb-2">AI Sentiment</h3>

            <div className="relative h-32 w-full flex items-center justify-center">
                {/* Gauge Background */}
                <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
                    <motion.path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke="#d946ef"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray="126" // approx length of arc
                        strokeDashoffset={126 - (126 * (score / 100))}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                </svg>
                <div className="absolute bottom-0 text-center">
                    <div className="text-3xl font-bold text-white">{Math.round(score)}</div>
                    <div className="text-[10px] text-secondary uppercase tracking-widest">Greed</div>
                </div>
            </div>

            <div className="space-y-2 mt-2">
                <div className="flex justify-between text-xs">
                    <span className="text-secondary">Social Volume</span>
                    <span className="text-primary font-bold">High</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-3/4 animate-pulse"></div>
                </div>
            </div>
        </div>
    )
}
