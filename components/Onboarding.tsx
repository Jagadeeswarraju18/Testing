import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Check, Bell, Wallet, ArrowRight, CornerDownLeft,
    Sparkles, Lock, CreditCard, ChevronRight, X
} from 'lucide-react';
import { getCurrencySymbol, convertCurrency } from '../utils'; // Ensure convertCurrency is exported from utils
import { POPULAR_PROVIDERS } from '../constants';
import ServiceLogo from './ServiceLogo';
import { requestNotificationPermission } from '../services/notificationService';

// Animation Variants for "Premium" feel
const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 50 : -50,
        opacity: 0,
        scale: 0.95,
        filter: 'blur(10px)'
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 50 : -50,
        opacity: 0,
        scale: 0.95,
        filter: 'blur(10px)',
        transition: { duration: 0.2 }
    })
};

const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: (i: number) => ({
        y: 0,
        opacity: 1,
        transition: { delay: i * 0.05, type: "spring", stiffness: 300, damping: 20 }
    }),
    hover: {
        y: -5,
        scale: 1.02,
        boxShadow: "0px 10px 20px rgba(0,0,0,0.05)",
        borderColor: "rgba(99, 102, 241, 0.4)"
    },
    tap: { scale: 0.98 }
};

interface OnboardingProps {
    onComplete: (data: { currency: string, budget: number, selectedIds: string[] }) => void;
    rates?: Record<string, number>; // Pass rates for preview calculation
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, rates }) => {
    // State
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(0); // For slide animation
    const [currency, setCurrency] = useState('USD');
    const [budget, setBudget] = useState('1000');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [notificationsAllowed, setNotificationsAllowed] = useState(false);

    // Derived Data
    const totalPreview = useMemo(() => {
        const rawTotal = selectedIds.reduce((sum, id) => {
            const provider = POPULAR_PROVIDERS.find(p => p.id === id);
            return sum + (provider?.defaultAmount || 0);
        }, 0);

        // Convert if needed (assuming base USD for POPULAR_PROVIDERS)
        if (rates && currency !== 'USD') {
            return convertCurrency(rawTotal, 'USD', currency, rates);
        }
        return rawTotal;
    }, [selectedIds, currency, rates]);

    // Handlers
    const nextStep = () => {
        setDirection(1);
        setStep(prev => prev + 1);
    };

    const prevStep = () => {
        setDirection(-1);
        setStep(prev => prev - 1);
    };

    const toggleService = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(s => s !== id)
                : [...prev, id]
        );
    };

    const handleEnableNotifications = async () => {
        const granted = await requestNotificationPermission();
        if (granted) {
            setNotificationsAllowed(true);
            localStorage.setItem('spendyx_notifications', 'true');
        }
        nextStep(); // Auto advance on decision
    };

    const handleSkipNotifications = () => {
        localStorage.setItem('spendyx_notifications', 'false');
        nextStep();
    };

    const finish = () => {
        onComplete({
            currency,
            budget: parseInt(budget) || 1000,
            selectedIds
        });
    };

    // Step Rendering
    const steps = [
        // STEP 0: Welcome 🛡️
        {
            render: () => (
                <div className="flex flex-col items-center text-center h-full justify-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-200 mb-8"
                    >
                        <Sparkles size={40} fill="currentColor" className="text-white/90" />
                    </motion.div>

                    <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">
                        Track subscriptions.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            Stay in control.
                        </span>
                    </h1>

                    <p className="text-gray-500 text-lg max-w-xs mx-auto mb-10 leading-relaxed">
                        Never miss a renewal. Never overpay.<br />
                        Simple, secure, and smart.
                    </p>

                    <div className="space-y-3 w-full max-w-xs">
                        <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm border border-gray-100/50 rounded-2xl shadow-sm">
                            <div className="bg-emerald-100 p-2 rounded-full text-emerald-600"><Lock size={16} /></div>
                            <span className="text-sm text-gray-600 font-medium">No bank access required</span>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm border border-gray-100/50 rounded-2xl shadow-sm">
                            <div className="bg-emerald-100 p-2 rounded-full text-emerald-600"><Shield size={16} /></div>
                            <span className="text-sm text-gray-600 font-medium">Your data stays private</span>
                        </div>
                    </div>
                </div>
            ),
            bottom: (
                <button onClick={nextStep} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                    Get Started
                </button>
            )
        },

        // STEP 1: Currency 💱
        {
            title: "Usually pay with?",
            subtitle: "We'll format everything in your local currency.",
            render: () => (
                <div className="grid grid-cols-2 gap-4 mt-4">
                    {['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'BRL'].map((c, i) => (
                        <motion.button
                            key={c}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            whileHover="hover"
                            whileTap="tap"
                            onClick={() => { setCurrency(c); nextStep(); }}
                            className={`p-6 rounded-2xl border transition-all text-left relative overflow-hidden group ${currency === c
                                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 border-transparent text-white shadow-lg shadow-indigo-300'
                                : 'bg-white border-gray-100 text-gray-600 hover:border-indigo-100'
                                }`}
                        >
                            <span className={`text-3xl font-bold block mb-1 ${currency === c ? 'text-white' : 'text-gray-900'}`}>
                                {getCurrencySymbol(c)}
                            </span>
                            <span className={`text-sm font-medium opacity-80 ${currency === c ? 'text-indigo-100' : 'text-gray-400'}`}>
                                {c}
                            </span>

                            {/* Decorative Circle */}
                            {currency === c && (
                                <motion.div
                                    layoutId="selected-ring"
                                    className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-xl"
                                />
                            )}
                        </motion.button>
                    ))}
                </div>
            ),
            bottom: (
                <div className="space-y-3">
                    <p className="text-center text-xs text-gray-400 font-medium">
                        You can change this anytime in settings.
                    </p>
                    <button
                        onClick={nextStep}
                        className="w-full py-2 text-gray-400 font-semibold text-sm hover:text-gray-600"
                    >
                        Skip for now
                    </button>
                </div>
            )
        },

        // STEP 2: Quick Add ⚡
        {
            title: "Add what you use",
            subtitle: "Pick a few to get started. You can add more later.",
            render: () => (
                <div className="mt-2">
                    <div className="grid grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto p-1 pb-20 no-scrollbar">
                        {POPULAR_PROVIDERS.map((p, i) => {
                            const isSelected = selectedIds.includes(p.id);
                            return (
                                <motion.button
                                    key={p.id}
                                    custom={i}
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                    whileHover="hover"
                                    whileTap="tap"
                                    onClick={() => toggleService(p.id)}
                                    className={`flex flex-col items-center p-3 rounded-2xl border transition-all relative aspect-square justify-center ${isSelected
                                        ? 'bg-indigo-50 border-indigo-500 shadow-inner'
                                        : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
                                        }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-0.5 shadow-sm">
                                            <Check size={10} strokeWidth={3} />
                                        </div>
                                    )}
                                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden mb-3 border border-gray-50 shadow-sm">
                                        <ServiceLogo name={p.name} logoUrl={p.logoUrl} size={28} />
                                    </div>
                                    <span className={`text-[11px] font-bold text-center leading-tight truncate w-full ${isSelected ? 'text-indigo-700' : 'text-gray-600'
                                        }`}>
                                        {p.name}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            ),
            bottom: (
                <div className="space-y-3">
                    <button
                        onClick={nextStep}
                        className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2 ${selectedIds.length > 0
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                            }`}
                    >
                        Continue <span className="text-xs opacity-70 bg-black/10 px-2 py-0.5 rounded-full">{selectedIds.length}</span>
                    </button>
                    <button
                        onClick={nextStep}
                        className="w-full py-2 text-gray-400 font-semibold text-sm hover:text-gray-600"
                    >
                        Skip for now
                    </button>
                </div>
            )
        },

        // STEP 3: Preview (The "Aha" Moment) 🪄
        {
            title: "Your Overview",
            subtitle: "Here's what your monthly spend looks like so far.",
            render: () => (
                <div className="flex flex-col items-center justify-center h-full pb-10">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white shadow-2xl shadow-gray-400/50 relative overflow-hidden"
                    >
                        <div className="relative z-10 w-full px-6 py-6 bg-gray-900 rounded-[2.5rem] shadow-2xl text-white overflow-hidden">
                            {/* Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] opacity-100 z-0"></div>

                            {/* Content */}
                            <div className="relative z-10 flex flex-col items-center">
                                <span className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-4">Estimated Monthly</span>

                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-2xl font-medium text-indigo-300">{getCurrencySymbol(currency)}</span>
                                    <span className="text-6xl font-bold tracking-tighter text-white">
                                        {totalPreview.toFixed(0)}
                                    </span>
                                    <span className="text-xl text-indigo-300">.{(totalPreview % 1).toFixed(2).substring(2)}</span>
                                </div>

                                <div className="w-full grid grid-cols-2 gap-4">
                                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center">
                                        <span className="text-indigo-200 text-xs font-bold uppercase mb-1">Active Subs</span>
                                        <span className="text-2xl font-bold text-white">{selectedIds.length}</span>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center">
                                        <span className="text-indigo-200 text-xs font-bold uppercase mb-1">First Renewal</span>
                                        <span className="text-lg font-bold text-emerald-400">In 5 days</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <p className="text-center text-gray-500 text-sm mt-8 max-w-[260px]">
                        This is just a preview. You can add exact costs and dates next.
                    </p>
                </div>
            ),
            bottom: (
                <button onClick={nextStep} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-indigo-700 transition-all">
                    Looks Good
                </button>
            )
        },

        // STEP 4: Smart Reminders 🔔
        {
            title: "Never miss a beat",
            subtitle: "Get notified before renewals so you can decide to keep or cancel.",
            render: () => (
                <div className="flex flex-col items-center text-center justify-center h-full pb-10">
                    <div className="relative mb-10">
                        <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full animate-pulse"></div>
                        <motion.div
                            initial={{ rotate: -10 }}
                            animate={{ rotate: 10 }}
                            transition={{ repeat: Infinity, repeatType: "mirror", duration: 1.5, ease: "easeInOut" }}
                            className="relative bg-white p-6 rounded-[2.5rem] shadow-xl text-yellow-500"
                        >
                            <Bell size={64} fill="currentColor" />
                        </motion.div>

                        {/* Floating Tag */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="absolute -right-12 top-0 bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg"
                        >
                            Save Money
                        </motion.div>
                    </div>

                    <div className="space-y-4 bg-gray-50 p-6 rounded-3xl w-full">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <Check size={14} strokeWidth={3} />
                            </div>
                            <span className="text-sm font-medium text-gray-700">Remind me 3 days before</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <Check size={14} strokeWidth={3} />
                            </div>
                            <span className="text-sm font-medium text-gray-700">Alert on price hikes</span>
                        </div>
                    </div>
                </div>
            ),
            bottom: (
                <div className="space-y-3">
                    <button
                        onClick={handleEnableNotifications}
                        className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-black transition-all"
                    >
                        Enable in Profile Settings
                    </button>
                    <button
                        onClick={handleSkipNotifications}
                        className="w-full py-3 text-gray-400 font-semibold text-sm hover:text-gray-600"
                    >
                        Not now
                    </button>
                </div>
            )
        },

        // STEP 5: Budget 💰
        {
            title: "Set a monthly target",
            subtitle: "Optional. We'll just let you know if you cross it.",
            render: () => (
                <div className="flex flex-col justify-center h-full">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.05)] border border-gray-100 text-center">
                        <span className="text-gray-400 font-bold uppercase text-xs tracking-widest">Monthly Limit</span>
                        <div className="flex items-center justify-center gap-1 mt-2 mb-8">
                            <span className="text-3xl text-gray-300 font-medium">{getCurrencySymbol(currency)}</span>
                            <input
                                type="number"
                                value={budget}
                                onChange={e => setBudget(e.target.value)}
                                className="w-full min-w-[120px] text-5xl sm:text-6xl font-black text-gray-900 text-center focus:outline-none bg-transparent placeholder-gray-200"
                                placeholder="0"
                                autoFocus
                            />
                        </div>

                        {/* Presets */}
                        <div className="flex justify-center gap-2">
                            {['50', '100', '200', '500'].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => setBudget(amt)}
                                    className="px-4 py-2 rounded-xl bg-gray-50 text-gray-600 font-bold text-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                >
                                    {amt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ),
            bottom: (
                <div className="space-y-3">
                    <button onClick={nextStep} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-all">
                        Set Budget
                    </button>
                    <button onClick={nextStep} className="w-full py-2 text-gray-400 font-semibold text-sm">
                        Skip for now
                    </button>
                </div>
            )
        },

        // STEP 6: Done 🎉
        {
            title: "You're all set!",
            subtitle: null,
            render: () => (
                <div className="flex flex-col items-center justify-center text-center h-full">
                    <motion.div
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-200 mb-8"
                    >
                        <Check size={64} strokeWidth={4} />
                    </motion.div>

                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to roll.</h2>
                    <p className="text-gray-500 text-lg leading-relaxed max-w-xs">
                        We've set up your dashboard. Time to take control of your spending.
                    </p>
                </div>
            ),
            bottom: (
                <button onClick={finish} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group">
                    Go to Dashboard
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
            )
        }
    ];

    const currentStepData = steps[step];

    return (
        <div className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-[420px] bg-white h-[90vh] max-h-[850px] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative">

                {/* Header / Nav */}
                <div className="px-8 pt-8 flex justify-between items-center z-20">
                    {step > 0 && step < steps.length - 1 ? (
                        <button onClick={prevStep} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                            <CornerDownLeft size={20} />
                        </button>
                    ) : (
                        <div className="w-10" />
                    )}

                    {/* Progress Dots */}
                    {step > 0 && step < steps.length - 1 && (
                        <div className="flex gap-1.5">
                            {steps.slice(1, -1).map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        width: i === (step - 1) ? 24 : 6,
                                        opacity: i === (step - 1) ? 1 : 0.2
                                    }}
                                    className={`h-1.5 rounded-full bg-indigo-600`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Skip Button */}
                    {step < steps.length - 1 ? (
                        <button
                            onClick={finish}
                            className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-wide"
                        >
                            Skip
                        </button>
                    ) : (
                        <div className="w-10" />
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 px-8 relative flex flex-col overflow-y-auto no-scrollbar">
                    <AnimatePresence custom={direction} mode='wait'>
                        <motion.div
                            key={step}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="flex flex-col h-full pt-4"
                        >
                            {currentStepData.title && (
                                <div className="mb-6 text-center">
                                    <h2 className="text-2xl font-black text-gray-900 mb-2">{currentStepData.title}</h2>
                                    {currentStepData.subtitle && (
                                        <p className="text-gray-500 font-medium">{currentStepData.subtitle}</p>
                                    )}
                                </div>
                            )}

                            <div className="flex-1 relative">
                                {currentStepData.render()}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Action */}
                <div className="p-8 pt-0 z-20 bg-gradient-to-t from-white via-white to-transparent">
                    {currentStepData.bottom}
                </div>

            </div>
        </div>
    );
};

export default Onboarding;