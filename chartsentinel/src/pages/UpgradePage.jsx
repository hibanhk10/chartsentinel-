import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import SEO from '../components/ui/SEO'
import { useAuth } from '../contexts/AuthContext'
import { getUserPlan, planLabel, planAtLeast, PLAN_ORDER } from '../lib/plan'

// Existing-user upgrade flow. Sending an authed user through the 4-step
// signup funnel just to swap tiers was unhinged. This page treats the
// upgrade as a moment: shows the diff between current and target tier,
// celebrates the activation, and drops the user back where they came
// from with the new powers active. Stripe is intentionally deferred,
// so "activation" is currently a local plan flip — when Stripe lands,
// the click can be repointed at a Checkout session and the rest of the
// page stays the same.

const PLAN_DETAILS = {
    free: {
        id: 'free',
        name: 'Free',
        price: '$0',
        cadence: 'forever',
        gradient: 'from-slate-700 to-slate-900',
        accent: 'border-white/10',
        diff: [
            'General weekly market report',
            'Discord community access',
            'Watchlist (5 tickers)',
        ],
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: '$59',
        cadence: '/month',
        gradient: 'from-primary/30 via-primary/10 to-fuchsia-500/20',
        accent: 'border-primary/40',
        diff: [
            '2x weekly deep-dive reports',
            'Live breakdowns of major moves',
            'Q&A access with our analyst',
            'Exclusive Discord channels',
            'Watchlist expanded to 25 tickers',
            'Custom signal alerts (email + Telegram)',
            'Webhook delivery for power users',
        ],
    },
    ultimate: {
        id: 'ultimate',
        name: 'Ultimate',
        price: '$109',
        cadence: '/month',
        gradient: 'from-cyan-500/25 via-primary/15 to-amber-400/20',
        accent: 'border-cyan-400/40',
        diff: [
            'Daily macro & flow explanation',
            'Live breakdowns the moment they happen',
            'Direct analyst Q&A',
            'Priority support',
            'Unlimited watchlist',
            'Custom signal weights',
            'Smart Money, Anomalies, Risk Posture, Macro Themes',
            'Scenarios, Interrogation, War Rooms, Coaching',
            'Early access to new tools',
        ],
    },
}

// Decorative confetti — six absolute pieces with staggered drops.
function Confetti() {
    const pieces = ['#d946ef', '#22c55e', '#06b6d4', '#fbbf24', '#ef4444', '#a78bfa']
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {pieces.map((color, i) => (
                <motion.div
                    key={i}
                    initial={{ y: -40, x: 50 + i * 60, rotate: 0, opacity: 0 }}
                    animate={{ y: 600, x: 50 + i * 60 + (i % 2 ? 40 : -40), rotate: 360, opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2.4, delay: i * 0.08, ease: 'easeOut' }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-4 rounded-sm"
                    style={{ backgroundColor: color }}
                />
            ))}
        </div>
    )
}

// Glassy tier badge with a soft gradient surface — used both for the
// before/after pair and the celebration screen.
function TierBadge({ plan, size = 'md' }) {
    const detail = PLAN_DETAILS[plan]
    const heightClass = size === 'lg' ? 'p-8' : 'p-5'
    return (
        <div
            className={`relative rounded-2xl border ${detail.accent} bg-gradient-to-br ${detail.gradient} backdrop-blur ${heightClass} text-center overflow-hidden`}
        >
            <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-1">
                {detail.name}
            </div>
            <div className={`font-bold text-white ${size === 'lg' ? 'text-4xl' : 'text-2xl'}`}>
                {detail.price}
                <span className="text-xs text-white/60 font-normal ml-1">{detail.cadence}</span>
            </div>
        </div>
    )
}

export default function UpgradePage() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const { user, isAuthenticated, updatePlan } = useAuth()

    const currentPlan = getUserPlan(user)
    const targetParam = params.get('to')
    // Pick a sensible default target: whatever was requested, else the
    // next tier up, else Pro.
    const initialTarget = useMemo(() => {
        if (targetParam && PLAN_DETAILS[targetParam]) return targetParam
        if (currentPlan === 'free') return 'pro'
        if (currentPlan === 'pro') return 'ultimate'
        return 'pro'
    }, [targetParam, currentPlan])

    const [target, setTarget] = useState(initialTarget)
    const [phase, setPhase] = useState('preview') // preview | activating | done
    const [error, setError] = useState(null)

    // Anonymous visitors don't have a tier to upgrade from — bounce them
    // into the funnel where pricing is part of registration.
    useEffect(() => {
        if (!isAuthenticated) navigate('/funnel', { replace: true })
    }, [isAuthenticated, navigate])

    const detail = PLAN_DETAILS[target]
    const alreadyOnTier = planAtLeast(currentPlan, target) && currentPlan === target

    const handleActivate = async () => {
        if (alreadyOnTier) {
            navigate('/dashboard')
            return
        }
        setPhase('activating')
        setError(null)
        try {
            // Theatrical pause overlapping the network call so the
            // activation feels weighty without adding latency.
            const [next] = await Promise.all([
                updatePlan(target),
                new Promise((r) => setTimeout(r, 900)),
            ])
            if (!next) throw new Error('No response from the server.')
            setPhase('done')
            // Auto-return to dashboard after the celebration finishes.
            setTimeout(() => navigate('/dashboard'), 2400)
        } catch (err) {
            setPhase('preview')
            setError(err.message || 'Something went wrong updating your plan. Try again.')
        }
    }

    if (!isAuthenticated) return null

    return (
        <div className="relative z-10 min-h-screen bg-background-dark text-text-primary pt-32 pb-20 px-6">
            <SEO title="Upgrade" path="/upgrade" noindex />

            <div className="max-w-3xl mx-auto">
                <AnimatePresence mode="wait">
                    {phase === 'preview' && (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.3 }}
                        >
                            <header className="text-center mb-10">
                                <span className="font-display text-primary text-sm font-bold tracking-widest uppercase glow-magenta">
                                    Level up
                                </span>
                                <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-white mt-3">
                                    {alreadyOnTier
                                        ? `You're already on ${detail.name}`
                                        : `Move to ${detail.name}`}
                                </h1>
                                <p className="text-text-secondary max-w-xl mx-auto mt-4">
                                    {alreadyOnTier
                                        ? 'Nothing to upgrade here — you have full access.'
                                        : "Here's exactly what changes the moment you confirm."}
                                </p>
                            </header>

                            {/* before / arrow / after */}
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-10">
                                <TierBadge plan={currentPlan} />
                                <motion.span
                                    animate={{ x: [0, 6, 0] }}
                                    transition={{ duration: 1.4, repeat: Infinity }}
                                    className="material-icons text-primary text-3xl"
                                >
                                    arrow_forward
                                </motion.span>
                                <TierBadge plan={target} size="lg" />
                            </div>

                            {/* tier picker — let users hop targets without
                                going back to /pricing first. */}
                            <div className="flex justify-center gap-2 mb-10">
                                {PLAN_ORDER.filter((p) => p !== 'free' && p !== currentPlan).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setTarget(p)}
                                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${
                                            target === p
                                                ? 'bg-primary text-white border-primary'
                                                : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10'
                                        }`}
                                    >
                                        Try {planLabel(p)}
                                    </button>
                                ))}
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur p-6 md:p-8 mb-8">
                                <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-4">
                                    What unlocks
                                </div>
                                <ul className="space-y-3">
                                    {detail.diff.map((feature) => (
                                        <motion.li
                                            key={feature}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="flex items-start gap-3 text-sm text-white"
                                        >
                                            <span className="material-icons text-primary text-base mt-0.5">
                                                check_circle
                                            </span>
                                            <span>{feature}</span>
                                        </motion.li>
                                    ))}
                                </ul>
                            </div>

                            <p className="text-center text-xs text-text-muted mb-6">
                                Cancel any time from Settings. We don't sell your data, run your trades, or
                                hold your funds.
                            </p>

                            {error && (
                                <p className="text-center text-sm text-red-300 mb-4">{error}</p>
                            )}

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button
                                    onClick={handleActivate}
                                    className="w-full sm:w-auto px-10 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/30 hover:bg-primary-dark transition-colors"
                                >
                                    {alreadyOnTier ? 'Back to dashboard' : `Activate ${detail.name}`}
                                </button>
                                <button
                                    onClick={() => navigate(-1)}
                                    className="text-sm text-text-muted hover:text-white transition-colors"
                                >
                                    Maybe later
                                </button>
                            </div>

                            <div className="mt-10 text-center">
                                <Link to="/#pricing" className="text-xs text-text-muted hover:text-white">
                                    Compare every plan side-by-side
                                </Link>
                            </div>
                        </motion.div>
                    )}

                    {phase === 'activating' && (
                        <motion.div
                            key="activating"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-24"
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                                className="w-16 h-16 mx-auto rounded-full border-4 border-white/10 border-t-primary mb-6"
                            />
                            <p className="text-lg text-white font-medium">
                                Provisioning {detail.name}…
                            </p>
                            <p className="text-sm text-text-muted mt-2">
                                Wiring your account, expanding your watchlist, opening locked tools.
                            </p>
                        </motion.div>
                    )}

                    {phase === 'done' && (
                        <motion.div
                            key="done"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, type: 'spring' }}
                            className="relative text-center py-20"
                        >
                            <Confetti />
                            <motion.div
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ duration: 0.5, type: 'spring', stiffness: 220 }}
                                className="w-24 h-24 mx-auto rounded-full bg-primary/20 border-4 border-primary flex items-center justify-center mb-6"
                            >
                                <span className="material-icons text-primary text-5xl">check</span>
                            </motion.div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                                You're on {detail.name}.
                            </h2>
                            <p className="text-text-secondary max-w-md mx-auto mb-6">
                                Locked tools just unlocked. Heading you back to the dashboard…
                            </p>
                            <Link
                                to="/dashboard"
                                className="inline-block px-8 py-3 rounded-full bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
                            >
                                Go now →
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
