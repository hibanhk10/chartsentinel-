import TradingVisualization from './TradingVisualization'

export default function Process() {
    return (
        <section className="py-16 md:py-24 bg-background-dark">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-20">
                    {/* Visual Content Left — fluid height on mobile so the 3D
                        viewport doesn't dominate a phone screen, fixed on lg. */}
                    <div className="relative rounded-3xl overflow-hidden aspect-[4/5] h-[360px] md:h-[500px] lg:h-[600px] w-full bg-slate-900 border border-slate-800 shadow-2xl">
                        <TradingVisualization />
                    </div>

                    {/* Right Content */}
                    <div className="flex flex-col justify-center space-y-12">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                <span className="material-icons text-xs text-white">auto_awesome</span>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-white">Design Process</span>
                            </div>
                            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight text-white">Process</h2>
                            <p className="text-secondary dark:text-secondary max-w-md leading-relaxed">
                                Our process is straight to the forward. Our analysts collect the info and make them into
                                easy to read and understand report.
                            </p>
                            <div className="flex gap-4">
                                <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-sm font-semibold hover:bg-white/10 transition-all glow-button text-white">
                                    Book a Free Call
                                </button>
                                <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-sm font-semibold hover:bg-white/10 transition-all text-white">
                                    View Plans
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {[
                                { id: 1, icon: 'lightbulb', title: 'Collect information', desc: 'Our highly skilled analysts get all the needed info to make a trade or to understand the current market condition.' },
                                { id: 2, icon: 'analytics', title: 'Making Reports', desc: 'The information collected by the analysis will pass on to the reporters who organize and make it easy to understand.' },
                                { id: 3, icon: 'send', title: 'Report Delivered', desc: 'The final product will then be passed to the clients through E-mail as a newsletter twice a week.' }
                            ].map(step => (
                                <div key={step.id} className="glass-card p-6 rounded-2xl relative group hover:bg-white/5 transition-colors">
                                    <span className="absolute top-4 right-6 text-[10px] font-bold text-muted">{step.id}</span>
                                    <div className="flex items-start gap-4">
                                        <span className="material-icons text-primary">{step.icon}</span>
                                        <div>
                                            <h4 className="text-xl font-bold mb-3 text-white">{step.title}</h4>
                                            <p className="text-sm text-secondary leading-relaxed">{step.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
