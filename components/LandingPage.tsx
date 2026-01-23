import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Shield, Star, Zap, ChevronRight, Play, X, Download, Smartphone } from 'lucide-react';
import { Link } from './Link'; // Assuming simple link component or use href

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const LandingPage: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [isInstallable, setIsInstallable] = useState(false);

    const images = [
        "/showcase/slide1.jpg", // Calendar
        "/showcase/slide2.jpg", // Settings
        "/showcase/slide3.jpg", // Voice
        "/showcase/slide4.jpg", // Subs List
        "/showcase/slide5.jpg", // Dashboard
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }, 4000); // Change slide every 4 seconds
        return () => clearInterval(timer);
    }, []);

    // PWA Install Prompt Listener
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setIsInstallable(false);
            }
            setShowInstallModal(false);
        } else {
            // Show manual install instructions
            setShowInstallModal(true);
        }
    };

    const handleWebAppButtonClick = () => {
        if (isInstallable && deferredPrompt) {
            handleInstallClick();
        } else {
            setShowInstallModal(true);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 overflow-x-hidden">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/Spendyx.png" alt="Spendyx Logo" className="w-10 h-10 object-contain" />
                        <span className="font-bold text-xl tracking-tight">Spendyx</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
                        <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How it Works</a>
                        <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
                    </nav>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onGetStarted}
                            className="hidden md:block text-sm font-semibold text-gray-600 hover:text-gray-900"
                        >
                            Log in
                        </button>
                        <button
                            onClick={onGetStarted}
                            className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-gray-200"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 flex flex-col lg:grid lg:grid-cols-2 gap-12 items-center">

                    {/* App Showcase Animation - 3D Rotating Carousel */}
                    <div className="order-2 lg:order-2 relative h-[400px] lg:h-[550px] w-full flex items-center justify-center lg:justify-end" style={{ perspective: '1000px' }}>
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100/50 to-purple-100/50 rounded-full blur-3xl opacity-60 transform translate-x-1/4 scale-75"></div>

                        {/* 3D Circular Rotating Carousel */}
                        <motion.div
                            className="relative w-[260px] h-[520px] md:w-[300px] md:h-[600px]" // Reduced container size
                            style={{
                                transformStyle: 'preserve-3d',
                            }}
                            animate={{
                                rotateY: currentImageIndex * -72 // 360/5 = 72 degrees per image
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 50,
                                damping: 20,
                                mass: 1.2
                            }}
                        >
                            {images.map((image, index) => {
                                return (
                                    <motion.div
                                        key={index}
                                        className="absolute w-[150px] h-[300px] md:w-[220px] md:h-[440px] bg-gray-900 rounded-[1.8rem] md:rounded-[2.5rem] border-[3px] md:border-4 border-gray-900 shadow-2xl overflow-hidden custom-3d-card"
                                        style={{
                                            transformStyle: 'preserve-3d',
                                            // Reduced radius to 220px for tighter circle on mobile
                                            transform: `rotateY(${index * 72}deg) translateZ(220px)`,
                                            backfaceVisibility: 'hidden',
                                            left: '50%',
                                            top: '15%',
                                            marginLeft: '-75px', // Half of 150
                                        }}
                                    >
                                        {/* Solid white base */}
                                        <div className="absolute inset-0 bg-white z-0"></div>

                                        {/* Dynamic Island */}
                                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-5 bg-black rounded-full z-30"></div>

                                        {/* Screen Content */}
                                        <div className="absolute inset-0 w-full h-full bg-white z-10">
                                            <img
                                                src={image}
                                                className="w-full h-full object-fill"
                                                alt={`App Screen ${index + 1}`}
                                            />
                                        </div>

                                        {/* Shine Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none z-20"></div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>

                        {/* Floating Elements/Badges */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            className="absolute top-[15%] left-0 md:-left-12 bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl z-40 max-w-[160px] md:max-w-[180px] pointer-events-none"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                                    <div className="w-5 h-5 md:w-6 md:h-6 bg-red-500 rounded text-[8px] md:text-[10px] flex items-center justify-center text-white font-bold">N</div>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 text-xs md:text-sm">Netflix</p>
                                    <p className="text-[10px] md:text-xs text-gray-500">$15.99/mo</p>
                                </div>
                            </div>
                            <div className="text-[10px] md:text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md inline-block">
                                Payment Due Tomorrow!
                            </div>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                            className="absolute bottom-[15%] right-0 md:-right-8 bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl z-40 flex items-center gap-3 pointer-events-none"
                        >
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <Check size={16} className="stroke-[3px]" />
                            </div>
                            <div>
                                <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-wider">Total Savings</p>
                                <p className="text-lg md:text-xl font-black text-gray-900">$1,240</p>
                            </div>
                        </motion.div>

                        {/* Carousel Indicators */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-50">
                            {images.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentImageIndex(index)}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentImageIndex
                                        ? 'bg-indigo-600 w-6'
                                        : 'bg-gray-300 hover:bg-gray-400'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Text Content */}
                    <div className="order-1 lg:order-1 max-w-2xl relative z-10 text-center lg:text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-4 md:mb-6">
                                <Star size={12} className="fill-indigo-700" />
                                <span>v1.0 is Live</span>
                            </div>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.1] mb-4 md:mb-6 tracking-tight"
                        >
                            Never pay for subscriptions you forgot to cancel.
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="text-base sm:text-lg md:text-xl text-gray-500 mb-0 lg:mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0"
                        >
                            Track, manage, and optimize your subscriptions in one place. Get alerted before you pay. Save your wallet from the monthly drain.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >

                            {/* Buttons - Desktop Only */}
                            <div className="hidden lg:flex flex-col gap-4">
                                <div className="flex flex-row gap-4 justify-start">
                                    <button
                                        onClick={() => window.open('https://play.google.com/store/apps/details?id=com.jwr.spendyx', '_blank')}
                                        className="px-6 py-3.5 bg-black text-white text-base font-bold rounded-xl shadow-xl shadow-gray-200 hover:bg-gray-900 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 group border border-gray-800"
                                    >
                                        <svg viewBox="0 0 512 512" className="w-7 h-7 fill-current text-white shrink-0">
                                            <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
                                        </svg>
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-[10px] uppercase font-medium text-gray-400">Get it on</span>
                                            <span className="text-sm font-bold whitespace-nowrap">Google Play</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={handleWebAppButtonClick}
                                        className="px-6 py-3.5 bg-[#007AFF] text-white text-base font-bold rounded-xl shadow-xl shadow-blue-200 hover:bg-[#0066CC] transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3"
                                    >
                                        <img
                                            src="/apple-logo.png"
                                            alt="Apple Logo"
                                            className="w-6 h-6 object-contain brightness-0 invert shrink-0"
                                        />
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-[10px] uppercase font-medium text-blue-100">iOS / Desktop</span>
                                            <span className="text-sm font-bold whitespace-nowrap">Use Web App</span>
                                        </div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-start gap-2 text-sm text-gray-500 font-medium ml-1">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#007AFF]"></span>
                                    </span>
                                    <span>iOS App Coming Soon</span>
                                </div>

                                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 font-medium">
                                    <div className="flex items-center gap-1">
                                        <Check size={16} className="text-green-500" />
                                        <span>No credit card required</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Check size={16} className="text-green-500" />
                                        <span>Free plan forever</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Buttons - Mobile Only (Order 3) */}
                    <motion.div
                        className="order-3 lg:hidden w-full text-center"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                    >
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-row gap-2 justify-center flex-wrap">
                                <button
                                    onClick={() => window.open('https://play.google.com/store/apps/details?id=com.jwr.spendyx', '_blank')}
                                    className="flex-1 px-4 py-3.5 bg-black text-white text-base font-bold rounded-xl shadow-xl shadow-gray-200 hover:bg-gray-900 transition-all flex items-center justify-center gap-2 group border border-gray-800"
                                >
                                    <svg viewBox="0 0 512 512" className="w-6 h-6 fill-current text-white shrink-0">
                                        <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
                                    </svg>
                                    <div className="flex flex-col items-start leading-none min-w-[80px]">
                                        <span className="text-[9px] uppercase font-medium text-gray-400">Get it on</span>
                                        <span className="text-xs font-bold whitespace-nowrap">Google Play</span>
                                    </div>
                                </button>

                                <button
                                    onClick={handleWebAppButtonClick}
                                    className="flex-1 px-4 py-3.5 bg-[#007AFF] text-white text-base font-bold rounded-xl shadow-xl shadow-blue-200 hover:bg-[#0066CC] transition-all flex items-center justify-center gap-2"
                                >
                                    <img
                                        src="/apple-logo.png"
                                        alt="Apple Logo"
                                        className="w-5 h-5 object-contain brightness-0 invert shrink-0"
                                    />
                                    <div className="flex flex-col items-start leading-none min-w-[80px]">
                                        <span className="text-[9px] uppercase font-medium text-blue-100">iOS / Desktop</span>
                                        <span className="text-xs font-bold whitespace-nowrap">Use Web App</span>
                                    </div>
                                </button>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#007AFF]"></span>
                                </span>
                                <span>iOS App Coming Soon</span>
                            </div>

                            <div className="flex items-center justify-center gap-4 text-sm text-gray-500 font-medium">
                                <div className="flex items-center gap-1">
                                    <Check size={16} className="text-green-500" />
                                    <span>No credit card required</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Check size={16} className="text-green-500" />
                                    <span>Free plan forever</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-12 md:py-24 bg-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything you need to regain control</h2>
                        <p className="text-base md:text-lg text-gray-500">Spendyx is more than just a list. It's an intelligent financial assistant for your subscriptions.</p>
                    </div>

                    <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-8 overflow-x-auto md:overflow-visible pb-8 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory hide-scrollbar">
                        {[
                            { title: "Smart Alerts", desc: "Get notified days before a renewal so you can cancel in time.", icon: "🔔", color: "bg-amber-100 text-amber-600" },
                            { title: "Price Change Detection", desc: "We spot price hikes and alert you instantly. No more surprises.", icon: "📈", color: "bg-red-100 text-red-600" },
                            { title: "Voice Input", desc: "Just say 'Add Netflix $15' and we handle the rest.", icon: "🎙️", color: "bg-blue-100 text-blue-600" },
                            { title: "Currency Converter", desc: "Travel often? We auto-convert all prices to your home currency.", icon: "💱", color: "bg-green-100 text-green-600" },
                            { title: "Usage Tracking", desc: "Mark subs as 'Used' to see if you're actually getting value.", icon: "📊", color: "bg-indigo-100 text-indigo-600" },
                            { title: "Offline First", desc: "Works perfectly without internet. Your data stays on your device.", icon: "⚡", color: "bg-gray-100 text-gray-600" },
                        ].map((feature, i) => (
                            <div key={i} className="min-w-[280px] md:min-w-0 p-6 md:p-8 rounded-3xl bg-gray-50 border border-gray-100 md:hover:shadow-lg transition-shadow snap-center">
                                <div className={`w-12 h-12 md:w-14 md:h-14 ${feature.color} rounded-2xl flex items-center justify-center text-xl md:text-2xl mb-4 md:mb-6`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">{feature.title}</h3>
                                <p className="text-gray-500 leading-relaxed text-sm">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                            <img src="/Spendyx.png" alt="Spendyx Logo" className="w-8 h-8 object-contain" />
                            <span className="font-bold text-lg">Spendyx</span>
                        </div>
                        <p className="text-gray-400 text-sm">© 2026 Spendyx Inc. All rights reserved.</p>
                    </div>
                    <div className="flex gap-8 text-sm text-gray-400">
                        <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        <button onClick={onGetStarted} className="hover:text-white transition-colors">Sign In</button>
                    </div>
                </div>
            </footer>

            {/* PWA Install Modal */}
            <AnimatePresence>
                {showInstallModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowInstallModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md p-6 pb-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Install Spendyx</h3>
                                <button
                                    onClick={() => setShowInstallModal(false)}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-20 h-20 mb-4 rounded-2xl overflow-hidden shadow-lg">
                                    <img src="/Spendyx.png" alt="Spendyx" className="w-full h-full object-contain" />
                                </div>
                                <p className="text-gray-600 text-sm">
                                    Install Spendyx on your device for the best experience — works offline, fast, and always accessible.
                                </p>
                            </div>

                            {isInstallable ? (
                                <button
                                    onClick={handleInstallClick}
                                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-3"
                                >
                                    <Download size={20} />
                                    Install App
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                            <Smartphone size={16} />
                                            On iOS / Safari:
                                        </p>
                                        <ol className="text-sm text-gray-600 space-y-1 ml-6">
                                            <li>1. Tap the <strong>Share</strong> button</li>
                                            <li>2. Select <strong>"Add to Home Screen"</strong></li>
                                            <li>3. Tap <strong>Add</strong></li>
                                        </ol>
                                    </div>
                                    <button
                                        onClick={onGetStarted}
                                        className="w-full py-4 bg-[#007AFF] text-white font-bold rounded-xl hover:bg-[#0066CC] transition-colors"
                                    >
                                        Continue in Browser
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LandingPage;
