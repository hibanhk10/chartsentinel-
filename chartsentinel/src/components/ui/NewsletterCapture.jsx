import { useState } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'

// Email lead magnet rendered above the footer. Lower-friction than
// signup — the visitor commits a single field and gets the weekly
// digest, while we get a list to warm up cold traffic. Backed by
// /api/newsletter (existing schema + rate limit).

export default function NewsletterCapture() {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState('idle') // idle | sending | done | error
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email.trim()) return
        setStatus('sending')
        setError(null)
        try {
            await api.post('/newsletter', { email: email.trim() })
            setStatus('done')
        } catch (err) {
            setStatus('error')
            setError(err.message || 'Could not subscribe. Try again in a moment.')
        }
    }

    return (
        <section className="py-16 md:py-20 bg-background-dark relative overflow-hidden">
            {/* soft halo so the band reads as its own moment without
                looking like another card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-72 bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur p-8 md:p-12 text-center"
                >
                    <span className="font-display text-primary text-xs font-bold tracking-widest uppercase glow-magenta">
                        Free weekly digest
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mt-3">
                        Markets, condensed.
                    </h2>
                    <p className="text-text-secondary max-w-md mx-auto mt-3 text-sm md:text-base">
                        One email a week — the score-mover tickers, the alpha signals
                        that fired, and what to watch next. Free. Unsubscribe in one click.
                    </p>

                    {status === 'done' ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                        >
                            <span className="material-icons text-base">check_circle</span>
                            <span className="text-sm font-medium">
                                You&apos;re on the list. First digest hits Friday.
                            </span>
                        </motion.div>
                    ) : (
                        <form
                            onSubmit={handleSubmit}
                            className="mt-6 flex flex-col sm:flex-row items-stretch gap-3 max-w-md mx-auto"
                            noValidate
                        >
                            <input
                                type="email"
                                required
                                placeholder="you@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={status === 'sending'}
                                className="flex-1 px-4 py-3 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-text-muted text-sm focus:outline-none focus:border-primary/50 disabled:opacity-60"
                            />
                            <button
                                type="submit"
                                disabled={status === 'sending'}
                                className="px-6 py-3 rounded-full bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors disabled:opacity-60 whitespace-nowrap"
                            >
                                {status === 'sending' ? 'Subscribing…' : 'Get the digest'}
                            </button>
                        </form>
                    )}

                    {status === 'error' && (
                        <p className="mt-4 text-sm text-red-300">{error}</p>
                    )}

                    <p className="mt-5 text-[11px] text-text-muted">
                        No spam, no resold lists. We use your email to deliver the digest, nothing else.
                    </p>
                </motion.div>
            </div>
        </section>
    )
}
