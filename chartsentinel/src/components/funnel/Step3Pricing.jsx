// Three-tier picker. Mirrors the homepage Pricing section so the sales
// funnel doesn't quietly hide the Free option (which it did before — the
// $0 plan was missing here, so users who clicked "Sign up" on Free were
// forced into Pro/Ultimate).

const PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: '$0',
        cadence: 'forever',
        tagline: 'Try the platform with no commitment.',
        features: [
            'General weekly market report',
            'Discord community access',
            'Public dashboard read-only access',
            'Watchlist (up to 5 tickers)',
            'Global Intelligence Globe (view-only)',
        ],
        cta: 'Start Free',
        accent: false,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: '$59',
        cadence: '/month',
        tagline: 'For active traders who want full signals.',
        features: [
            'Everything in Free',
            '2x weekly deep-dive reports',
            'Live breakdowns of major moves',
            'Q&A access with our analyst',
            'Exclusive Discord channels',
            'Watchlist (up to 25 tickers)',
            'Custom signal alerts (email + Telegram)',
            'Globe drill-down: tickers + source on every hotspot',
        ],
        cta: 'Choose Pro',
        accent: true,
        badge: 'Most Popular',
    },
    {
        id: 'ultimate',
        name: 'Ultimate',
        price: '$109',
        cadence: '/month',
        tagline: 'For serious operators who need an edge.',
        features: [
            'Everything in Pro',
            'Daily macro & flow explanation',
            'Live breakdowns the moment they happen',
            'Direct analyst Q&A',
            'Priority support',
            'Unlimited watchlist',
            'Custom signal weights',
            'Globe auto-pan camera + premium rendering',
            'Early access to new tools',
        ],
        cta: 'Choose Ultimate',
        accent: false,
    },
];

const Step3Pricing = ({ onNext, onPrev }) => {
    return (
        <div className="max-w-6xl mx-auto text-center pt-8">
            <header className="mb-12">
                <span className="font-display text-primary text-sm font-bold tracking-widest uppercase glow-magenta">Step-3</span>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-white">
                    Our <span className="text-primary glow-magenta">Plans.</span>
                </h1>
                <p className="text-text-secondary max-w-xl mx-auto text-sm md:text-base leading-relaxed">
                    Pick the tier that matches your trading. You can upgrade or downgrade any time.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-12 max-w-6xl mx-auto items-stretch">
                {PLANS.map((p) => {
                    const isAccent = p.accent;
                    return (
                        <div
                            key={p.id}
                            className={`relative rounded-3xl p-8 flex flex-col text-left transition-all duration-300 ${
                                isAccent
                                    ? 'bg-white/5 border-2 border-primary shadow-2xl shadow-primary/20 md:scale-105 z-10 hover:scale-[1.07]'
                                    : 'bg-surface-dark/50 backdrop-blur-xl border border-white/10 hover:scale-[1.02]'
                            }`}
                        >
                            {p.badge && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                                    {p.badge}
                                </div>
                            )}
                            <div className="mb-6">
                                <h3 className={`text-lg font-medium mb-2 ${isAccent ? 'text-white opacity-80' : 'text-text-muted'}`}>
                                    {p.name}
                                </h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-extrabold font-display text-white">{p.price}</span>
                                    <span className="text-sm text-text-muted">{p.cadence}</span>
                                </div>
                                <p className="text-text-secondary text-xs mt-3">{p.tagline}</p>
                            </div>
                            <ul className="space-y-3 mb-8 flex-grow">
                                {p.features.map((f) => (
                                    <li key={f} className="flex items-start gap-3 text-sm text-white">
                                        <span className="material-icons text-primary text-base mt-0.5">check</span>
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => onNext({ plan: p.id })}
                                className={`w-full py-4 px-6 rounded-2xl font-bold transition-transform active:scale-95 ${
                                    isAccent
                                        ? 'bg-white text-black shadow-xl hover:bg-gray-100'
                                        : 'bg-white/10 text-white border border-white/5 hover:bg-white/20'
                                }`}
                            >
                                {p.cta}
                            </button>
                        </div>
                    );
                })}
            </div>

            {onPrev && (
                <button
                    onClick={onPrev}
                    className="mt-10 text-sm text-text-muted hover:text-white transition-colors"
                >
                    ← Back
                </button>
            )}
        </div>
    );
};

export default Step3Pricing;
