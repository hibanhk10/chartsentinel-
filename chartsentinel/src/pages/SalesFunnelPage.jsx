import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// STRIPE-INTEGRATION: re-enable when payment requirements are finalized.
// import stripePromise from '../lib/stripe';
import FunnelLayout from '../components/funnel/FunnelLayout';
import Step1Register from '../components/funnel/Step1Register';
import Step2Profile from '../components/funnel/Step2Profile';
import Step3Pricing from '../components/funnel/Step3Pricing';
import Step4Briefing from '../components/funnel/Step4Briefing';
import { useAuth } from '../contexts/AuthContext';

// Persist funnel progress across reloads / back-forward so accidental
// refreshes don't wipe Step 1-3 answers.
const STORAGE_KEY = 'chartsentinel.funnel.v1';

const readStored = () => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const SalesFunnelPage = () => {
    const stored = readStored();
    const [currentStep, setCurrentStep] = useState(stored?.currentStep || 1);
    const [funnelData, setFunnelData] = useState(stored?.funnelData || {});
    const navigate = useNavigate();
    const { register } = useAuth();

    // STRIPE-INTEGRATION: API_URL is currently unused because the Stripe
    // branch is disabled. Re-enable together with the block below.
    // const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    useEffect(() => {
        try {
            sessionStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ currentStep, funnelData })
            );
        } catch {
            /* storage full or disabled — fine, just loses persistence */
        }
    }, [currentStep, funnelData]);

    const clearStored = () => {
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch {
            /* ignore */
        }
    };

    const nextStep = (data) => {
        setFunnelData((prev) => ({ ...prev, ...data }));
        setCurrentStep((prev) => prev + 1);
        window.scrollTo(0, 0);
    };

    const prevStep = () => {
        setCurrentStep((prev) => Math.max(1, prev - 1));
        window.scrollTo(0, 0);
    };

    const completeFunnel = async (password) => {
        try {
            console.log('Completing funnel registration...', funnelData);

            // 1. Register User
            await register({
                name: funnelData.name,
                email: funnelData.email,
                password: password,
            });

            // 2. Payment step is disabled until Stripe requirements are ready.
            // All plans (free + paid) route straight to the dashboard for now.
            // Selected plan is still captured in funnelData.plan for later
            // backfill / manual provisioning.
            clearStored();
            navigate('/dashboard');

            // ────────────────────────────────────────────────────────────────
            // STRIPE-INTEGRATION (paid plans) — restore this block when
            // Stripe secret/publishable keys and price IDs are configured.
            // ────────────────────────────────────────────────────────────────
            // const user = response.user;
            // const plan = funnelData.plan; // 'pro' | 'ultimate' | undefined
            //
            // if (plan && (plan === 'pro' || plan === 'ultimate')) {
            //     console.log('Initiating checkout for plan:', plan);
            //
            //     const checkoutResponse = await fetch(`${API_URL}/payments/create-checkout-session`, {
            //         method: 'POST',
            //         headers: { 'Content-Type': 'application/json' },
            //         body: JSON.stringify({ plan, userId: user.id, email: user.email }),
            //     });
            //
            //     const session = await checkoutResponse.json();
            //     if (session.error) throw new Error(session.error);
            //
            //     const stripe = await stripePromise;
            //     const result = await stripe.redirectToCheckout({ sessionId: session.id });
            //     if (result.error) throw new Error(result.error.message);
            // } else {
            //     clearStored();
            //     navigate('/dashboard');
            // }
            // ────────────────────────────────────────────────────────────────
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Registration failed: ' + error.message);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <Step1Register onNext={nextStep} initialData={funnelData} />;
            case 2:
                return <Step2Profile onNext={nextStep} onPrev={prevStep} initialData={funnelData} />;
            case 3:
                return <Step3Pricing onNext={nextStep} onPrev={prevStep} />;
            case 4:
                return (
                    <Step4Briefing
                        onComplete={completeFunnel}
                        onPrev={prevStep}
                        initialEmail={funnelData.email}
                    />
                );
            default:
                return <Step1Register onNext={nextStep} initialData={funnelData} />;
        }
    };

    return (
        <FunnelLayout currentStep={currentStep} totalSteps={4}>
            {renderStep()}
        </FunnelLayout>
    );
};

export default SalesFunnelPage;
