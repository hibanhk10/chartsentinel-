import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_CONFIG } from '../../config/api'

// Cmd-K / `/` global search. Opens a modal with a ranked list of
// matching tickers from the signals universe; selecting one navigates
// to /t/:ticker. Loads the universe once on first mount via /api/
// signals/tickers, then filters client-side. No backend search needed
// — the universe is ~90 entries.

const STORAGE_KEY = 'chartsentinel.recentTickers'
const MAX_RECENTS = 5
const QUICK_LINKS = [
    { label: 'Insider Radar', to: '/insider' },
    { label: 'Compare tickers', to: '/compare' },
    { label: 'What we caught', to: '/caught' },
    { label: 'Pricing', to: '/#pricing' },
    { label: 'Services', to: '/services' },
]

function loadRecents() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function pushRecent(ticker) {
    try {
        const prev = loadRecents()
        const next = [ticker, ...prev.filter((t) => t !== ticker)].slice(0, MAX_RECENTS)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
        /* private mode */
    }
}

export default function GlobalSearch({ open, onClose }) {
    const navigate = useNavigate()
    const inputRef = useRef(null)
    const [query, setQuery] = useState('')
    const [universe, setUniverse] = useState([])
    const [recents, setRecents] = useState(loadRecents)
    const [highlightIdx, setHighlightIdx] = useState(0)

    // Load ticker universe once.
    useEffect(() => {
        let active = true
        fetch(`${API_CONFIG.baseURL}/signals/tickers`, { headers: API_CONFIG.headers })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!active || !data?.all) return
                setUniverse(data.all)
            })
            .catch(() => {})
        return () => {
            active = false
        }
    }, [])

    // Focus the input + reset query whenever the modal opens.
    useEffect(() => {
        if (!open) return
        setQuery('')
        setRecents(loadRecents())
        setHighlightIdx(0)
        const t = setTimeout(() => inputRef.current?.focus(), 50)
        return () => clearTimeout(t)
    }, [open])

    // ESC closes.
    useEffect(() => {
        if (!open) return
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])

    const results = useMemo(() => {
        if (!query.trim()) return []
        const q = query.trim().toUpperCase()
        // Exact starts-with first, then contains. Caps at 8 so the list
        // stays scannable.
        const starts = universe.filter((t) => t.toUpperCase().startsWith(q))
        const contains = universe.filter(
            (t) => !t.toUpperCase().startsWith(q) && t.toUpperCase().includes(q),
        )
        return [...starts, ...contains].slice(0, 8)
    }, [query, universe])

    const handleSelect = (ticker) => {
        pushRecent(ticker)
        onClose?.()
        navigate(`/t/${ticker}`)
    }

    const handleKey = (e) => {
        if (results.length === 0) return
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightIdx((i) => (i + 1) % results.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightIdx((i) => (i - 1 + results.length) % results.length)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            handleSelect(results[highlightIdx])
        }
    }

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xl rounded-2xl border border-white/10 bg-surface-dark shadow-2xl overflow-hidden"
            >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                    <span className="material-icons text-text-muted text-lg">search</span>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setHighlightIdx(0)
                        }}
                        onKeyDown={handleKey}
                        placeholder="Search tickers — AAPL, BTC-USD, EURUSD=X…"
                        className="flex-1 bg-transparent outline-none text-white placeholder:text-text-muted text-sm"
                    />
                    <kbd className="text-[10px] text-text-muted bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                        ESC
                    </kbd>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                    {/* Live results */}
                    {results.length > 0 && (
                        <div className="px-2 py-2">
                            <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold px-3 py-1">
                                Tickers
                            </div>
                            {results.map((t, i) => (
                                <button
                                    key={t}
                                    onClick={() => handleSelect(t)}
                                    onMouseEnter={() => setHighlightIdx(i)}
                                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                                        highlightIdx === i ? 'bg-white/10' : 'hover:bg-white/5'
                                    }`}
                                >
                                    <span className="text-white font-mono">{t}</span>
                                    <span className="text-[10px] uppercase tracking-widest text-text-muted">
                                        Open →
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Recents — shown when there's no query */}
                    {!query && recents.length > 0 && (
                        <div className="px-2 py-2">
                            <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold px-3 py-1">
                                Recent
                            </div>
                            {recents.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => handleSelect(t)}
                                    className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 hover:bg-white/5"
                                >
                                    <span className="text-white font-mono">{t}</span>
                                    <span className="material-icons text-text-muted text-sm">history</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Quick links — pinned at the bottom so the modal
                        feels useful even before the user has typed. */}
                    <div className="px-2 py-2 border-t border-white/5">
                        <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold px-3 py-1">
                            Jump to
                        </div>
                        {QUICK_LINKS.map((l) => (
                            <Link
                                key={l.to}
                                to={l.to}
                                onClick={onClose}
                                className="block px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-white/5 hover:text-white"
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="px-4 py-2 border-t border-white/5 text-[10px] text-text-muted flex items-center justify-between">
                    <span>↑↓ navigate · ↵ select</span>
                    <span>{universe.length} tickers indexed</span>
                </div>
            </div>
        </div>
    )
}
