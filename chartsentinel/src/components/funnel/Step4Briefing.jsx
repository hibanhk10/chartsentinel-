const Step4Briefing = ({ onComplete }) => {
    return (
        <div className="max-w-5xl mx-auto text-center pt-12 flex flex-col items-center">
            <div className="mb-4">
                <h2 className="font-display text-primary text-xl md:text-2xl font-bold tracking-widest glow-magenta uppercase">
                    Step-4
                </h2>
            </div>
            <div className="max-w-3xl mb-12">
                <h1 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight leading-tight text-white">
                    This is the last and most <span className="text-primary italic">important</span> part
                </h1>
                <p className="text-text-secondary text-lg md:text-xl leading-relaxed">
                    Watch the full video briefing below to understand our execution strategy and how we'll be securing your consistent results.
                </p>
            </div>

            <div className="relative w-full aspect-video max-w-4xl rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 bg-black/50 border border-white/10 group cursor-pointer mb-12">
                <img
                    alt="Final Briefing Preview"
                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                    src="https://images.unsplash.com/photo-1640340434855-6084b1f4901c?q=80&w=2070&auto=format&fit=crop"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex flex-col items-center justify-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-primary rounded-full flex items-center justify-center text-black shadow-lg shadow-primary/40 transform group-hover:scale-110 transition-transform duration-300">
                        <span className="material-icons text-5xl">play_arrow</span>
                    </div>
                    <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                        <div className="text-left">
                            <p className="font-display text-primary text-sm tracking-widest uppercase mb-1 drop-shadow-md">Final Briefing</p>
                            <h3 className="text-2xl font-bold text-white drop-shadow-md">Market Edge Unleashed</h3>
                        </div>
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-white border border-white/10">
                            12:45
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-background-dark/80 backdrop-blur-xl border-t border-white/10 p-6 z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-left hidden md:block">
                        <p className="text-text-muted text-xs uppercase tracking-widest mb-1">Current Progress</p>
                        <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="w-3/4 h-full bg-primary"></div>
                            </div>
                            <span className="text-sm font-bold text-white">75% Complete</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto justify-center">
                        <button
                            onClick={onComplete}
                            className="bg-primary text-white hover:bg-primary-dark px-10 py-4 rounded-xl font-display font-bold text-sm tracking-widest transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
                        >
                            COMPLETE & ACCESS DASHBOARD
                            <span className="material-icons group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Step4Briefing;
