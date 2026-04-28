import MemberMap from '../ui/MemberMap';

const DashboardNetworking = () => {
    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <header className="text-center mb-16">
                <h1 className="text-5xl md:text-6xl font-bold font-display text-white mb-8 leading-[1.1]">
                    Join Our.<br />
                    <span className="text-text-muted">Discord Community.</span>
                </h1>
                <div className="flex items-center justify-center gap-4">
                    <button className="bg-primary text-white px-8 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
                        Join Now
                    </button>
                    <button className="bg-white/5 text-white border border-white/10 px-8 py-2.5 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors">
                        Copy link
                    </button>
                </div>
            </header>

            <section className="space-y-6">
                <div className="flex items-end justify-between gap-6 flex-wrap">
                    <div>
                        <h2 className="text-3xl font-bold font-display text-white mb-2">Members Worldwide</h2>
                        <p className="text-text-secondary text-sm max-w-xl leading-relaxed">
                            See where the community trades from. Locations are city-level and only
                            shown for members who have opted in to the public roster.
                        </p>
                    </div>
                </div>
                <div className="h-[420px] md:h-[500px]">
                    <MemberMap />
                </div>
            </section>

            <div className="space-y-32 mb-32">
                <div className="grid md:grid-cols-2 items-center gap-12">
                    <div>
                        <h2 className="text-3xl font-bold font-display text-white mb-4">Share Ideas</h2>
                        <p className="text-text-secondary leading-relaxed">
                            Connect with expert traders and exchange strategies in real-time. Our global network ensures you're always in the loop with market sentiment.
                        </p>
                    </div>
                    <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                        <img
                            alt="Community Collaboration"
                            className="w-full aspect-square object-cover opacity-80"
                            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 items-center gap-12">
                    <div className="order-2 md:order-1">
                        <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/5 p-2 bg-surface-dark">
                            <img
                                alt="Chart Analysis"
                                className="w-full aspect-[4/3] object-cover rounded-2xl opacity-80"
                                src="https://images.unsplash.com/photo-1611974714658-058f1c1009fe?q=80&w=2070&auto=format&fit=crop"
                            />
                        </div>
                    </div>
                    <div className="order-1 md:order-2">
                        <h2 className="text-3xl font-bold font-display text-white mb-4">Live Breakdowns</h2>
                        <p className="text-text-secondary leading-relaxed">
                            Watch professional analysis of current market trends. Understand the 'why' behind every move with our interactive daily breakdown sessions.
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 items-center gap-12">
                    <div>
                        <h2 className="text-3xl font-bold font-display text-white mb-4">Meet New People</h2>
                        <p className="text-text-secondary leading-relaxed">
                            Build lasting relationships with fellow traders. Share your journey, celebrate wins, and grow together in a supportive environment.
                        </p>
                    </div>
                    <div className="rounded-3xl overflow-hidden shadow-2xl bg-primary/5 p-8 flex items-center justify-center border border-white/5">
                        <img
                            alt="Virtual Meetup"
                            className="w-full aspect-[4/3] object-cover rounded-2xl shadow-lg opacity-80"
                            src="https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=2070&auto=format&fit=crop"
                        />
                    </div>
                </div>
            </div>

            <section className="max-w-2xl mx-auto text-center border-t border-white/5 pt-24 pb-32">
                <blockquote className="text-3xl md:text-4xl font-bold font-display text-white mb-6 leading-tight">
                    “We have a goal to build a place where people can find real traders who will stick with life”
                </blockquote>
                <cite className="text-text-muted not-italic font-medium text-sm tracking-widest uppercase">The Founders</cite>
            </section>
        </div>
    );
};

export default DashboardNetworking;
