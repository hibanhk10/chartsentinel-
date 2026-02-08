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
    /* eslint-disable no-unused-vars */
    // const { user } = useAuth(); // Can use this to associate data if user is already logged in
    /* eslint-enable no-unused-vars */

    const nextStep = (data) => {
        setFunnelData(prev => ({ ...prev, ...data }));
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const completeFunnel = () => {
        console.log('Funnel Complete:', funnelData);
        // Here you would typically submit the final data or handle the subscription checkout
        // For now, we redirect to dashboard as requested in general flow
        navigate('/dashboard');
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
                return <Step4Briefing onComplete={completeFunnel} onPrev={prevStep} />;
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
