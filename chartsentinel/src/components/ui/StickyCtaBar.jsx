import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

// Mobile-only persistent CTA bar. Long marketing pages often hide the
// signup CTA after the visitor scrolls past the hero; this brings it
// back into thumb-reach without the visual cost on desktop.
//
// Hidden when:
//   - viewport is ≥ md (CSS handles this — `md:hidden`)
//   - the user is already authenticated (no point pitching a signup)
//   - the route is utility/conversion-flow, not marketing
//
// Shown after the user scrolls past ~40% of the first viewport so we
// don't compete with the hero CTAs for attention.

const HIDDEN_ROUTES = new Set([
    '/dashboard',
    '/onboarding',
    '/funnel',
    '/forgot-password',
    '/reset-password',
    '/contact',
    '/insider',
    '/services',
    '/terms',
    '/privacy',
    '/risk',
    '/status',
    '/trust',
    '/waitlist',
])

export default function StickyCtaBar() {
    const { isAuthenticated } = useAuth()
    const { pathname } = useLocation()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const onScroll = () => {
            // Show after the user has scrolled ~40vh from the top.
            setVisible(window.scrollY > window.innerHeight * 0.4)
        }
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    if (isAuthenticated) return null
    if (HIDDEN_ROUTES.has(pathname)) return null
    if (pathname.startsWith('/t/')) return null
    if (!visible) return null

    return (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background-dark/95 backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center gap-3 shadow-2xl">
            <Link
                to="/funnel"
                className="flex-1 text-center px-4 py-3 rounded-full bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25"
            >
                Get started
            </Link>
            <Link
                to="/#pricing"
                className="px-4 py-3 rounded-full bg-white/5 border border-white/10 text-white font-medium text-sm whitespace-nowrap"
            >
                Pricing
            </Link>
        </div>
    )
}
