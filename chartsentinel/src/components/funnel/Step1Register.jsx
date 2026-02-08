import { useState } from 'react';

const Step1Register = ({ onNext }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        // In a real app, we would register the user here.
        // For now, we just proceed to the next step.
        console.log('Step 1 Data:', formData);
        onNext(formData);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    return (
        <div className="max-w-6xl mx-auto">
            <header className="text-center mb-12">
                <span className="font-mono text-primary uppercase tracking-widest text-sm font-bold glow-magenta">Step-1</span>
                <h1 className="text-4xl md:text-5xl font-bold mt-2 text-white">
                    WATCH <span className="text-primary glow-magenta">THIS VIDEO</span>
                </h1>
            </header>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
                {/* Video Side */}
                <div className="space-y-8">
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 relative group cursor-pointer shadow-2xl shadow-primary/10">
                        <img
                            alt="Trading Dashboard Video Placeholder"
                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                            src="https://images.unsplash.com/photo-1611974714658-058f1c1009fe?q=80&w=2070&auto=format&fit=crop"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                                <span className="material-icons text-background-dark text-4xl">play_arrow</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold mb-4">chart<span className="text-primary glow-magenta">SENTINEL</span></h2>
                        <p className="text-text-secondary text-lg leading-relaxed">
                            Change how you read the market, and your results will follow. Trade with structure, clarity, and a real edge.
                        </p>
                    </div>
                </div>

                {/* Form Side */}
                <div className="bg-surface-dark border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-white mb-6">Get Started</h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2" htmlFor="name">Name</label>
                            <input
                                className="w-full bg-background-dark/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white transition-all outline-none"
                                id="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Jane Smith"
                                required
                                type="text"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2" htmlFor="email">Email</label>
                            <input
                                className="w-full bg-background-dark/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white transition-all outline-none"
                                id="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="jane@gmail.com"
                                required
                                type="email"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2" htmlFor="phone">Phone</label>
                            <input
                                className="w-full bg-background-dark/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white transition-all outline-none"
                                id="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+1 9897367890"
                                required
                                type="tel"
                            />
                        </div>
                        <button
                            className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary-dark transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-primary/25 mt-4"
                            type="submit"
                        >
                            Continue to Step 2
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Step1Register;
