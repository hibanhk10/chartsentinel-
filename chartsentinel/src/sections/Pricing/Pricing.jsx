import { View } from '@react-three/drei'
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'

export default function Pricing() {
    const { isAuthenticated } = useAuth();

    const navigate = useNavigate();

    const handleSignUp = () => {
        // Redirect to sales funnel for all plans
        navigate('/funnel');
    };

    return (
        <section id="pricing" className="py-16 md:py-24 bg-background-dark relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <h2 className="text-4xl sm:text-5xl font-display font-bold text-center mb-12 md:mb-20 tracking-tight text-white">Pricing</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {/* Free Tier */}
                    <div className="bg-slate-900 border border-white/10 text-white p-6 sm:p-8 rounded-3xl flex flex-col h-full shadow-2xl transition-transform hover:-translate-y-2">
                        <span className="text-secondary text-sm font-medium mb-4">Free</span>
                        <div className="text-5xl font-bold mb-8 text-white">$0</div>
                        <ul className="space-y-4 mb-12 flex-grow">
                            <li className="flex items-center gap-3 text-sm">
                                <span className="material-icons text-sm text-green-600">check</span> General report
                            </li>
                            <li className="flex items-center gap-3 text-sm">
                                <span className="material-icons text-sm text-green-600">check</span> Discord community
                            </li>
                        </ul>
                        <button
                            onClick={() => handleSignUp()}
                            className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors"
                        >
                            {isAuthenticated ? 'Current Plan' : 'Sign Up'}
                        </button>
                    </div>

                    {/* Pro Tier */}
                    <div className="bg-slate-900 border border-white/10 text-white p-6 sm:p-8 rounded-3xl flex flex-col h-full shadow-2xl transition-transform hover:-translate-y-2">
                        <span className="text-secondary text-sm font-medium mb-4">Pro</span>
                        <div className="text-5xl font-bold mb-8 text-white">$59</div>
                        <ul className="space-y-4 mb-12 flex-grow">
                            {['2-Weekly report', 'Live Backdowns', 'Q&As with analyst'].map(item => (
                                <li key={item} className="flex items-center gap-3 text-sm font-semibold">
                                    <span className="material-icons text-sm text-green-600">check</span> {item}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleSignUp()}
                            className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors"
                        >
                            {isAuthenticated ? 'Upgrade to Pro' : 'Sign Up'}
                        </button>
                    </div>

                    {/* Ultimate Tier */}
                    <div className="bg-slate-900 border border-white/10 text-white p-6 sm:p-8 rounded-3xl flex flex-col h-full shadow-2xl transition-transform hover:-translate-y-2">
                        <span className="text-secondary text-sm font-medium mb-4">Ultimate</span>
                        <div className="text-5xl font-bold mb-8 text-white">$109</div>
                        <ul className="space-y-4 mb-12 flex-grow">
                            {['2-Weekly report', 'Market explanation', 'Live Breakdown', 'Q&As with analyst', 'Extra Support'].map(item => (
                                <li key={item} className="flex items-center gap-3 text-sm">
                                    <span className="material-icons text-sm text-green-600">check</span> {item}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleSignUp()}
                            className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors"
                        >
                            {isAuthenticated ? 'Upgrade to Ultimate' : 'Sign Up'}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}
