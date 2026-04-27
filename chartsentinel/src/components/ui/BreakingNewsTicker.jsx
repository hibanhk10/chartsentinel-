import { useEffect, useRef, useState } from 'react';
import { API_CONFIG } from '../../config/api';

// Public RSS sources via rss2json — no API keys needed. Each source
// times out independently so a slow feed doesn't block the rest.
const NEWS_SOURCES = [
    {
        url:
            'https://api.rss2json.com/v1/api.json?rss_url=' +
            encodeURIComponent('https://feeds.bbci.co.uk/news/business/rss.xml'),
        name: 'BBC Business',
    },
    {
        url:
            'https://api.rss2json.com/v1/api.json?rss_url=' +
            encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/'),
        name: 'CoinDesk',
    },
    {
        url:
            'https://api.rss2json.com/v1/api.json?rss_url=' +
            encodeURIComponent('https://www.reddit.com/r/CryptoCurrency/hot.rss'),
        name: 'r/Crypto',
    },
    {
        url:
            'https://api.rss2json.com/v1/api.json?rss_url=' +
            encodeURIComponent('https://feeds.reuters.com/reuters/businessNews'),
        name: 'Reuters',
    },
];

// Inline SVG so we don't pull lucide-react into the main app for one icon.
function RadioIcon({ className = '' }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="2" />
            <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
        </svg>
    );
}

export default function BreakingNewsTicker() {
    const [headlines, setHeadlines] = useState([]);
    const tickerRef = useRef(null);
    const animRef = useRef(null);
    const speedRef = useRef(0.5);

    useEffect(() => {
        let cancelled = false;

        const fetchHeadlines = async () => {
            const all = [];
            const results = await Promise.allSettled(
                NEWS_SOURCES.map(async (source) => {
                    try {
                        const ctrl = new AbortController();
                        const timer = setTimeout(() => ctrl.abort(), 6000);
                        const res = await fetch(source.url, { signal: ctrl.signal });
                        clearTimeout(timer);
                        const data = await res.json();
                        if (data.items && data.items.length > 0) {
                            return data.items.slice(0, 5).map((item) => ({
                                title: (item.title || '').replace(/<[^>]*>/g, '').trim(),
                                source: source.name,
                            }));
                        }
                        return [];
                    } catch {
                        return [];
                    }
                })
            );

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value.length > 0) {
                    all.push(...result.value);
                }
            }

            // Mix sources so the ticker doesn't run all-BBC then all-CoinDesk
            const shuffled = all.sort(() => Math.random() - 0.5);

            // AI-alert prefix on the lead headline. Backend caches per-headline
            // for an hour and falls back to a static "Moderate" string when
            // GEMINI_API_KEY is unset, so this never blocks ticker startup.
            if (shuffled.length > 0) {
                try {
                    const ctrl = new AbortController();
                    const t = setTimeout(() => ctrl.abort(), 5000);
                    const aiRes = await fetch(`${API_CONFIG.baseURL}/ai/alert`, {
                        method: 'POST',
                        headers: API_CONFIG.headers,
                        body: JSON.stringify({ headline: shuffled[0].title }),
                        signal: ctrl.signal,
                    });
                    clearTimeout(t);
                    if (aiRes.ok) {
                        const aiData = await aiRes.json();
                        if (aiData?.analysis) {
                            shuffled[0] = {
                                title: `[AI ALERT: ${aiData.analysis}] ${shuffled[0].title}`,
                                source: 'GENESIS AI',
                            };
                        }
                    }
                } catch {
                    // Don't degrade the ticker if AI is unreachable.
                }
            }

            if (!cancelled && shuffled.length > 0) {
                setHeadlines(shuffled);
            }
        };

        fetchHeadlines();
        const interval = setInterval(fetchHeadlines, 5 * 60 * 1000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        const ticker = tickerRef.current;
        if (!ticker || headlines.length === 0) return;

        let x = 0;
        const animate = () => {
            x -= speedRef.current;
            // The duplicated headlines list creates a seamless loop — when
            // we've translated the entire first half off-screen, snap back
            // to 0 and the second half is already in position.
            const fullWidth = ticker.scrollWidth / 2;
            if (Math.abs(x) >= fullWidth) x = 0;
            ticker.style.transform = `translateX(${x}px)`;
            animRef.current = requestAnimationFrame(animate);
        };

        animRef.current = requestAnimationFrame(animate);
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [headlines]);

    const allHeadlines = [...headlines, ...headlines]; // duplicate for seamless loop

    return (
        <div className="w-full flex items-center gap-0 bg-primary/[0.08] border-y border-primary/20 overflow-hidden h-10 shrink-0">
            <div className="shrink-0 flex items-center gap-2 px-4 h-full bg-gradient-to-r from-primary to-primary-dark text-white text-[10px] font-black tracking-widest uppercase">
                <RadioIcon className="w-3 h-3 animate-pulse" />
                BREAKING
            </div>

            <div className="flex-1 overflow-hidden relative h-full flex items-center">
                {headlines.length > 0 ? (
                    <div ref={tickerRef} className="flex gap-0 whitespace-nowrap will-change-transform">
                        {allHeadlines.map((h, i) => (
                            <span key={`${h.source}-${i}`} className="inline-flex items-center gap-3 px-6 text-xs">
                                <span className="text-primary/60 text-[9px] font-bold tracking-widest uppercase shrink-0">
                                    {h.source}
                                </span>
                                <span className="text-text-secondary">{h.title}</span>
                                <span className="text-primary/30 mx-2">◆</span>
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="text-text-muted text-[10px] tracking-widest uppercase px-6">
                        Connecting to live feeds...
                    </span>
                )}
            </div>
        </div>
    );
}
