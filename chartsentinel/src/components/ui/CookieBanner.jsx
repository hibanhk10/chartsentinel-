import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// Minimal consent banner. Stores the choice in localStorage so we
// don't pester returning visitors. Two paths: accept (analytics
// stays on) or decline (we toggle the PostHog opt-out flag). The
// banner skips itself entirely when no analytics provider is wired
// up — there's nothing to consent to in that case.

const STORAGE_KEY = 'chartsentinel.cookieConsent'

function readChoice() {
    try {
        return localStorage.getItem(STORAGE_KEY)
    } catch {
        return null
    }
}

function writeChoice(value) {
    try {
        localStorage.setItem(STORAGE_KEY, value)
    } catch {
        /* private mode */
    }
}

// Best-effort PostHog opt-out. The analytics module already guards on
// the enabled flag; we touch its globals directly so the consent
// banner is fully self-contained.
function setPostHogOptOut(optOut) {
    try {
        if (typeof window !== 'undefined' && window.posthog) {
            if (optOut) window.posthog.opt_out_capturing()
            else window.posthog.opt_in_capturing()
        }
    } catch {
        /* ignore */
    }
}

export default function CookieBanner() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const existing = readChoice()
        if (!existing) {
            setVisible(true)
        } else if (existing === 'declined') {
            setPostHogOptOut(true)
        }
    }, [])

    const accept = () => {
        writeChoice('accepted')
        setPostHogOptOut(false)
        setVisible(false)
    }
    const decline = () => {
        writeChoice('declined')
        setPostHogOptOut(true)
        setVisible(false)
    }

    if (!visible) return null

    return (
        <div className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-4 md:max-w-md z-[55] rounded-2xl border border-white/10 bg-surface-dark backdrop-blur-md shadow-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-1">
                Cookies & analytics
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
                We use a small set of cookies for session auth (required) and product analytics
                (optional). Decline and we&apos;ll switch analytics off for this device. See our{' '}
                <Link to="/privacy" className="text-primary hover:underline">privacy policy</Link>.
            </p>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={accept}
                    className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary-dark transition-colors"
                >
                    Accept all
                </button>
                <button
                    onClick={decline}
                    className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-text-secondary text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
                >
                    Decline analytics
                </button>
            </div>
        </div>
    )
}
