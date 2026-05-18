import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'

// Plan definitions kept in sync with src/components/funnel/Step3Pricing.jsx.
// If you change one, change both — the homepage and the funnel must agree
// on what each tier includes.
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
        signupCta: 'Sign Up',
        currentCta: 'Current Plan',
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
        signupCta: 'Sign Up',
        currentCta: 'Upgrade to Pro',
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
        signupCta: 'Sign Up',
        currentCta: 'Upgrade to Ultimate',
        accent: false,
    },
];

export default function Pricing() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleSignUp = () => navigate('/funnel');

    return (
        <section id="pricing" className="py-16 md:py-24 bg-background-dark relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <h2 className="text-4xl sm:text-5xl font-display font-bold text-center mb-4 tracking-tight text-text-primary">
                    Pricing
                </h2>
                <p className="text-center text-text-secondary max-w-xl mx-auto mb-12 md:mb-16">
                    Pick the tier that matches your trading. Upgrade or downgrade any time.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
                    {PLANS.map((p) => {
                        const isAccent = p.accent;
                        return (
                            <div
                                key={p.id}
                                className={`relative rounded-3xl p-7 sm:p-8 flex flex-col h-full transition-all duration-300 ${
                                    isAccent
                                        ? 'bg-white/5 border-2 border-primary shadow-2xl shadow-primary/20 md:scale-105 z-10 hover:scale-[1.07]'
                                        : 'bg-surface-dark border border-white/10 shadow-2xl hover:-translate-y-2'
                                }`}
                            >
                                {p.badge && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                                        {p.badge}
                                    </div>
                                )}
                                <div className="mb-6">
                                    <span className={`text-sm font-medium ${isAccent ? 'text-text-primary opacity-80' : 'text-text-secondary'}`}>
                                        {p.name}
                                    </span>
                                    <div className="flex items-baseline gap-1 mt-2">
                                        <span className="text-5xl font-bold text-text-primary">{p.price}</span>
                                        <span className="text-sm text-text-muted">{p.cadence}</span>
                                    </div>
                                    <p className="text-text-secondary text-xs mt-3">{p.tagline}</p>
                                </div>

                                <ul className="space-y-3 mb-8 flex-grow">
                                    {p.features.map((f) => (
                                        <li key={f} className="flex items-start gap-3 text-sm text-text-primary">
                                            <span className="material-icons text-sm text-green-500 mt-0.5">check</span>
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={handleSignUp}
                                    className={`w-full py-4 rounded-2xl font-bold transition-colors ${
                                        isAccent
                                            ? 'bg-white text-black hover:bg-gray-100'
                                            : 'bg-white/5 border border-white/10 text-text-primary hover:bg-white/10'
                                    }`}
                                >
                                    {isAuthenticated ? p.currentCta : p.signupCta}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
