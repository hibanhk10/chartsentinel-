import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginModal from '../auth/LoginModal';
import RegisterModal from '../auth/RegisterModal';

export default function Navbar() {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();

    const handleLogin = () => {
        setShowLoginModal(true);
        setShowRegisterModal(false);
    };

    const handleRegister = () => {
        setShowRegisterModal(true);
        setShowLoginModal(false);
    };

    const handleLogout = () => {
        logout();
    };

    return (
        <>
            <nav className="fixed top-0 w-full z-50 bg-background-dark/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold font-display tracking-tight text-white">Chartsentinel</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a className="text-sm font-medium hover:text-primary transition-colors text-slate-300" href="#pricing">Services</a>
                        <a className="text-sm font-medium hover:text-primary transition-colors text-slate-300" href="#reviews">Review</a>
                        <a className="text-sm font-medium hover:text-primary transition-colors text-slate-300" href="#contact">Contact</a>
                        {isAuthenticated && (
                            <a className="text-sm font-medium hover:text-primary transition-colors text-slate-300" href="/dashboard">Dashboard</a>
                        )}

                        {isAuthenticated ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-slate-300">Welcome, {user?.name}</span>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/5 transition-all text-white">
                                    <span className="material-icons text-sm">logout</span>
                                    <span className="text-sm font-medium">Logout</span>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleLogin}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/5 transition-all text-white">
                                <span className="material-icons text-sm">login</span>
                                <span className="text-sm font-medium">Login In</span>
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onSwitchToRegister={handleRegister}
            />

            <RegisterModal
                isOpen={showRegisterModal}
                onClose={() => setShowRegisterModal(false)}
                onSwitchToLogin={handleLogin}
            />
        </>
    )
}
