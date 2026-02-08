import { useNavigate } from 'react-router-dom';

const FunnelLayout = ({ currentStep, totalSteps, children }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background-dark text-white font-sans selection:bg-primary/30 relative overflow-x-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none gradient-mesh opacity-20"></div>
            <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>

            {/* Navigation */}
            <nav className="relative z-10 p-6 flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <span className="font-display text-2xl font-bold tracking-tighter">
                        chart<span className="text-primary">SENTINEL</span>
                    </span>
                </div>
                <div className="hidden md:flex items-center gap-4 text-sm font-medium">
                    {[...Array(totalSteps)].map((_, index) => {
                        const stepNum = index + 1;
                        const isActive = stepNum === currentStep;
                        const isCompleted = stepNum < currentStep;

                        return (
                            <div key={stepNum} className="flex items-center gap-4">
                                <span className={`flex items-center gap-1 ${isActive ? 'text-primary font-bold' : isCompleted ? 'text-white opacity-80' : 'text-white opacity-40'}`}>
                                    {isCompleted && <span className="material-icons text-xs">check_circle</span>}
                                    Step {stepNum}
                                </span>
                                {stepNum < totalSteps && <div className={`w-4 h-[1px] ${isCompleted ? 'bg-primary' : 'bg-white/20'}`}></div>}
                            </div>
                        );
                    })}
                </div>
            </nav>

            <main className="relative z-10 px-4 pb-20">
                {children}
            </main>

            {/* Mobile Process Bar (Bottom) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background-dark/90 backdrop-blur-md border-t border-white/10 p-4 z-50">
                <div className="flex items-center justify-between text-xs font-medium text-text-muted mb-2">
                    <span>Step {currentStep} of {totalSteps}</span>
                    <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default FunnelLayout;
