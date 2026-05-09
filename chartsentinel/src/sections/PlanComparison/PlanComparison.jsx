import { Link } from 'react-router-dom'

// Sits directly under Pricing. The card view sells the upgrade with
// bullet lists; this table answers the "what's the actual diff" question
// for visitors who stall between Pro and Ultimate.
//
// Source of truth for the matrix is here. If a feature changes, also
// update the bullet lists in src/components/funnel/Step3Pricing.jsx and
// src/sections/Pricing/Pricing.jsx so the three views agree.

const ROWS = [
    { label: 'Weekly market report', free: true, pro: true, ultimate: true },
    { label: 'Discord community access', free: true, pro: 'Exclusive channels', ultimate: 'Exclusive channels' },
    { label: 'Watchlist size', free: '5 tickers', pro: '25 tickers', ultimate: 'Unlimited' },
    { label: 'Bi-weekly deep-dive reports', free: false, pro: true, ultimate: true },
    { label: 'Live breakdowns of major moves', free: false, pro: 'On publish', ultimate: 'Real-time' },
    { label: 'Q&A access with analyst', free: false, pro: 'Bi-weekly', ultimate: 'Direct' },
    { label: 'Custom signal alerts (email + Telegram)', free: false, pro: true, ultimate: true },
    { label: 'Daily macro & flow explanation', free: false, pro: false, ultimate: true },
    { label: 'Custom signal weights', free: false, pro: false, ultimate: true },
    { label: 'Priority support', free: false, pro: false, ultimate: true },
    { label: 'Early access to new tools', free: false, pro: false, ultimate: true },
]

function Cell({ value }) {
    if (value === true) {
        return <span className="material-icons text-primary text-xl">check</span>
    }
    if (value === false) {
        return <span className="material-icons text-white/15 text-xl">remove</span>
    }
    return <span className="text-sm text-white">{value}</span>
}

export default function PlanComparison() {
    return (
        <section className="py-12 md:py-20 bg-background-dark relative">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-10">
                    <span className="font-display text-primary text-sm font-bold tracking-widest uppercase glow-magenta">
                        Compare plans
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white mt-3">
                        What you actually get
                    </h2>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur">
                    <table className="w-full text-sm min-w-[640px]">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-5 px-6 font-medium text-text-muted text-xs uppercase tracking-widest">
                                    Feature
                                </th>
                                <th className="py-5 px-4 text-center">
                                    <div className="text-text-muted text-xs uppercase tracking-widest">Free</div>
                                    <div className="text-white text-2xl font-bold mt-1">$0</div>
                                </th>
                                <th className="py-5 px-4 text-center bg-primary/5 border-x border-primary/20">
                                    <div className="text-primary text-xs uppercase tracking-widest font-bold">Pro</div>
                                    <div className="text-white text-2xl font-bold mt-1">$59</div>
                                </th>
                                <th className="py-5 px-4 text-center">
                                    <div className="text-text-muted text-xs uppercase tracking-widest">Ultimate</div>
                                    <div className="text-white text-2xl font-bold mt-1">$109</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {ROWS.map((r) => (
                                <tr key={r.label} className="border-b border-white/5 last:border-b-0">
                                    <td className="py-3 px-6 text-text-secondary">{r.label}</td>
                                    <td className="py-3 px-4 text-center">
                                        <Cell value={r.free} />
                                    </td>
                                    <td className="py-3 px-4 text-center bg-primary/5 border-x border-primary/20">
                                        <Cell value={r.pro} />
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <Cell value={r.ultimate} />
                                    </td>
                                </tr>
                            ))}
                            <tr>
                                <td className="py-5 px-6"></td>
                                <td className="py-5 px-4 text-center">
                                    <Link
                                        to="/funnel"
                                        className="inline-block px-5 py-2 rounded-full bg-white/10 border border-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
                                    >
                                        Start free
                                    </Link>
                                </td>
                                <td className="py-5 px-4 text-center bg-primary/5 border-x border-primary/20">
                                    <Link
                                        to="/funnel"
                                        className="inline-block px-5 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors"
                                    >
                                        Choose Pro
                                    </Link>
                                </td>
                                <td className="py-5 px-4 text-center">
                                    <Link
                                        to="/funnel"
                                        className="inline-block px-5 py-2 rounded-full bg-white/10 border border-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
                                    >
                                        Choose Ultimate
                                    </Link>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    )
}
