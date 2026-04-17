import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHome from '../components/dashboard/Home';
import DashboardReports from '../components/dashboard/Reports';
import DashboardNews from '../components/dashboard/News';
import DashboardNetworking from '../components/dashboard/Networking';
import DashboardCoaching from '../components/dashboard/Coaching';
import DashboardAdmin from '../components/dashboard/Admin';

const DashboardPage = () => {
    const [activeTab, setActiveTab] = useState('home');
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
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <main className="ml-64 flex-1 p-8 lg:p-12 max-w-6xl mx-auto">
                {renderContent()}

                <footer className="mt-20 pt-8 border-t border-white/5 flex items-center justify-center gap-6 text-[10px] font-medium text-text-muted">
                    <p>Proudly built in <span className="text-text-secondary">Framer</span></p>
                    <span className="w-1 h-1 rounded-full bg-white/10"></span>
                    <p>Made by <span className="text-text-secondary">Hiban</span></p>
                    <span className="w-1 h-1 rounded-full bg-white/10"></span>
                    <p>©2025 Dashfolio</p>
                </footer>
            </main>
        </div>
    );
};

export default DashboardPage;
