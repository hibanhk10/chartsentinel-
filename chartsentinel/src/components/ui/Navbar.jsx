import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginModal from '../auth/LoginModal';
import RegisterModal from '../auth/RegisterModal';
import { motion } from 'framer-motion';

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

    const handleScroll = (e, targetId) => {
        e.preventDefault();
        const targetElement = document.getElementById(targetId.replace('#', ''));
        if (targetElement) {
            const offset = 80; // Navbar height
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = targetElement.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    const navItemVariants = {
        hover: { scale: 1.05, color: '#d946ef' }, // primary color
        tap: { scale: 0.95 }
    };

    const buttonVariants = {
        hover: { scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
        tap: { scale: 0.98 }
    };

    return (
        <>
            <nav className="fixed top-0 w-full z-50 bg-background-dark/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                    >
                        <span className="text-xl font-bold font-display tracking-tight text-white">Chartsentinel</span>
                    </motion.div>
                    <div className="hidden md:flex items-center gap-8">
                        <motion.a
                            variants={navItemVariants}
                            whileHover="hover"
                            whileTap="tap"
                            className="text-sm font-medium transition-colors text-slate-300 cursor-pointer"
                            href="#pricing"
                            onClick={(e) => handleScroll(e, '#pricing')}
                        >
                            Services
                        </motion.a>
                        <motion.a
                            variants={navItemVariants}
                            whileHover="hover"
                            whileTap="tap"
                            className="text-sm font-medium transition-colors text-slate-300 cursor-pointer"
                            href="#reviews"
                            onClick={(e) => handleScroll(e, '#reviews')}
                        >
                            Review
                        </motion.a>
                        <motion.a
                            variants={navItemVariants}
                            whileHover="hover"
                            whileTap="tap"
                            className="text-sm font-medium transition-colors text-slate-300 cursor-pointer"
                            href="#contact"
                            onClick={(e) => handleScroll(e, '#contact')}
                        >
                            Contact
                        </motion.a>
                        {isAuthenticated && (
                            <motion.a
                                variants={navItemVariants}
                                whileHover="hover"
                                whileTap="tap"
                                className="text-sm font-medium transition-colors text-slate-300 cursor-pointer"
                                href="/dashboard"
                            >
                                Dashboard
                            </motion.a>
                        )}

                        {isAuthenticated ? (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-slate-300">Welcome, {user?.name}</span>
                                <motion.button
                                    variants={buttonVariants}
                                    whileHover="hover"
                                    whileTap="tap"
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 transition-all text-white">
                                    <span className="material-icons text-sm">logout</span>
                                    <span className="text-sm font-medium">Logout</span>
                                </motion.button>
                            </div>
                        ) : (
                            <motion.button
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                                onClick={handleLogin}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 transition-all text-white">
                                <span className="material-icons text-sm">login</span>
                                <span className="text-sm font-medium">Login In</span>
                            </motion.button>
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
