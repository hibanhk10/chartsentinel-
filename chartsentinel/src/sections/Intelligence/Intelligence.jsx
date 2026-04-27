import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ThreatMatrix from '../../components/ui/ThreatMatrix';

// Marketing-side teaser of the geopolitical-risk layer the platform
// surfaces inside the dashboard. Visitor sees a curated, animated
// preview; logged-in users see the live feed wired to the backend.
// (The latter ships as the dashboard's interrogation tab in a later
// port — for now the public version is enough to communicate the
// product's intelligence depth.)
export default function Intelligence() {
    const navigate = useNavigate();
    return (
        <section className="py-16 md:py-24 bg-background-dark">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.8 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center"
                >
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] uppercase font-bold tracking-widest text-red-400">
                                Live Intelligence Layer
                            </span>
                        </div>
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight text-text-primary leading-[1.05]">
                            Geopolitical risk,
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-fuchsia-400">
                                priced in.
                            </span>
                        </h2>
                        <p className="text-text-secondary max-w-md leading-relaxed">
                            Markets don't trade in a vacuum. Every position you take is exposed to
                            shifts in conflict intensity, capital controls, energy supply, and trade
                            policy. Our threat matrix surfaces the regional risk surface continuously
                            so you stop importing surprises into your book.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <button
                                type="button"
                                onClick={() => navigate('/waitlist')}
                                className="px-6 py-3 bg-primary text-white font-semibold rounded-full glow-button hover:scale-105 transition-transform active:scale-95"
                            >
                                Get Live Access
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard?tab=signals')}
                                className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-sm font-semibold hover:bg-white/10 transition-all backdrop-blur-sm text-text-primary"
                            >
                                Explore Signals
                            </button>
                        </div>
                    </div>

                    <div className="h-[500px] md:h-[560px] lg:h-[600px] rounded-3xl overflow-hidden shadow-2xl shadow-red-500/10">
                        <ThreatMatrix />
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
