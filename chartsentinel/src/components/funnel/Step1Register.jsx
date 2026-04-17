import { useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Accepts international-ish phone numbers with optional + and spaces/dashes.
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

const Step1Register = ({ onNext, initialData = {} }) => {
    const [formData, setFormData] = useState({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
    });
    const [errors, setErrors] = useState({});

    const validate = () => {
        const next = {};
        if (formData.name.trim().length < 2) {
            next.name = 'Please enter your full name.';
        }
        if (!EMAIL_RE.test(formData.email.trim())) {
            next.email = 'Please enter a valid email address.';
        }
        if (!PHONE_RE.test(formData.phone.trim())) {
            next.phone = 'Please enter a valid phone number.';
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        onNext(formData);
    };

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
        // Clear the field's error as the user corrects it.
        if (errors[id]) {
            setErrors((prev) => ({ ...prev, [id]: undefined }));
        }
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
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-surface-dark to-black" />
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
                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2" htmlFor="name">Name</label>
                            <input
                                className="w-full bg-background-dark/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white transition-all outline-none"
                                id="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Jane Smith"
                                type="text"
                            />
                            {errors.name && (
                                <p className="text-red-400 text-xs mt-1">{errors.name}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2" htmlFor="email">Email</label>
                            <input
                                className="w-full bg-background-dark/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white transition-all outline-none"
                                id="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="jane@gmail.com"
                                type="email"
                            />
                            {errors.email && (
                                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2" htmlFor="phone">Phone</label>
                            <input
                                className="w-full bg-background-dark/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white transition-all outline-none"
                                id="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+1 989 736 7890"
                                type="tel"
                            />
                            {errors.phone && (
                                <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
                            )}
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
