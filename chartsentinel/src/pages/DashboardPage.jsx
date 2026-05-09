import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHome from '../components/dashboard/Home';
import SEO from '../components/ui/SEO';
import api from '../services/api';
import TickerMarquee from '../components/dashboard/TickerMarquee';
import BrandedLoader from '../components/ui/BrandedLoader';
import CommandPalette from '../components/dashboard/CommandPalette';
import ShortcutHelp from '../components/dashboard/ShortcutHelp';
import PlanGate from '../components/ui/PlanGate';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

// Home stays eagerly imported because it's the default landing tab —
// lazy-loading it would just cost a flash of the Suspense fallback on
// every dashboard entry. Every other tab is code-split so the initial
// dashboard bundle only ships what the user sees first.
const DashboardReports = lazy(() => import('../components/dashboard/Reports'));
const DashboardNews = lazy(() => import('../components/dashboard/News'));
const DashboardNetworking = lazy(() => import('../components/dashboard/Networking'));
const DashboardCoaching = lazy(() => import('../components/dashboard/Coaching'));
const DashboardAdmin = lazy(() => import('../components/dashboard/Admin'));
const DashboardSignals = lazy(() => import('../components/dashboard/Signals'));
const DashboardWatchlist = lazy(() => import('../components/dashboard/Watchlist'));
const DashboardReferrals = lazy(() => import('../components/dashboard/Referrals'));
const DashboardTerminal = lazy(() => import('../components/dashboard/Terminal'));
const DashboardMood = lazy(() => import('../components/dashboard/Mood'));
const DashboardInterrogation = lazy(() => import('../components/dashboard/Interrogation'));
const DashboardIntel = lazy(() => import('../components/dashboard/Intel'));
const DashboardCatalysts = lazy(() => import('../components/dashboard/Catalysts'));
const DashboardMacroThemes = lazy(() => import('../components/dashboard/MacroThemes'));
const DashboardScenarios = lazy(() => import('../components/dashboard/Scenarios'));
const DashboardSmartMoney = lazy(() => import('../components/dashboard/SmartMoney'));
const DashboardAnomalies = lazy(() => import('../components/dashboard/Anomalies'));
const DashboardAlertBuilder = lazy(() => import('../components/dashboard/AlertBuilder'));
const DashboardRiskPosture = lazy(() => import('../components/dashboard/RiskPosture'));
const DashboardJournal = lazy(() => import('../components/dashboard/Journal'));
const DashboardBriefing = lazy(() => import('../components/dashboard/Briefing'));
const DashboardIdeaCards = lazy(() => import('../components/dashboard/IdeaCards'));
const DashboardConviction = lazy(() => import('../components/dashboard/Conviction'));
const DashboardMentorMatch = lazy(() => import('../components/dashboard/MentorMatch'));
const DashboardWarRooms = lazy(() => import('../components/dashboard/WarRooms'));
const DashboardSettings = lazy(() => import('../components/dashboard/Settings'));
const DashboardBacktester = lazy(() => import('../components/dashboard/Backtester'));
const DashboardSeasonalityCalendar = lazy(() => import('../components/dashboard/SeasonalityCalendar'));
const DashboardPortfolio = lazy(() => import('../components/dashboard/Portfolio'));

const VALID_TABS = ['home', 'signals', 'terminal', 'mood', 'interrogation', 'intel', 'catalysts', 'macro-themes', 'scenarios', 'smart-money', 'anomalies', 'alert-builder', 'risk-posture', 'journal', 'briefing', 'idea-cards', 'conviction', 'mentor-match', 'war-rooms', 'watchlist', 'backtester', 'seasonality-calendar', 'portfolio', 'reports', 'news', 'networking', 'coaching', 'referrals', 'settings', 'about', 'contact', 'admin'];

const TabFallback = () => (
    <div className="flex items-center justify-center h-64 text-text-secondary">
        <span className="material-icons animate-spin text-3xl text-primary/60">progress_activity</span>
    </div>
);

const DashboardPage = () => {
    // Persist the active tab in the URL (?tab=admin) so reloads and
    // bookmarks land on the same pane instead of always bouncing to Home.
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const activeTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'home';

    const setActiveTab = useCallback(
        (tab) => {
            if (tab === 'home') {
                setSearchParams({}, { replace: true });
            } else {
                setSearchParams({ tab }, { replace: true });
            }
        },
        [setSearchParams]
    );

    const { isAuthenticated, loading, login } = useAuth();
    const navigate = useNavigate();

    // Keyboard shortcut state — palette (⌘K) and help overlay (?). The
    // hook owns the keydown listener; we render whichever modal it
    // signals open.
    const { paletteOpen, setPaletteOpen, helpOpen, setHelpOpen } = useKeyboardShortcuts({
        navigate,
        setActiveTab,
    });

    // Onboarding guard. We can't read onboardedAt off the JWT (it isn't in
    // the token payload), so we GET /auth/me on first dashboard mount.
    // null = still hydrating, false = need to send them through the wizard,
    // true = they're done, render normally.
    const [onboardingChecked, setOnboardingChecked] = useState(null);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            // Redirect to home and open login via query param
            navigate('/?login=true');
        }
    }, [isAuthenticated, loading, navigate, login]);

    useEffect(() => {
        if (loading || !isAuthenticated) return;
        let active = true;
        api
            .get('/auth/me')
            .then((me) => {
                if (!active) return;
                if (!me.onboardedAt) {
                    navigate('/onboarding', { replace: true });
                } else {
                    setOnboardingChecked(true);
                }
            })
            // /auth/me will exist on the backend now, but a transient
            // failure shouldn't strand the user — let them through and
            // assume they're onboarded; the wizard flag is a UX nudge,
            // not a security boundary.
            .catch(() => active && setOnboardingChecked(true));
        return () => {
            active = false;
        };
    }, [isAuthenticated, loading, navigate]);

    if (loading || (isAuthenticated && onboardingChecked === null)) {
        return <BrandedLoader />;
    }

    if (!isAuthenticated) {
        return null; // Don't render dashboard content while redirecting
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return <DashboardHome setActiveTab={setActiveTab} />;
            case 'signals':
                return <DashboardSignals />;
            case 'terminal':
                return <DashboardTerminal />;
            case 'mood':
                return <DashboardMood />;
            case 'interrogation':
                return <DashboardInterrogation />;
            case 'intel':
                return <DashboardIntel />;
            case 'catalysts':
                return <DashboardCatalysts />;
            case 'macro-themes':
                return <DashboardMacroThemes />;
            case 'scenarios':
                return <DashboardScenarios />;
            case 'smart-money':
                return <DashboardSmartMoney />;
            case 'anomalies':
                return <DashboardAnomalies />;
            case 'alert-builder':
                return <DashboardAlertBuilder />;
            case 'risk-posture':
                return <DashboardRiskPosture />;
            case 'journal':
                return <DashboardJournal />;
            case 'briefing':
                return <DashboardBriefing />;
            case 'idea-cards':
                return <DashboardIdeaCards />;
            case 'conviction':
                return <DashboardConviction />;
            case 'mentor-match':
                return <DashboardMentorMatch />;
            case 'war-rooms':
                return <DashboardWarRooms />;
            case 'watchlist':
                return <DashboardWatchlist />;
            case 'backtester':
                return <DashboardBacktester />;
            case 'seasonality-calendar':
                return <DashboardSeasonalityCalendar />;
            case 'portfolio':
                return <DashboardPortfolio />;
            case 'referrals':
                return <DashboardReferrals />;
            case 'reports':
                return <DashboardReports />;
            case 'news':
                return <DashboardNews />;
            case 'networking':
                return <DashboardNetworking />;
            case 'coaching':
                return <DashboardCoaching />;
            case 'settings':
                return <DashboardSettings />;
            case 'admin':
                return <DashboardAdmin />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                        <span className="material-icons text-6xl mb-4 text-primary/40">construction</span>
                        <h2 className="text-2xl font-bold">Coming Soon</h2>
                        <p>The {activeTab} section is currently under development.</p>
                    </div>
                );
        }
    };

    return (
        <div className="relative z-10 flex min-h-screen bg-background-dark text-text-primary pt-20">
            <SEO title="Dashboard" path="/dashboard" noindex />
            {/* Ticker marquee anchored above the sidebar/main split. The
                pt-20 above already reserves space for the global top bar;
                the marquee sits inside that band on the right of the
                sidebar — visible from every dashboard tab. */}
            <div className="fixed top-20 left-0 right-0 lg:left-64 z-20">
                <TickerMarquee />
            </div>
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            {/* lg:ml-64 keeps the desktop layout untouched; on mobile the
                sidebar is a drawer so main claims the full width and pads
                for the sticky top bar rendered by Sidebar. pt-9 reserves
                room for the marquee strip. */}
            <main className="flex-1 px-4 py-6 pt-24 lg:pt-9 sm:px-8 lg:ml-64 lg:p-12 lg:pt-16 max-w-6xl mx-auto w-full">
                <Suspense fallback={<TabFallback />}>
                    {/* PlanGate intercepts before the lazy panel mounts —
                        if the user's plan can't access this tab the
                        upgrade card renders and the panel chunk never
                        loads. Tabs not present in FEATURES (e.g. admin)
                        pass through unchanged. */}
                    <PlanGate feature={activeTab}>
                        {renderContent()}
                    </PlanGate>
                </Suspense>

                <footer className="mt-20 pt-8 border-t border-white/5 flex items-center justify-center gap-6 text-[10px] font-medium text-text-muted">
                    <p>© {new Date().getFullYear()} ChartSentinel</p>
                    <button
                        onClick={() => setPaletteOpen(true)}
                        className="hover:text-white transition-colors flex items-center gap-1"
                    >
                        <kbd className="font-mono text-[10px] px-1 py-0.5 bg-white/5 rounded border border-white/10">⌘K</kbd>
                        <span>quick jump</span>
                    </button>
                    <button
                        onClick={() => setHelpOpen(true)}
                        className="hover:text-white transition-colors flex items-center gap-1"
                    >
                        <kbd className="font-mono text-[10px] px-1 py-0.5 bg-white/5 rounded border border-white/10">?</kbd>
                        <span>shortcuts</span>
                    </button>
                </footer>
            </main>

            <CommandPalette
                open={paletteOpen}
                onClose={() => setPaletteOpen(false)}
                setActiveTab={setActiveTab}
            />
            <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
        </div>
    );
};

export default DashboardPage;
