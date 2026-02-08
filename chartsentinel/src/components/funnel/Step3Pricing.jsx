const Step3Pricing = ({ onNext }) => {
    return (
        <div className="max-w-6xl mx-auto text-center pt-8">
            <header className="mb-12">
                <span className="font-display text-primary text-sm font-bold tracking-widest uppercase glow-magenta">Step-3</span>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-white">
                    Our <span className="text-primary glow-magenta">Plans.</span>
                </h1>
                <p className="text-text-secondary max-w-xl mx-auto text-sm md:text-base leading-relaxed">
                    Choose from our plans to start your progress to making money consistently.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 max-w-4xl mx-auto">
                {/* Pro Plan */}
                <div className="relative bg-white/5 border-2 border-primary rounded-3xl p-8 flex flex-col shadow-2xl shadow-primary/20 scale-105 z-20 transition-all hover:scale-[1.07] duration-300">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        Most Popular
                    </div>
                    <div className="mb-8">
                        <h3 className="text-lg font-medium opacity-60 mb-2 text-white">Pro</h3>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-5xl font-extrabold font-display text-white">$59</span>
                        </div>
                    </div>
                    <ul className="space-y-4 mb-12 flex-grow">
                        <li className="flex items-start gap-3 text-sm text-white">
                            <span className="material-icons text-primary text-base mt-0.5">check</span>
                            <span>Exclusive DC community</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-white">
                            <span className="material-icons text-primary text-base mt-0.5">check</span>
                            <span>2 - weekly reports</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-white">
                            <span className="material-icons text-primary text-base mt-0.5">check</span>
                            <span>Live breakdowns</span>
                        </li>
                    </ul>
                    <button
                        onClick={() => onNext({ plan: 'pro' })}
                        className="w-full py-4 px-6 rounded-2xl bg-white text-black font-bold shadow-xl transition-transform active:scale-95 hover:bg-gray-100"
                    >
                        Choose Plan
                    </button>
                </div>

                {/* Custom Plan */}
                <div className="bg-surface-dark/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col transition-all hover:scale-[1.02] duration-300">
                    <div className="mb-8">
                        <h3 className="text-lg font-medium text-text-muted mb-2">Custom</h3>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-5xl font-extrabold font-display text-white">$118</span>
                        </div>
                    </div>
                    <ul className="space-y-4 mb-12 flex-grow">
                        <li className="flex items-start gap-3 text-sm text-white">
                            <span className="material-icons text-primary text-base mt-0.5">check</span>
                            <span>Exclusive DC community</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-white">
                            <span className="material-icons text-primary text-base mt-0.5">check</span>
                            <span>2 - weekly reports</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-white">
                            <span className="material-icons text-primary text-base mt-0.5">check</span>
                            <span>1 on 1 analytics</span>
                        </li>
                    </ul>
                    <button
                        onClick={() => onNext({ plan: 'custom' })}
                        className="w-full py-4 px-6 rounded-2xl bg-white/10 text-white font-semibold transition-colors hover:bg-white/20 border border-white/5"
                    >
                        Choose Plan
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Step3Pricing;
