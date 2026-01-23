import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check } from 'lucide-react';

interface TourStep {
    title: string;
    description: string;
    position: 'center' | 'bottom' | 'top';
}

const STEPS: TourStep[] = [
    {
        title: "Welcome to Spendyx! 👋",
        description: "Your new command center for tracking subscriptions. Let's show you around.",
        position: 'center'
    },
    {
        title: "Track Your Spend 💸",
        description: "Your monthly total and remaining budget are always visible at the top.",
        position: 'center'
    },
    {
        title: "Add Subscriptions ➕",
        description: "Tap the big '+' button to add new subscriptions manually or by scanning.",
        position: 'bottom'
    },
    {
        title: "Switch Workspaces 🏢",
        description: "Use the top selector to switch between Personal and Business modes.",
        position: 'top'
    }
];

interface FeatureTourProps {
    userId?: string;
}

export const FeatureTour: React.FC<FeatureTourProps> = ({ userId }) => {
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const key = `spendyx_feature_tour_seen_${userId}`;
        const hasSeenTour = localStorage.getItem(key);

        if (!hasSeenTour) {
            // Small delay to ensure UI is ready
            const timer = setTimeout(() => setIsVisible(true), 500);
            return () => clearTimeout(timer);
        }
    }, [userId]);

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        if (userId) {
            localStorage.setItem(`spendyx_feature_tour_seen_${userId}`, 'true');
        }
    };

    if (!isVisible) return null;

    const currentStep = STEPS[step];

    // Fix for Tailwind dynamic classes not being detected
    const getPositionClass = (pos: 'center' | 'bottom' | 'top') => {
        switch (pos) {
            case 'top': return 'justify-start pt-24';
            case 'bottom': return 'justify-end pb-24';
            case 'center':
            default: return 'justify-center';
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[60] flex flex-col pointer-events-auto font-sans">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={handleClose}
                    />
                    <div className={`flex-1 flex flex-col items-center ${getPositionClass(currentStep.position)} p-6`}>
                        <motion.div
                            key={step}
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: -20 }}
                            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full relative z-50 text-center"
                        >
                            {/* Top Arrow (for 'bottom' position - pointing UP to element above not needed as we place card at bottom) 
                                Wait, if position is 'bottom', card is at bottom, so it points DOWN to the element below?
                                Actually:
                                'bottom' -> Points to Add Button (Bottom Center) -> Arrow should be at BOTTOM of card pointing DOWN.
                                'top' -> Points to Workspace Switcher (Top Left/Center) -> Arrow should be at TOP of card pointing UP.
                            */}

                            {/* Arrow Pointing Up (for Top position) */}
                            {currentStep.position === 'top' && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rotate-45 transform" />
                            )}

                            <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                                {step + 1}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{currentStep.title}</h3>
                            <p className="text-gray-500 mb-8 leading-relaxed text-sm">{currentStep.description}</p>
                            <div className="flex items-center justify-between">
                                <div className="flex gap-1">
                                    {STEPS.map((_, i) => (
                                        <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                                    ))}
                                </div>
                                <button onClick={handleNext} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-black transition-colors flex items-center gap-2">
                                    {step === STEPS.length - 1 ? 'Got it' : 'Next'}
                                    {step === STEPS.length - 1 ? <Check size={16} /> : <ChevronRight size={16} />}
                                </button>
                            </div>

                            {/* Arrow Pointing Down (for Bottom position) */}
                            {currentStep.position === 'bottom' && (
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rotate-45 transform" />
                            )}
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};
