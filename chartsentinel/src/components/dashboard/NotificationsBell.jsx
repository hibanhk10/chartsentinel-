import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'

// In-app notifications bell. Polls /watchlist/alerts every 60s,
// shows an unread badge, opens a dropdown listing the last ~40
// watchlist threshold crossings. Marks-read in bulk when opened so
// the badge clears immediately.

function timeAgo(ts) {
    if (!ts) return ''
    const seconds = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 1000))
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}

export default function NotificationsBell() {
    const [open, setOpen] = useState(false)
    const [events, setEvents] = useState([])
    const [unread, setUnread] = useState(0)
    const [error, setError] = useState(null)
    const wrapperRef = useRef(null)

    const refresh = async () => {
        try {
            const { events: list, unread: count } = await api.get('/watchlist/alerts')
            setEvents(list || [])
            setUnread(count || 0)
            setError(null)
        } catch (err) {
            setError(err.message)
        }
    }

    useEffect(() => {
        refresh()
        const id = setInterval(refresh, 60_000)
        return () => clearInterval(id)
    }, [])

    // Close the dropdown on outside click + esc.
    useEffect(() => {
        if (!open) return
        const onDoc = (e) => {
            if (!wrapperRef.current?.contains(e.target)) setOpen(false)
        }
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onDoc)
        window.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDoc)
            window.removeEventListener('keydown', onKey)
        }
    }, [open])

    const handleOpen = async () => {
        const willOpen = !open
        setOpen(willOpen)
        // Marking-read on open is the right UX — the badge clears the
        // moment the user sees the list. We optimistically zero locally
        // so the badge disappears even before the round-trip.
        if (willOpen && unread > 0) {
            setUnread(0)
            try {
                await api.post('/watchlist/alerts/mark-read', {})
            } catch {
                /* keep local zero; refresh will reconcile on the next tick */
            }
        }
    }

    return (
        <div ref={wrapperRef} className="relative">
            <button
                onClick={handleOpen}
                aria-label="Notifications"
                className="relative w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center"
            >
                <span className="material-icons text-base text-white">notifications</span>
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1 ring-2 ring-background-dark">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-surface-dark shadow-2xl z-40"
                    >
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                            <span className="text-sm font-bold text-white">Notifications</span>
                            <Link
                                to="/dashboard?tab=watchlist"
                                onClick={() => setOpen(false)}
                                className="text-[10px] uppercase tracking-widest text-primary hover:text-white"
                            >
                                Watchlist →
                            </Link>
                        </div>

                        {error && (
                            <div className="px-4 py-3 text-xs text-red-300">{error}</div>
                        )}

                        {!error && events.length === 0 && (
                            <div className="px-4 py-8 text-center text-text-muted text-sm">
                                No alerts yet. Set thresholds on the watchlist tab and we&apos;ll
                                notify you here as soon as a score crosses.
                            </div>
                        )}

                        {events.length > 0 && (
                            <ul className="divide-y divide-white/5">
                                {events.map((e) => {
                                    const isAbove = e.direction === 'above'
                                    return (
                                        <li key={e.id}>
                                            <Link
                                                to={`/t/${e.ticker}`}
                                                onClick={() => setOpen(false)}
                                                className="block px-4 py-3 hover:bg-white/[0.03]"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0 flex items-baseline gap-2">
                                                        <span
                                                            className={`text-base ${isAbove ? 'text-emerald-300' : 'text-red-300'}`}
                                                        >
                                                            {isAbove ? '▲' : '▼'}
                                                        </span>
                                                        <span className="text-white font-bold">{e.ticker}</span>
                                                        <span
                                                            className={`text-sm font-mono tabular-nums ${isAbove ? 'text-emerald-300' : 'text-red-300'}`}
                                                        >
                                                            {e.score >= 0 ? '+' : ''}
                                                            {Math.round(e.score)}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-text-muted shrink-0">
                                                        {timeAgo(e.triggeredAt)}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-text-muted mt-1">
                                                    Crossed{' '}
                                                    {isAbove ? 'above' : 'below'}{' '}
                                                    {e.threshold >= 0 ? '+' : ''}
                                                    {e.threshold}
                                                    {!e.readAt && (
                                                        <span className="ml-2 text-primary font-bold">• unread</span>
                                                    )}
                                                </div>
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
