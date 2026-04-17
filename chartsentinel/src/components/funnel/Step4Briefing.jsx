import { useState } from 'react';

const MIN_PASSWORD_LENGTH = 6;

const Step4Briefing = ({ onComplete, initialEmail }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState(false);

    const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
    const canSubmit = password.length >= MIN_PASSWORD_LENGTH && !loading;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setTouched(true);
        if (!canSubmit) return;
        setLoading(true);
        try {
            await onComplete(password);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto pt-12">
            <div className="text-center mb-12">
                <span className="font-display text-primary text-sm font-bold tracking-widest uppercase glow-magenta">Final Step</span>
                <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-4 text-white">
                    Create Your <span className="text-primary glow-magenta">Account</span>
                </h1>
                <p className="text-text-secondary">
                    Secure your spot and start your journey.
                </p>
            </div>

            <div className="bg-surface-dark border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-sm">
                <form onSubmit={handleSubmit} noValidate className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-2">Email</label>
                        <input
                            type="email"
                            value={initialEmail || ''}
                            readOnly
                            className="w-full bg-background-dark/50 border border-white/10 rounded-xl px-4 py-3 text-text-secondary cursor-not-allowed opacity-75 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-2" htmlFor="password">Create Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => setTouched(true)}
                            className={`w-full bg-background-dark/50 border rounded-xl px-4 py-3 text-white transition-all outline-none ${
                                (touched || passwordTooShort) && passwordTooShort
                                    ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                                    : 'border-white/10 focus:border-primary focus:ring-1 focus:ring-primary'
                            }`}
                            placeholder="••••••••"
                            required
                            minLength={MIN_PASSWORD_LENGTH}
                        />
                        {passwordTooShort ? (
                            <p className="text-red-400 text-xs mt-2">
                                Password must be at least {MIN_PASSWORD_LENGTH} characters.
                            </p>
                        ) : (
                            <p className="text-text-muted text-xs mt-2">
                                Use at least {MIN_PASSWORD_LENGTH} characters.
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary-dark transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Complete Registration
                                <span className="material-icons text-sm">arrow_forward</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Step4Briefing;
