import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../../config/api';

// ⌘K / Ctrl+K command palette. Three categories of entries:
//
//   1. Static actions  — "Sign out", "Toggle theme", "Open Settings"
//   2. Dashboard tabs  — every entry from the sidebar, jumps to ?tab=…
//   3. Tickers         — fetched from /signals/tickers, jumps to the
//                        Signals tab pre-filtered by ticker (or, future,
//                        a public /t/:ticker page)
//
// Filtering uses a simple subsequence match over a normalised lowercase
// representation. We don't pull a fuzzy-search dep for this — the
// command set is small (<150 items) and a custom matcher means the
// scoring rules are tweakable to favour exact-prefix / acronym hits.

// Ranks "abc" higher when it matches the start of words. Cheap and
// good enough for the palette's volume.
function score(needle, hay) {
    if (!needle) return 1;
    const n = needle.toLowerCase();
    const h = hay.toLowerCase();
    if (h === n) return 1000;
    if (h.startsWith(n)) return 800;
    if (h.includes(` ${n}`) || h.includes(`-${n}`) || h.includes(`/${n}`)) return 600;

    // Subsequence: characters of needle appear in order in hay
    let hi = 0;
    for (let i = 0; i < n.length; i++) {
        const idx = h.indexOf(n[i], hi);
        if (idx === -1) return 0;
        hi = idx + 1;
    }
    return 400 - n.length; // longer matches score slightly lower
}

const TAB_ENTRIES = [
    { tab: 'home', label: 'Home', hint: 'Today dashboard' },
    { tab: 'signals', label: 'Signals', hint: 'Composite screener' },
    { tab: 'terminal', label: 'Terminal', hint: 'Live BTC/ETH/SOL' },
    { tab: 'mood', label: 'Mood', hint: 'Fear & greed' },
    { tab: 'interrogation', label: 'Genesis', hint: 'AI chat' },
    { tab: 'watchlist', label: 'Watchlist', hint: 'Threshold alerts' },
    { tab: 'backtester', label: 'Backtester', hint: 'Strategy replay' },
    { tab: 'seasonality-calendar', label: 'Seasonality', hint: '12-month heatmap' },
    { tab: 'portfolio', label: 'Portfolio', hint: 'Weighted basket scoring' },
    { tab: 'reports', label: 'Reports', hint: 'Long-form research' },
    { tab: 'news', label: 'News', hint: 'Curated headlines' },
    { tab: 'referrals', label: 'Referrals', hint: 'Invite friends' },
    { tab: 'networking', label: 'Network', hint: 'Community map' },
    { tab: 'settings', label: 'Settings', hint: '2FA, Telegram, weights' },
];

const CommandPalette = ({ open, onClose, setActiveTab }) => {
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const [query, setQuery] = useState('');
    const [activeIdx, setActiveIdx] = useState(0);
    const [tickers, setTickers] = useState([]);

    // Lazy-fetch ticker list — only when the palette is first opened.
    useEffect(() => {
        if (!open || tickers.length > 0) return;
        fetch(`${API_CONFIG.baseURL}/signals/tickers`, { headers: API_CONFIG.headers })
            .then((r) => r.json())
            .then((d) => setTickers(Array.isArray(d.all) ? d.all : []))
            .catch(() => {});
    }, [open, tickers.length]);

    // Reset query + selection on open. Focus the input so typing works
    // immediately.
    useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIdx(0);
            // microtask delay so the input is mounted before .focus()
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [open]);

    // Build + score the candidate list. Memoise so a re-render from a
    // selection move doesn't re-rank everything.
    const items = useMemo(() => {
        const tabRows = TAB_ENTRIES.map((t) => ({
            kind: 'tab',
            id: `tab:${t.tab}`,
            label: t.label,
            hint: t.hint,
            tab: t.tab,
            score: score(query, `${t.label} ${t.hint} ${t.tab}`),
        }));
        const tickerRows = tickers.map((t) => ({
            kind: 'ticker',
            id: `ticker:${t}`,
            label: t,
            hint: 'Open Signals filtered',
            ticker: t,
            score: score(query, t),
        }));
        const all = [...tabRows, ...tickerRows];
        if (!query.trim()) {
            // Empty query: show tabs first, then top 8 tickers, alphabetical-ish.
            return [...tabRows, ...tickerRows.slice(0, 8)];
        }
        return all
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 50);
    }, [query, tickers]);

    // Keep activeIdx in bounds when the list shrinks.
    useEffect(() => {
        if (activeIdx >= items.length) setActiveIdx(0);
    }, [items.length, activeIdx]);

    // Scroll the active row into view on keyboard navigation.
    useEffect(() => {
        const list = listRef.current;
        const node = list?.querySelector(`[data-idx="${activeIdx}"]`);
        node?.scrollIntoView({ block: 'nearest' });
    }, [activeIdx]);

    const choose = (item) => {
        if (!item) return;
        if (item.kind === 'tab') {
            setActiveTab?.(item.tab);
            navigate(`/dashboard?tab=${item.tab}`);
        } else if (item.kind === 'ticker') {
            // For now, jump to Signals — future: dedicated /t/:ticker.
            setActiveTab?.('signals');
            navigate(`/dashboard?tab=signals#${item.ticker}`);
        }
        onClose?.();
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx((i) => Math.min(items.length - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx((i) => Math.max(0, i - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(items[activeIdx]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose?.();
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4"
            onClick={onClose}
        >
            <div
                className="bg-surface-dark border border-white/10 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                    <span className="material-icons text-text-muted text-lg">search</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setActiveIdx(0);
                        }}
                        onKeyDown={onKeyDown}
                        placeholder="Jump to a tab or ticker…"
                        className="flex-1 bg-transparent text-white placeholder-text-muted outline-none text-sm"
                    />
                    <kbd className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 bg-white/5 rounded border border-white/10">
                        ESC
                    </kbd>
                </div>

                <ul ref={listRef} className="max-h-80 overflow-y-auto py-1">
                    {items.length === 0 && (
                        <li className="px-4 py-6 text-center text-sm text-text-muted">
                            No matches.
                        </li>
                    )}
                    {items.map((item, idx) => (
                        <li
                            key={item.id}
                            data-idx={idx}
                            onMouseEnter={() => setActiveIdx(idx)}
                            onClick={() => choose(item)}
                            className={`flex items-center gap-3 px-4 py-2 cursor-pointer text-sm ${
                                idx === activeIdx ? 'bg-primary/15 text-white' : 'text-text-secondary'
                            }`}
                        >
                            <span
                                className={`material-icons text-base ${
                                    idx === activeIdx ? 'text-primary' : 'text-text-muted'
                                }`}
                            >
                                {item.kind === 'tab' ? 'tab' : 'show_chart'}
                            </span>
                            <span className="flex-1 truncate">
                                <span className={item.kind === 'ticker' ? 'font-mono' : ''}>{item.label}</span>
                                <span className="text-xs text-text-muted ml-2">{item.hint}</span>
                            </span>
                            {idx === activeIdx && (
                                <kbd className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 bg-white/5 rounded border border-white/10">
                                    ↵
                                </kbd>
                            )}
                        </li>
                    ))}
                </ul>

                <div className="border-t border-white/5 px-4 py-2 text-[10px] text-text-muted flex items-center gap-4">
                    <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                    <span><kbd className="font-mono">↵</kbd> open</span>
                    <span><kbd className="font-mono">esc</kbd> close</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
