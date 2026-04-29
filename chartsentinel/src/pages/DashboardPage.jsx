import { lazy, Suspense, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHome from '../components/dashboard/Home';
import SEO from '../components/ui/SEO';

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

const VALID_TABS = ['home', 'signals', 'terminal', 'mood', 'interrogation', 'intel', 'catalysts', 'macro-themes', 'scenarios', 'smart-money', 'anomalies', 'alert-builder', 'risk-posture', 'journal', 'briefing', 'idea-cards', 'conviction', 'mentor-match', 'war-rooms', 'watchlist', 'reports', 'news', 'networking', 'coaching', 'referrals', 'about', 'contact', 'admin'];

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

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            // Redirect to home and open login via query param
            navigate('/?login=true');
        }
    }, [isAuthenticated, loading, navigate, login]);

    if (loading) {
        return <div className="min-h-screen bg-background-dark flex items-center justify-center text-white">Loading...</div>;
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
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            {/* lg:ml-64 keeps the desktop layout untouched; on mobile the
                sidebar is a drawer so main claims the full width and pads
                for the sticky top bar rendered by Sidebar. */}
            <main className="flex-1 px-4 py-6 pt-16 lg:pt-0 sm:px-8 lg:ml-64 lg:p-12 max-w-6xl mx-auto w-full">
                <Suspense fallback={<TabFallback />}>
                    {renderContent()}
                </Suspense>

                <footer className="mt-20 pt-8 border-t border-white/5 flex items-center justify-center gap-6 text-[10px] font-medium text-text-muted">
                    <p>© {new Date().getFullYear()} ChartSentinel</p>
                </footer>
            </main>
        </div>
    );
};

export default DashboardPage;
