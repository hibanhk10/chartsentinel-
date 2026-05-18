import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// FAQ — sits before Pricing on the homepage so visitors get common
// objections cleared before they see the price tags. Items are kept
// objection-shaped: "is this real / how is this different / what do I
// actually get / can I leave / is my data safe / am I getting screwed".

const ITEMS = [
    {
        q: 'Is this just another signal-spam service?',
        a: "No. ChartSentinel publishes one composite score per ticker, blended from four independent edges (seasonality, COT positioning, chart-pattern matches, base score). You see the components, you see the data sources, and you can backtest the same engine that drives the live signals. No hidden 'proprietary AI' that you're supposed to trust on faith.",
    },
    {
        q: "What's the difference between Pro and Ultimate?",
        a: "Pro covers active traders who want full signals + bi-weekly reports + analyst Q&A. Ultimate adds daily macro & flow explanations, instant live breakdowns, priority support, unlimited watchlist size, custom signal weights, and early access to new tools. If you trade more than a few times a week or run multi-asset, Ultimate pays for itself; otherwise Pro is plenty.",
    },
    {
        q: 'Where does the data come from?',
        a: 'Yahoo Finance for prices and history, Binance for live crypto, the CFTC weekly Commitment of Traders report, SEC EDGAR for Form 4 filings, House and Senate Stock Watcher for Congressional disclosures, and major RSS feeds (BBC Business, CNBC, Yahoo Finance, CoinDesk, Investing.com) for news. Every source is publicly documented; we never invent data.',
    },
    {
        q: 'Can I cancel any time?',
        a: 'Yes. Cancellation is one click in Settings — no support ticket, no friction. You keep access until the end of the billing period and your data stays in your account if you ever come back.',
    },
    {
        q: 'Do you trade my account or take custody of funds?',
        a: 'No. ChartSentinel never connects to a brokerage and never holds funds. We surface signals and analysis; you make the trade through your own broker. We are an information service, not a manager.',
    },
    {
        q: 'How do alerts get delivered?',
        a: 'Three channels: email (via Resend), Telegram (via our bot — you /start it once), and HMAC-signed webhooks for power users wiring into their own systems. Alerts only fire on threshold crossings, not while you stay above — no spam.',
    },
    {
        q: 'Is the Insider Radar real or scraped?',
        a: 'Real. The SEC Form 4 feed is parsed live from EDGAR with a proper User-Agent, throttled to satisfy their rate limit. Congressional trades come from House and Senate Stock Watcher datasets — actual disclosed PTR filings, not generated noise. When a source is quiet, the table is empty rather than padded with fake data.',
    },
    {
        q: 'Can I see what the platform looks like before paying?',
        a: 'Yes — the Free tier is exactly what it sounds like. You get the general weekly market report, Discord access, public dashboard read-only access, and a 5-ticker watchlist. No credit card up front. If it clicks, upgrade.',
    },
]

function FaqRow({ item, open, onToggle }) {
    return (
        <div className="border-b border-white/5">
            <button
                onClick={onToggle}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-6 py-5 text-left group"
            >
                <span className="text-base md:text-lg font-medium text-text-primary group-hover:text-primary transition-colors">
                    {item.q}
                </span>
                <span
                    className={`material-icons text-text-muted transition-transform ${
                        open ? 'rotate-45 text-primary' : ''
                    }`}
                >
                    add
                </span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <p className="pb-5 pr-10 text-sm text-text-secondary leading-relaxed">
                            {item.a}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function FAQ() {
    const [openIdx, setOpenIdx] = useState(0)

    return (
        <section id="faq" className="py-16 md:py-24 bg-background-dark relative">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-10 md:mb-14">
                    <span className="font-display text-primary text-sm font-bold tracking-widest uppercase glow-magenta">
                        Common questions
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-text-primary mt-4">
                        FAQ
                    </h2>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur px-6 md:px-10 py-2">
                    {ITEMS.map((item, i) => (
                        <FaqRow
                            key={item.q}
                            item={item}
                            open={openIdx === i}
                            onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}
