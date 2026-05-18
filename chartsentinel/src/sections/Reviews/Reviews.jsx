import { motion } from 'framer-motion'
import TestimonialCarousel from '../../components/ui/TestimonialCarousel'

// Real Reviews section. Previously the navbar's "Review" link pointed at
// the Command Center block (which has id="reviews" for legacy reasons),
// so clicking Review dropped users onto a wall of stat tiles. This
// section claims the canonical id="reviews" so the nav link resolves to
// actual social proof.

export default function Reviews() {
    return (
        <section id="reviews" className="relative py-16 md:py-24 bg-background-dark overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[400px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="text-center mb-10 md:mb-14"
                >
                    <span className="font-display text-primary text-sm font-bold tracking-widest uppercase glow-magenta">
                        Trader feedback
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-text-primary mt-4">
                        What members say
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto mt-4">
                        Real notes from active traders running ChartSentinel as part of their workflow.
                    </p>
                </motion.div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur p-6 md:p-10">
                    <TestimonialCarousel />
                </div>
            </div>
        </section>
    )
}
