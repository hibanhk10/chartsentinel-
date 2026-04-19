import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import LoginModal from '../auth/LoginModal';
import RegisterModal from '../auth/RegisterModal';

// Top-level navigation used across the marketing site. Below the md
// breakpoint the inline links collapse into a hamburger that opens a
// full-screen drawer so sign-in + dashboard are still one tap away on
// phones — previously everything past the logo was hidden.

export default function Navbar() {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // ?login=true deep-link — keeps external sign-in CTAs working.
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('login') === 'true') {
            setShowLoginModal(true);
            navigate(location.pathname, { replace: true });
        }
    }, [location.search, location.pathname, navigate]);

    // Close the mobile drawer on route change so users don't get stuck on
    // a menu overlay after tapping through.
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    // Esc key + body scroll lock while the drawer is open.
    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [menuOpen]);

    const handleLogin = () => {
        setShowLoginModal(true);
        setShowRegisterModal(false);
        setMenuOpen(false);
    };

    const handleRegister = () => {
        navigate('/funnel');
        setShowLoginModal(false);
        setShowRegisterModal(false);
        setMenuOpen(false);
    };

    const handleLogout = () => {
        logout();
        setMenuOpen(false);
    };

    const handleScroll = (e, targetId) => {
        if (location.pathname !== '/') {
            navigate('/');
            setMenuOpen(false);
            return;
        }

        e.preventDefault();
        const target = document.getElementById(targetId.replace('#', ''));
        if (target) {
            const offset = 80;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = target.getBoundingClientRect().top;
            const offsetPosition = elementRect - bodyRect - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
        setMenuOpen(false);
    };

    const linkClass =
        'text-sm font-medium text-slate-300 hover:text-primary transition-colors cursor-pointer';
    const navSections = [
        { label: 'Services', onClick: (e) => handleScroll(e, '#pricing'), href: '#pricing' },
        { label: 'Review', onClick: (e) => handleScroll(e, '#reviews'), href: '#reviews' },
    ];

    return (
        <>
            <nav className="fixed top-0 w-full z-50 bg-background-dark/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 cursor-pointer min-w-0"
                    >
                        <span className="text-lg sm:text-xl font-bold font-display tracking-tight text-white truncate">
                            Chartsentinel
                        </span>
                    </motion.div>

                    {/* Desktop nav — unchanged from the original layout. */}
                    <div className="hidden md:flex items-center gap-8">
                        {navSections.map((n) => (
                            <a key={n.label} className={linkClass} href={n.href} onClick={n.onClick}>
                                {n.label}
                            </a>
                        ))}
                        <Link to="/contact" className={linkClass}>
                            Contact
                        </Link>
                        {isAuthenticated && (
                            <Link to="/dashboard" className={linkClass}>
                                Dashboard
                            </Link>
                        )}
                        {isAuthenticated ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-slate-300 truncate max-w-[12rem]">
                                    Welcome, {user?.name || user?.email?.split('@')[0] || 'Trader'}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/5 transition-all text-white"
                                >
                                    <span className="material-icons text-sm">logout</span>
                                    <span className="text-sm font-medium">Logout</span>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleLogin}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/5 transition-all text-white"
                            >
                                <span className="material-icons text-sm">login</span>
                                <span className="text-sm font-medium">Login</span>
                            </button>
                        )}
                    </div>

                    {/* Mobile toggle — hidden above md where the inline menu takes over. */}
                    <button
                        className="md:hidden flex items-center justify-center w-10 h-10 rounded-md hover:bg-white/5 transition-colors text-white"
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        onClick={() => setMenuOpen((o) => !o)}
                    >
                        <span className="material-icons text-2xl">{menuOpen ? 'close' : 'menu'}</span>
                    </button>
                </div>
            </nav>

            {/* Mobile drawer — rendered outside the nav bar so it can claim
                the full viewport without fighting the navbar's height. */}
            {menuOpen && (
                <div className="md:hidden fixed inset-0 z-40 pt-20 bg-background-dark/95 backdrop-blur-lg">
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col gap-1">
                            {navSections.map((n) => (
                                <a
                                    key={n.label}
                                    href={n.href}
                                    onClick={n.onClick}
                                    className="flex items-center justify-between py-3 px-4 rounded-lg text-white hover:bg-white/5 transition-colors"
                                >
                                    <span>{n.label}</span>
                                    <span className="material-icons text-text-muted">chevron_right</span>
                                </a>
                            ))}
                            <Link
                                to="/contact"
                                className="flex items-center justify-between py-3 px-4 rounded-lg text-white hover:bg-white/5 transition-colors"
                            >
                                <span>Contact</span>
                                <span className="material-icons text-text-muted">chevron_right</span>
                            </Link>
                            {isAuthenticated && (
                                <Link
                                    to="/dashboard"
                                    className="flex items-center justify-between py-3 px-4 rounded-lg text-white hover:bg-white/5 transition-colors"
                                >
                                    <span>Dashboard</span>
                                    <span className="material-icons text-text-muted">chevron_right</span>
                                </Link>
                            )}
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            {isAuthenticated ? (
                                <>
                                    <div className="px-4 pb-3 text-xs uppercase tracking-wider text-text-muted">
                                        Signed in as
                                    </div>
                                    <div className="px-4 pb-4 text-sm text-white truncate">
                                        {user?.email || 'Trader'}
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-full border border-white/10 hover:bg-white/5 text-white"
                                    >
                                        <span className="material-icons text-base">logout</span>
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleLogin}
                                        className="py-3 rounded-full border border-white/10 hover:bg-white/5 text-white text-sm font-medium"
                                    >
                                        Login
                                    </button>
                                    <button
                                        onClick={handleRegister}
                                        className="py-3 rounded-full bg-primary hover:bg-primary/90 text-white text-sm font-medium"
                                    >
                                        Get started
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
    );
}
