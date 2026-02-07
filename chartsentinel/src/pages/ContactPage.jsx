import { useState } from 'react';
import { motion } from 'framer-motion';
import { API_CONFIG } from '../config/api';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        message: '',
    });
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage('');

        try {
            const response = await fetch(`${API_CONFIG.baseURL}/contact`, {
                method: 'POST',
                headers: API_CONFIG.headers,
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            setStatus('success');
            setFormData({ fullName: '', email: '', message: '' });
        } catch (err) {
            console.error('Submission error:', err);
            setStatus('error');
            setErrorMessage(err.message || 'Failed to send message. Please try again.');
        }
    };

    return (
        <div className="min-h-screen pt-32 pb-20 px-6 relative z-10">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-3xl"
                >
                    <div className="mb-10 text-center">
                        <h1 className="text-4xl md:text-5xl font-bold font-display mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                            Contact Us
                        </h1>
                        <p className="text-slate-400 text-lg">
                            Have a complaint or feedback? Let us know and we'll get back to you.
                        </p>
                    </div>

                    {status === 'success' ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-10"
                        >
                            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="material-icons text-primary text-4xl">check_circle</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-4">Message Sent!</h2>
                            <p className="text-slate-400 mb-8">
                                Thank you for reaching out. Our team has received your message and will review it shortly.
                            </p>
                            <button
                                onClick={() => setStatus('idle')}
                                className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-slate-200 transition-colors"
                            >
                                Send Another
                            </button>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 ml-1">Full Name</label>
                                <input
                                    required
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="John Doe"
                                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-primary/50 transition-colors text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="john@example.com"
                                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-primary/50 transition-colors text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 ml-1">Your Complaint / Message</label>
                                <textarea
                                    required
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    placeholder="Please describe your issue in detail..."
                                    rows="5"
                                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-primary/50 transition-colors text-white resize-none"
                                ></textarea>
                            </div>

                            {status === 'error' && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                                    {errorMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full py-5 bg-primary text-white rounded-2xl font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                {status === 'loading' ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span className="material-icons text-xl">send</span>
                                        <span>Submit Message</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
