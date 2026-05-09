import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// First-run guided tour. Stored "seen" state in localStorage so the
// tour only appears for new users and stays gone after dismissal. The
// "Show again" toggle in Settings can clear the flag if we ever wire
// that — for now, dismissing is permanent.
//
// The tour is content-only (no DOM-anchored arrows pointing at sidebar
// items). DOM-anchored tours fight responsive breakpoints, drawer
// states, and lazy-loaded panels; a centered modal that walks through
// the *concepts* gets new users productive without any of that pain.

const STORAGE_KEY = 'chartsentinel.tour.v1'

const STEPS = [
    {
        icon: 'insights',
        title: 'Welcome to ChartSentinel',
        body:
            "Quick tour — under a minute. We'll show you the four things that drive the platform so you can get to work.",
    },
    {
        icon: 'speed',
        title: 'The composite score',
        body:
            "Every ticker gets a score from −100 to +100, blended from seasonality, COT positioning, chart patterns, and a base score. Above +25 is buy territory; above +60 is strong.",
    },
    {
        icon: 'notifications_active',
        title: 'Build your watchlist',
        body:
            "Add tickers and set thresholds. We'll email and (Pro+) Telegram you the moment a score crosses your line — usually within 30 minutes of the market moving.",
    },
    {
        icon: 'gavel',
        title: 'Insider Radar',
        body:
            "Live SEC Form 4 filings + Congressional disclosures. The Cluster Buys tab flags tickers where 3+ insiders bought within 14 days — the documented alpha signal.",
    },
    {
        icon: 'monitor_heart',
        title: 'You are set.',
        body:
            "Hit Signals to see the screener, Terminal for live charts, or Watchlist to start tracking. Settings → Display has a density toggle if you want denser tables.",
    },
]

function hasSeen() {
    try {
        return !!localStorage.getItem(STORAGE_KEY)
    } catch {
        return true
    }
}

function markSeen() {
    try {
        localStorage.setItem(STORAGE_KEY, '1')
    } catch {
        /* private mode — fine, tour just shows next time */
    }
}

export default function DashboardTour() {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState(0)

    useEffect(() => {
        if (!hasSeen()) setOpen(true)
    }, [])

    const close = () => {
        markSeen()
        setOpen(false)
    }

    const next = () => {
        if (step < STEPS.length - 1) setStep(step + 1)
        else close()
    }

    const back = () => {
        if (step > 0) setStep(step - 1)
    }

    const current = STEPS[step]
    const isLast = step === STEPS.length - 1

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={close}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 16 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 16 }}
                        transition={{ duration: 0.25 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-surface-dark p-7 md:p-8 shadow-2xl"
                    >
                        <button
                            onClick={close}
                            aria-label="Skip tour"
                            className="absolute top-4 right-4 w-8 h-8 rounded-md text-text-secondary hover:bg-white/5 hover:text-white flex items-center justify-center"
                        >
                            <span className="material-icons text-base">close</span>
                        </button>

                        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                            <span className="material-icons text-primary text-3xl">{current.icon}</span>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-3">{current.title}</h2>
                        <p className="text-sm text-text-secondary leading-relaxed">{current.body}</p>

                        <div className="flex items-center justify-between mt-7">
                            <div className="flex items-center gap-1.5">
                                {STEPS.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all ${
                                            i === step ? 'w-6 bg-primary' : 'w-1.5 bg-white/15'
                                        }`}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                {step > 0 && (
                                    <button
                                        onClick={back}
                                        className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-text-secondary hover:bg-white/5"
                                    >
                                        Back
                                    </button>
                                )}
                                <button
                                    onClick={next}
                                    className="px-5 py-2 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary-dark transition-colors"
                                >
                                    {isLast ? "Let's go" : 'Next'}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={close}
                            className="mt-4 text-[11px] text-text-muted hover:text-white block mx-auto"
                        >
                            Skip the tour
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
