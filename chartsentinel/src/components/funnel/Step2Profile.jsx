import { useState } from 'react';

const Step2Profile = ({ onNext, onPrev }) => {
    const [profileData, setProfileData] = useState({
        tradeType: '',
        tradingStyle: 'days',
        experience: 'beginner'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Step 2 Data:', profileData);
        onNext(profileData);
    };

    const handleChange = (e) => {
        setProfileData({ ...profileData, [e.target.id]: e.target.value });
    };

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center pt-8">
            <span className="font-display text-primary text-xl md:text-2xl tracking-[0.2em] mb-4 uppercase glow-magenta">
                Step-2
            </span>
            <p className="text-text-secondary text-sm md:text-base leading-relaxed mb-12 max-w-lg">
                By understanding how you trade and what you focus on, we can customize our analysis to support better decisions and stronger consistency.
            </p>

            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 text-left bg-surface-dark/50 p-8 rounded-2xl border border-white/10 backdrop-blur-sm shadow-2xl">
                <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider ml-1" htmlFor="tradeType">
                        What do you trade
                    </label>
                    <input
                        className="w-full bg-background-dark border border-white/5 rounded-xl py-4 px-5 text-white placeholder:text-text-muted focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                        id="tradeType"
                        value={profileData.tradeType}
                        onChange={handleChange}
                        placeholder="Stock/Forex"
                        type="text"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider ml-1" htmlFor="tradingStyle">
                        Trading Style
                    </label>
                    <div className="relative">
                        <select
                            className="w-full appearance-none bg-background-dark border border-white/5 rounded-xl py-4 px-5 text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none cursor-pointer"
                            id="tradingStyle"
                            value={profileData.tradingStyle}
                            onChange={handleChange}
                        >
                            <option value="days">Day Trading</option>
                            <option value="swing">Swing Trading</option>
                            <option value="scalping">Scalping</option>
                            <option value="position">Position Trading</option>
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                            <span className="material-icons text-text-muted">expand_more</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider ml-1" htmlFor="experience">
                        Experience
                    </label>
                    <div className="relative">
                        <select
                            className="w-full appearance-none bg-background-dark border border-white/5 rounded-xl py-4 px-5 text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none cursor-pointer"
                            id="experience"
                            value={profileData.experience}
                            onChange={handleChange}
                        >
                            <option value="beginner">Beginner (0-1 Years)</option>
                            <option value="intermediate">Intermediate (1-3 Years)</option>
                            <option value="advanced">Advanced (3-5 Years)</option>
                            <option value="professional">Professional (5+ Years)</option>
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                            <span className="material-icons text-text-muted">expand_more</span>
                        </div>
                    </div>
                </div>

                <button
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform active:scale-[0.98] mt-4 border border-white/5"
                    type="submit"
                >
                    Next Step
                </button>
            </form>
        </div>
    );
};

export default Step2Profile;
