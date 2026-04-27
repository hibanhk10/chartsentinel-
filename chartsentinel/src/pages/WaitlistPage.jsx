import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../config/api';
import SEO from '../components/ui/SEO';

// Mirrors the schema enforced server-side. Kept as plain functions
// rather than zod here to avoid pulling in another runtime-validation
// dep — the main app deliberately uses useState + manual validation
// across forms (see ContactPage.jsx, ForgotPasswordPage.jsx).
function validateStep1(data) {
    const errors = {};
    if (!data.fullName || data.fullName.trim().length < 2) {
        errors.fullName = 'Name must be at least 2 characters';
    }
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = 'Enter a valid email address';
    }
    return errors;
}

function validateStep2(data) {
    const errors = {};
    if (!data.institution || data.institution.trim().length < 2) {
        errors.institution = 'Institution name required';
    }
    if (!data.aum) {
        errors.aum = 'Select an AUM band';
    }
    return errors;
}

function ArrowRightIcon({ className = '' }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}

export default function WaitlistPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [data, setData] = useState({
        fullName: '',
        email: '',
        institution: '',
        aum: '',
        acknowledgeDisclaimer: false,
    });
    const [errors, setErrors] = useState({});
    const [submitState, setSubmitState] = useState({ status: 'idle', message: '' });

    const setField = (field, value) => {
        setData((prev) => ({ ...prev, [field]: value }));
        // Clear the field's error as soon as the user types — feels less
        // punishing than waiting for the next continue press.
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const goToStep2 = () => {
        const stepErrors = validateStep1(data);
        if (Object.keys(stepErrors).length) {
            setErrors(stepErrors);
            return;
        }
        setErrors({});
        setStep(2);
    };

    const goToStep3 = () => {
        const stepErrors = validateStep2(data);
        if (Object.keys(stepErrors).length) {
            setErrors(stepErrors);
            return;
        }
        setErrors({});
        setStep(3);
    };

    const allFieldsValid = () =>
        Object.keys(validateStep1(data)).length === 0
        && Object.keys(validateStep2(data)).length === 0
        && data.acknowledgeDisclaimer === true;

    const onSubmit = async (e) => {
        e.preventDefault();
        const stepErrors = {
            ...validateStep1(data),
            ...validateStep2(data),
        };
        if (!data.acknowledgeDisclaimer) {
            stepErrors.acknowledgeDisclaimer
                = 'You must acknowledge the analytical-only disclosure';
        }
        if (Object.keys(stepErrors).length) {
            setErrors(stepErrors);
            return;
        }

        setSubmitState({ status: 'loading', message: '' });
        try {
            const response = await fetch(`${API_CONFIG.baseURL}/waitlist`, {
                method: 'POST',
                headers: API_CONFIG.headers,
                body: JSON.stringify({
                    email: data.email,
                    fullName: data.fullName,
                    institution: data.institution,
                    aum: data.aum,
                    source: 'waitlist',
                }),
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                const msg = body.error
                    || body.message
                    || (Array.isArray(body.errors) && body.errors.map((er) => er.message).join(', '))
                    || `HTTP ${response.status}`;
                throw new Error(msg);
            }

            setSubmitState({
                status: 'success',
                message: body.message || "You're on the list. We'll be in touch.",
            });
        } catch (err) {
            console.error('Waitlist submission error:', err);
            setSubmitState({
                status: 'error',
                message: err.message || 'Submission failed. Please try again.',
            });
        }
    };

    if (submitState.status === 'success') {
        return (
            <>
                <SEO
                    title="Application Received — ChartSentinel"
                    description="Your waitlist application is in. We'll review and reach out."
                />
                <div className="min-h-screen pt-40 px-6 pb-24 relative z-10 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-xl bg-surface-dark/60 backdrop-blur-sm p-10 rounded-2xl border border-white/10 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center shadow-[0_0_30px_rgba(217,70,239,0.35)]"
                        >
                            <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </motion.div>
                        <h2 className="text-2xl md:text-3xl font-display font-semibold text-text-primary mb-3">
                            You're on the list.
                        </h2>
                        <p className="text-text-muted text-sm mb-8 leading-relaxed">
                            {submitState.message}
                        </p>
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/')}
                            className="px-8 py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold uppercase tracking-[0.12em] text-[11px] rounded-xl transition-all shadow-[0_0_30px_rgba(217,70,239,0.3)]"
                        >
                            Return Home
                        </motion.button>
                    </motion.div>
                </div>
            </>
        );
    }

    return (
        <>
            <SEO
                title="Waitlist — ChartSentinel"
                description="Apply for early access to ChartSentinel's institutional trading intelligence."
            />
            <div className="min-h-screen pt-40 px-6 pb-24 relative z-10 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-xl bg-surface-dark/60 backdrop-blur-sm p-8 md:p-10 rounded-2xl relative overflow-hidden border border-white/10"
                >
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
                        <motion.div
                            className="h-full bg-gradient-to-r from-primary to-primary-dark"
                            initial={{ width: '0%' }}
                            animate={{ width: `${(step / 3) * 100}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            style={{ boxShadow: '0 0 20px rgba(217, 70, 239, 0.5)' }}
                        />
                    </div>

                    {/* Header */}
                    <div className="mb-10 text-center border-b border-white/10 pb-8">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={`step-${step}`}
                            transition={{ duration: 0.3 }}
                        >
                            <h2 className="text-2xl md:text-3xl font-display font-semibold text-text-primary tracking-tight mb-2">
                                Applicant Screening
                            </h2>
                            <p className="text-text-muted text-[10px] uppercase tracking-[0.15em]">
                                {step === 1 && 'Personal Information'}
                                {step === 2 && 'Institutional Details'}
                                {step === 3 && 'Final Verification'}
                            </p>
                            <p className="text-text-muted text-[9px] mt-4 uppercase tracking-[0.12em]">
                                Step {step} of 3
                            </p>
                        </motion.div>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-6">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -30 }}
                                    transition={{ duration: 0.4 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-[0.12em] text-text-secondary font-semibold mb-3">
                                            Full Name
                                        </label>
                                        <input
                                            value={data.fullName}
                                            onChange={(e) => setField('fullName', e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-sm"
                                            placeholder="Enter your full name"
                                        />
                                        {errors.fullName && (
                                            <p className="text-red-400 text-[10px] mt-2 font-semibold">
                                                {errors.fullName}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-[0.12em] text-text-secondary font-semibold mb-3">
                                            Corporate Email
                                        </label>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setField('email', e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-sm"
                                            placeholder="name@institution.com"
                                        />
                                        {errors.email && (
                                            <p className="text-red-400 text-[10px] mt-2 font-semibold">
                                                {errors.email}
                                            </p>
                                        )}
                                    </div>
                                    <motion.button
                                        type="button"
                                        onClick={goToStep2}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full py-4 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold uppercase tracking-[0.12em] text-[10px] rounded-xl transition-all shadow-[0_0_30px_rgba(217,70,239,0.3)] hover:shadow-[0_0_40px_rgba(217,70,239,0.5)] flex items-center justify-center gap-2"
                                    >
                                        Continue
                                        <ArrowRightIcon className="w-4 h-4" />
                                    </motion.button>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -30 }}
                                    transition={{ duration: 0.4 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-[0.12em] text-text-secondary font-semibold mb-3">
                                            Institution Name
                                        </label>
                                        <input
                                            value={data.institution}
                                            onChange={(e) => setField('institution', e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-sm"
                                            placeholder="e.g., Citadel, Jane Street"
                                        />
                                        {errors.institution && (
                                            <p className="text-red-400 text-[10px] mt-2 font-semibold">
                                                {errors.institution}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-[0.12em] text-text-secondary font-semibold mb-3">
                                            Assets Under Management
                                        </label>
                                        <select
                                            value={data.aum}
                                            onChange={(e) => setField('aum', e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all appearance-none text-sm"
                                        >
                                            <option value="" className="bg-surface-dark">Select AUM Range</option>
                                            <option value="<10M" className="bg-surface-dark">&lt; $10M</option>
                                            <option value="10M-100M" className="bg-surface-dark">$10M - $100M</option>
                                            <option value="100M-1B" className="bg-surface-dark">$100M - $1B</option>
                                            <option value=">1B" className="bg-surface-dark">&gt; $1B</option>
                                        </select>
                                        {errors.aum && (
                                            <p className="text-red-400 text-[10px] mt-2 font-semibold">
                                                {errors.aum}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-4 mt-6">
                                        <motion.button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-1/3 py-4 bg-transparent border border-white/10 rounded-xl text-text-muted hover:text-text-primary hover:border-white/30 uppercase tracking-[0.12em] text-[10px] font-semibold transition-all"
                                        >
                                            Back
                                        </motion.button>
                                        <motion.button
                                            type="button"
                                            onClick={goToStep3}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-2/3 py-4 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold uppercase tracking-[0.12em] text-[10px] rounded-xl transition-all shadow-[0_0_30px_rgba(217,70,239,0.3)]"
                                        >
                                            Review
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -30 }}
                                    transition={{ duration: 0.4 }}
                                    className="space-y-6"
                                >
                                    <div className="p-6 bg-primary/5 rounded-xl border border-primary/25">
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0 shadow-[0_0_8px_#d946ef]" />
                                            <p className="text-sm text-text-secondary leading-relaxed">
                                                By submitting this application, you confirm that you represent a legitimate
                                                institutional trading entity and agree to our verification process.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2.5 text-primary text-[10px] uppercase tracking-[0.12em] font-semibold mt-4">
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#d946ef]"
                                            />
                                            <span>Secure End-to-End Transmission</span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 mt-4">
                                        <div className="flex items-center h-5">
                                            <input
                                                id="disclaimer"
                                                type="checkbox"
                                                checked={data.acknowledgeDisclaimer}
                                                onChange={(e) => setField('acknowledgeDisclaimer', e.target.checked)}
                                                className="w-4 h-4 bg-black/40 border-white/10 rounded text-primary focus:ring-primary"
                                            />
                                        </div>
                                        <label htmlFor="disclaimer" className="text-xs text-text-secondary leading-relaxed">
                                            I understand this service provides analytical insights only and does{' '}
                                            <strong className="text-text-primary">not</strong> provide investment advice.
                                        </label>
                                    </div>

                                    {(Object.keys(errors).length > 0 || submitState.status === 'error') && (
                                        <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/25">
                                            {submitState.status === 'error' && (
                                                <p className="text-red-400 text-[11px] mb-2">{submitState.message}</p>
                                            )}
                                            {Object.keys(errors).length > 0 && (
                                                <>
                                                    <p className="text-red-400 text-[10px] uppercase tracking-[0.12em] font-semibold mb-2">
                                                        Please complete all required fields:
                                                    </p>
                                                    <ul className="space-y-1">
                                                        {Object.entries(errors).map(([field, message]) => (
                                                            <li key={field} className="text-red-400 text-[10px]">• {message}</li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-4 mt-6">
                                        <motion.button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-1/3 py-4 bg-transparent border border-white/10 rounded-xl text-text-muted hover:text-text-primary hover:border-white/30 uppercase tracking-[0.12em] text-[10px] font-semibold transition-all"
                                        >
                                            Back
                                        </motion.button>
                                        <motion.button
                                            type="submit"
                                            disabled={submitState.status === 'loading' || !allFieldsValid()}
                                            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(217,70,239,0.5)' }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-2/3 py-4 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold uppercase tracking-[0.12em] text-[10px] rounded-xl transition-all shadow-[0_0_30px_rgba(217,70,239,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {submitState.status === 'loading' ? 'Submitting…' : 'Submit Application'}
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </motion.div>
            </div>
        </>
    );
}
