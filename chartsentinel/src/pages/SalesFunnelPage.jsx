import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FunnelLayout from '../components/funnel/FunnelLayout';
import Step1Register from '../components/funnel/Step1Register';
import Step2Profile from '../components/funnel/Step2Profile';
import Step3Pricing from '../components/funnel/Step3Pricing';
import Step4Briefing from '../components/funnel/Step4Briefing';
import { useAuth } from '../contexts/AuthContext';

const SalesFunnelPage = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [funnelData, setFunnelData] = useState({});
    const navigate = useNavigate();

    const nextStep = (data) => {
        setFunnelData(prev => ({ ...prev, ...data }));
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const { register } = useAuth(); // Get register function from context

    const completeFunnel = async (password) => {
        try {
            console.log('Completing funnel registration...', funnelData);
            await register({
                name: funnelData.name,
                email: funnelData.email,
                password: password,
                // We might want to save other funnel data (phone, trading profile, plan) 
                // either in metadata or a separate profile update call.
                // For now, core auth is priority.
            });

            // Redirect happens automatically in register or we can force it here if needed
            // But register usually sets user state. 
            // The AuthContext might trigger a redirect or we do it here.
            navigate('/dashboard');
        } catch (error) {
            console.error("Registration failed:", error);
            // Handle error (maybe show toast or alert)
            alert("Registration failed: " + error.message);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <Step1Register onNext={nextStep} />;
            case 2:
                return <Step2Profile onNext={nextStep} onPrev={prevStep} />;
            case 3:
                return <Step3Pricing onNext={nextStep} onPrev={prevStep} />;
            case 4:
            case 4:
                return <Step4Briefing onComplete={completeFunnel} onPrev={prevStep} initialEmail={funnelData.email} />;
            default:
                return <Step1Register onNext={nextStep} />;
        }
    };

    return (
        <FunnelLayout currentStep={currentStep} totalSteps={4}>
            {renderStep()}
        </FunnelLayout>
    );
};

export default SalesFunnelPage;
