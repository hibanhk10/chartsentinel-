import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/ui/SEO';
import Footer from '../sections/Footer/Footer';

// Service catalog. Each entry is a tile rendered in a responsive grid;
// the order moves from "what visitors recognize" (signals, terminal,
// reports) toward the deeper / more recent surfaces (insider radar,
// networking, journal). Icons are Material Icons names so we don't pull
// in a dedicated icon dep.
const SERVICES = [
    {
        icon: 'insights',
        title: 'Composite Signals',
        tagline: 'A single score per ticker, blended from four independent edges.',
        bullets: [
            'Seasonality — historical month-by-month return profiles across 10+ years',
            'Commitment of Traders — positioning extremes from the CFTC weekly report',
            'Chart-pattern matches — current shape compared against a curated bank',
            'Base score — fundamentals + momentum baseline',
            '88-ticker universe across FX (27), crypto (18), and equities/ETFs (43)',
        ],
        cta: { label: 'Open the dashboard', to: '/dashboard' },
    },
    {
        icon: 'gavel',
        title: 'Insider Radar',
        tagline: 'Live SEC Form 4 + real Congressional disclosures.',
        bullets: [
            'EDGAR Atom feed parsed into structured trades (officer / director / 10% owner)',
            'Conviction Gauge — buy$ vs sell$ at a glance',
            'Cluster-buy detector (≥3 insiders, 14-day window) — the documented alpha signal',
            '30-day cluster history table for context',
            'House + Senate trades from real disclosure feeds — empty when sources are quiet, never fabricated',
        ],
        cta: { label: 'View Insider Radar', to: '/insider' },
    },
    {
        icon: 'monitor_heart',
        title: 'Live Terminal',
        tagline: 'A focused trading cockpit, no broker login required.',
        bullets: [
            '25 Binance spot pairs — majors, large-cap alts, and BTC-quoted crosses',
            '8 chart timeframes from 1m to 1W',
            'Live orderbook + recent trades streamed over WebSocket',
            'Lightweight charts library — fast on mobile, no jank',
        ],
        cta: { label: 'Open the terminal', to: '/dashboard' },
    },
    {
        icon: 'visibility',
        title: 'Watchlist & Alerts',
        tagline: 'Get pinged the moment your tickers cross a threshold.',
        bullets: [
            'Per-ticker score thresholds with directional crossing detection',
            'Email delivery (Resend), Telegram bot delivery, or HMAC-signed webhooks',
            'No spam — alerts fire only on threshold crossings, not while you stay above',
            'Per-ticker history accessible from the dashboard',
        ],
        cta: { label: 'Manage your watchlist', to: '/dashboard' },
    },
    {
        icon: 'article',
        title: 'Reports & Briefings',
        tagline: 'Twice-weekly long-form market reads written by an analyst.',
        bullets: [
            'Bi-weekly market reports — context, positioning, and trade ideas',
            'Live breakdowns when major moves print',
            'Q&A access on Pro and Ultimate plans',
            'Weekly digest email — opt-in, opt-out one click',
        ],
        cta: { label: 'See pricing', to: '/#pricing' },
    },
    {
        icon: 'newspaper',
        title: 'Live News Feed',
        tagline: 'Aggregated from real wires, not stock photos.',
        bullets: [
            'BBC Business, Yahoo Finance, CNBC, CoinDesk, Investing.com',
            'AI alert prefix on lead headlines (impact rating)',
            'Breaking-news ticker on the homepage and dashboard',
            'No paywalls, no re-published mockups',
        ],
        cta: { label: 'Read the latest', to: '/' },
    },
    {
        icon: 'auto_graph',
        title: 'Backtester',
        tagline: 'Test ideas against the same engine that powers live signals.',
        bullets: [
            'Replay any ticker through the composite scoring engine',
            'Walk-forward windows so the test is honest',
            'Per-component contribution breakdown',
            'Save and share strategy snapshots',
        ],
        cta: { label: 'Open backtester', to: '/dashboard' },
    },
    {
        icon: 'group',
        title: 'Networking & Strategy',
        tagline: 'A small, vetted community of operators.',
        bullets: [
            'Member map — opt-in only, city-centroid coordinates, no precise tracking',
            'Strategy sharing with role-based visibility',
            'Trade journal with optional AI critique',
            'Discord channels for Pro and Ultimate members',
        ],
        cta: { label: 'See the community', to: '/dashboard' },
    },
];

function ServiceCard({ icon, title, tagline, bullets, cta }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur p-7 flex flex-col"
        >
            <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-icons text-primary text-2xl">{icon}</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <p className="text-text-muted text-sm mt-1">{tagline}</p>
                </div>
            </div>

            <ul className="space-y-2 mb-6 flex-grow">
                {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-text-secondary">
                        <span className="material-icons text-primary text-sm mt-0.5">check</span>
                        <span>{b}</span>
                    </li>
                ))}
            </ul>

            {cta && (
                <Link
                    to={cta.to}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-white transition-colors group"
                >
                    {cta.label}
                    <span className="material-icons text-sm group-hover:translate-x-1 transition-transform">
                        arrow_forward
                    </span>
                </Link>
            )}
        </motion.div>
    );
}

export default function ServicesPage() {
    return (
        <div className="relative z-10 w-full bg-background-dark text-text-primary min-h-screen">
            <SEO
                title="Services"
                description="Every tool ChartSentinel ships — composite signals, insider radar, live terminal, watchlist alerts, reports, and the backtester."
                path="/services"
            />

            <div className="max-w-7xl mx-auto px-6 pt-32 pb-16">
                <motion.header
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-16 text-center"
                >
                    <span className="font-display text-primary text-sm font-bold tracking-widest uppercase glow-magenta">
                        What we ship
                    </span>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tighter text-white mt-4">
                        Services
                    </h1>
                    <p className="text-text-secondary max-w-2xl mx-auto text-base md:text-lg mt-5 leading-relaxed">
                        Eight focused tools, one dashboard. Each one solves a specific job —
                        not a vague "platform" that does everything badly.
                    </p>
                </motion.header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {SERVICES.map((s) => (
                        <ServiceCard key={s.title} {...s} />
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mt-20 rounded-3xl border border-primary/20 bg-primary/5 p-10 md:p-14 text-center"
                >
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                        Ready to use them?
                    </h2>
                    <p className="text-text-secondary max-w-xl mx-auto mb-6">
                        Free tier covers the basics. Pro and Ultimate unlock reports, live
                        breakdowns, analyst Q&amp;A, and custom alert delivery.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            to="/funnel"
                            className="px-8 py-4 rounded-2xl bg-primary text-white font-bold transition-all hover:bg-primary-dark shadow-lg shadow-primary/25"
                        >
                            Get started
                        </Link>
                        <Link
                            to="/#pricing"
                            className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold transition-all hover:bg-white/10"
                        >
                            See pricing
                        </Link>
                    </div>
                </motion.div>
            </div>

            <Footer />
        </div>
    );
}
