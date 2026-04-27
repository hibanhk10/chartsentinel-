import { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHome from '../components/dashboard/Home';
import DashboardReports from '../components/dashboard/Reports';
import DashboardNews from '../components/dashboard/News';
import DashboardNetworking from '../components/dashboard/Networking';
import DashboardCoaching from '../components/dashboard/Coaching';
import DashboardAdmin from '../components/dashboard/Admin';
import DashboardSignals from '../components/dashboard/Signals';
import DashboardWatchlist from '../components/dashboard/Watchlist';
import DashboardReferrals from '../components/dashboard/Referrals';
import DashboardTerminal from '../components/dashboard/Terminal';
import DashboardMood from '../components/dashboard/Mood';
import DashboardInterrogation from '../components/dashboard/Interrogation';
import SEO from '../components/ui/SEO';

const VALID_TABS = ['home', 'signals', 'terminal', 'mood', 'interrogation', 'watchlist', 'reports', 'news', 'networking', 'coaching', 'referrals', 'about', 'contact', 'admin'];

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
                {renderContent()}

                <footer className="mt-20 pt-8 border-t border-white/5 flex items-center justify-center gap-6 text-[10px] font-medium text-text-muted">
                    <p>© {new Date().getFullYear()} ChartSentinel</p>
                </footer>
            </main>
        </div>
    );
};

export default DashboardPage;
