const DashboardCoaching = () => {
    const lessons = [
        {
            id: 1,
            title: 'Basics of Trading',
            description: 'Analysis of market structure and basic terminology.',
            progress: 100,
            image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b955?q=80&w=2070&auto=format&fit=crop'
        },
        {
            id: 2,
            title: 'Long and Short Trades',
            description: 'Understanding directional bias and leverage.',
            progress: 60,
            image: 'https://images.unsplash.com/photo-1611974714658-058f1c1009fe?q=80&w=2070&auto=format&fit=crop'
        },
        {
            id: 3,
            title: 'Fundamentals of Trading',
            description: 'Macro-economic indicators and their impact.',
            progress: 0,
            image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop'
        }
    ];

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <header className="mb-16">
                <h1 className="text-6xl font-bold mb-4 tracking-tight text-white">Coaching</h1>
                <p className="text-lg text-text-secondary">Coaching you to become a profitable trader.</p>
            </header>

            <section className="space-y-8 mb-24">
                {lessons.map((lesson) => (
                    <div key={lesson.id} className="group flex flex-col md:flex-row gap-8 items-start cursor-pointer hover:bg-white/5 p-4 -mx-4 rounded-2xl transition-colors">
                        <div className="relative w-full md:w-80 h-48 rounded-2xl overflow-hidden bg-black/50 border border-white/5 shadow-sm group-hover:shadow-md transition-all">
                            <img
                                alt={lesson.title}
                                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                                src={lesson.image}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                                <span className="material-icons text-white text-5xl drop-shadow-lg">play_circle_filled</span>
                            </div>
                        </div>
                        <div className="flex-1 py-2">
                            <h2 className="text-2xl font-bold mb-2 text-white group-hover:text-primary transition-colors">{lesson.id} - {lesson.title}</h2>
                            <p className="text-text-secondary text-sm mb-6">{lesson.description}</p>

                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-1000 ease-out"
                                    style={{ width: `${lesson.progress}%` }}
                                />
                            </div>
                            <div className="mt-2 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">
                                {lesson.progress}% Complete
                            </div>
                        </div>
                    </div>
                ))}
            </section>
        </div>
    );
};

export default DashboardCoaching;
