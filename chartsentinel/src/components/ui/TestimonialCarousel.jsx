import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const testimonials = [
    {
        name: "Michael Chen",
        role: "Day Trader",
        avatar: "MC",
        content: "ChartSentinel's real-time analysis helped me increase my win rate by 40%. The sentiment tracking is incredibly accurate.",
        rating: 5
    },
    {
        name: "Sarah Williams",
        role: "Crypto Investor",
        avatar: "SW",
        content: "Best trading info service I've used. The reports are clear, actionable, and arrive exactly when I need them.",
        rating: 5
    },
    {
        name: "David Kumar",
        role: "Forex Trader",
        avatar: "DK",
        content: "The Q&A sessions with analysts are worth the subscription alone. Highly professional team.",
        rating: 5
    }
]

export default function TestimonialCarousel() {
    const [current, setCurrent] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % testimonials.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="relative h-64 w-full">
            <AnimatePresence mode="wait">
                <motion.div
                    key={current}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center px-8"
                >
                    <div className="flex gap-1 mb-4">
                        {[...Array(testimonials[current].rating)].map((_, i) => (
                            <span key={i} className="material-icons text-yellow-500 text-sm">star</span>
                        ))}
                    </div>

                    <p className="text-lg text-slate-300 mb-6 max-w-2xl italic">
                        "{testimonials[current].content}"
                    </p>

                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary border border-primary/50">
                            {testimonials[current].avatar}
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-white">{testimonials[current].name}</div>
                            <div className="text-sm text-secondary">{testimonials[current].role}</div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {testimonials.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-primary w-8' : 'bg-slate-600'
                            }`}
                    />
                ))}
            </div>
        </div>
    )
}
