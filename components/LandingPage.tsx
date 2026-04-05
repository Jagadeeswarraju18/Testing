import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Shield, Star, Zap, ChevronRight, Play, X, Download, Smartphone, Bell, PieChart, Layers, Search, Calendar, Mail, Loader2, TrendingDown, Sparkles, LayoutDashboard, ShieldCheck, FileText, ExternalLink } from 'lucide-react';
import { Link } from './Link'; // Assuming simple link component or use href
import { supabase } from '../lib/supabase';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const XBrandIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25h6.827l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const LandingPage: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [isInstallable, setIsInstallable] = useState(false);

    // iOS Waitlist State
    const [showWaitlistModal, setShowWaitlistModal] = useState(false);
    const [waitlistEmail, setWaitlistEmail] = useState('');
    const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
    const [waitlistMessage, setWaitlistMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const images = [
        "/showcase/App Icon 1.jpg",
        "/showcase/App Icon 2.jpg",
        "/showcase/App Icon 3.jpg",
        "/showcase/App Icon 4.jpg",
        "/showcase/App Icon 5.jpg",
        "/showcase/App Icon 6.jpg",
        "/showcase/App Icon 7.jpg",
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }, 4000); // Change slide every 4 seconds
        return () => clearInterval(timer);
    }, [images.length]);

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

    // Handle iOS Waitlist Submission
    const handleJoinWaitlist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!waitlistEmail.trim()) return;

        setIsSubmittingWaitlist(true);
        setWaitlistMessage(null);

        try {
            const { data, error } = await supabase.functions.invoke('join-ios-waitlist', {
                body: { email: waitlistEmail.trim() }
            });

            if (error) throw error;

            if (data?.success) {
                setWaitlistMessage({ type: 'success', text: data.message || 'You\'re on the list!' });
                setWaitlistEmail('');
            } else {
                setWaitlistMessage({ type: 'error', text: data?.error || 'Something went wrong' });
            }
        } catch {
            setWaitlistMessage({ type: 'error', text: 'Failed to join waitlist. Please try again.' });
        } finally {
            setIsSubmittingWaitlist(false);
        }
    };

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Dynamic measurements
    const count = images.length;
    const itemWidth = isMobile ? 160 : 220;
    const gap = isMobile ? 20 : 40;
    // Calculate radius to fit all items in a circle without too much overlap
    // Circumference = count * (itemWidth + gap)
    // Radius = Circumference / (2 * PI)
    const radius = Math.round(((itemWidth + gap) * count) / (2 * Math.PI));
    const anglePerItem = 360 / count;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 overflow-x-hidden">
            {/* Header */}
            <header className="sticky top-0 z-50 px-4 md:px-6 pt-2 md:pt-5 transition-all">
                <div className="max-w-[1280px] mx-auto">
                    <div className="h-14 md:h-[76px] flex items-center justify-between gap-4 rounded-full border border-gray-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-4 md:px-6">
                        <div className="flex items-center gap-2 md:gap-3 shrink-0">
                            <img src="/Spendyx.png" alt="Spendyx Logo" className="w-8 h-8 md:w-11 md:h-11 object-contain" />
                            <span className="font-black text-xl md:text-3xl tracking-tight leading-none text-gray-900">Spendyx</span>
                        </div>

                        <nav className="hidden md:flex items-center gap-1 p-1.5 rounded-full bg-gray-50 border border-gray-100 text-[14px] font-semibold text-gray-600">
                            <a href="#features" className="px-5 py-2 rounded-full hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all border border-transparent hover:border-gray-100">Features</a>
                            <a href="#how-it-works" className="px-5 py-2 rounded-full hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all border border-transparent hover:border-gray-100">How it works</a>
                            <a href="#comparison" className="px-5 py-2 rounded-full hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all border border-transparent hover:border-gray-100">Why Spendyx</a>
                            <a href="#contact" className="px-5 py-2 rounded-full hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all border border-transparent hover:border-gray-100">Contact</a>
                        </nav>

                        <button
                            onClick={onGetStarted}
                            className="px-4 py-2 md:px-6 md:py-2.5 bg-gray-900 text-white text-[12px] md:text-sm font-bold rounded-full hover:bg-gray-800 transition-all shadow-md"
                        >
                            Sign In
                        </button>
                    </div>

                    <nav className="md:hidden mt-2 p-1 rounded-full border border-gray-200 bg-white shadow-lg flex items-center gap-1 overflow-x-auto no-scrollbar text-[12px] font-medium text-gray-600">
                        <a href="#features" className="whitespace-nowrap px-3 py-1.5 rounded-full hover:bg-gray-50 hover:text-gray-900 transition-colors">Features</a>
                        <a href="#how-it-works" className="whitespace-nowrap px-3 py-1.5 rounded-full hover:bg-gray-50 hover:text-gray-900 transition-colors">How it works</a>
                        <a href="#comparison" className="whitespace-nowrap px-3 py-1.5 rounded-full hover:bg-gray-50 hover:text-gray-900 transition-colors">Why Spendyx</a>
                        <a href="#contact" className="whitespace-nowrap px-3 py-1.5 rounded-full hover:bg-gray-50 hover:text-gray-900 transition-colors">Contact</a>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-10 pb-8 lg:pt-12 lg:pb-32 overflow-hidden">
                <div className="max-w-[1400px] mx-auto px-6 flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-12 items-center">

                    {/* App Showcase Animation - 3D Rotating Carousel */}
                    <div className="order-2 lg:order-2 relative h-[380px] lg:h-[550px] mt-0 lg:mt-0 w-full flex items-center justify-center lg:justify-center" style={{ perspective: '1200px' }}>
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100/50 to-purple-100/50 rounded-full blur-3xl opacity-60 transform translate-x-1/4 scale-75"></div>

                        {/* 3D Circular Rotating Carousel */}
                        <motion.div
                            className="relative w-[280px] h-[360px] md:w-[300px] md:h-[600px]"
                            style={{
                                transformStyle: 'preserve-3d',
                            }}
                            animate={{
                                rotateY: currentImageIndex * -anglePerItem // Dynamic rotation
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 80,
                                damping: 20,
                                mass: 1
                            }}
                        >
                            {images.map((image, i) => {
                                return (
                                    <motion.div
                                        key={i}
                                        className="absolute w-[130px] h-[260px] md:w-[220px] md:h-[440px] bg-gray-900 rounded-[1.8rem] md:rounded-[2.5rem] border-[3px] md:border-4 border-gray-900 shadow-2xl overflow-hidden custom-3d-card"
                                        style={{
                                            transformStyle: 'preserve-3d',
                                            transform: `rotateY(${i * anglePerItem}deg) translateZ(${radius}px)`,
                                            backfaceVisibility: 'hidden', // IMPORTANT: Hide back of cards => clear look
                                            left: '50%',
                                            top: '15%',
                                            marginLeft: isMobile ? '-65px' : '-110px', // Center based on width
                                        }}

                                    // Optional: Fade out non-active items slightly?
                                    // Hard to know "which" is active purely by index in a rotation without calculating angles.
                                    // Let's stick to the physical spacing fix first.
                                    >
                                        {/* Solid white base */}
                                        <div className="absolute inset-0 bg-white z-0"></div>

                                        {/* Small Dynamic Island */}
                                        <div className="absolute top-1.5 md:top-2 left-1/2 -translate-x-1/2 w-10 md:w-12 h-2.5 md:h-3 bg-black rounded-full z-30"></div>

                                        {/* Screen Content - edge to edge display */}
                                        <div className="absolute inset-0 w-full h-full overflow-hidden rounded-[1.5rem] md:rounded-[2.2rem]">
                                            <img
                                                src={image}
                                                className="w-full h-full object-cover"
                                                alt={`App Screen ${i + 1}`}
                                                style={{
                                                    imageRendering: 'auto',
                                                    WebkitBackfaceVisibility: 'hidden',
                                                    backfaceVisibility: 'hidden',
                                                    transform: 'translateZ(0)',
                                                }}
                                                loading="eager"
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
                            className="absolute top-[10%] left-0 md:-left-12 bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl z-40 max-w-[160px] md:max-w-[180px] pointer-events-none"
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
                            className="absolute bottom-[10%] right-0 md:-right-8 bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl z-40 flex items-center gap-3 pointer-events-none"
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

                    </div>

                    {/* Text Content */}
                    <div className="order-1 lg:order-1 max-w-2xl relative z-10 text-center lg:text-left self-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2 md:mb-6">
                                <Star size={12} className="fill-indigo-700" />
                                <span>v1.0 is Live</span>
                            </div>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-gray-900 leading-[1.1] mb-2 md:mb-6 tracking-tight max-w-[120%]"
                        >
                            Never pay for subscriptions you forgot to cancel.
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="text-base sm:text-lg md:text-xl text-gray-500 mb-4 lg:mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0"
                        >
                            Get notified before renewals and stop wasting money.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="hidden lg:flex mb-4 flex-col items-center lg:items-start gap-2"
                        >
                            {[
                                "Auto renewal reminders",
                                "Monthly spend analytics",
                                "Category-wise breakdown",
                                "Identify unused subscriptions",
                                "Calendar view of payments"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-gray-700 font-medium text-sm sm:text-base">
                                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                        <Check size={12} className="text-green-600 stroke-[3px]" />
                                    </div>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </motion.div>


                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                        >
                            {/* Buttons - Desktop Only */}
                            <div className="hidden lg:flex flex-col gap-4">
                                <div className="flex flex-row gap-4 justify-start">
                                    <button
                                        onClick={() => window.open('https://play.google.com/store/apps/details?id=com.jwr.spendyx', '_blank')}
                                        className="px-6 py-3.5 bg-black text-white text-base font-bold rounded-xl shadow-xl shadow-gray-200 hover:bg-gray-900 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 group border border-gray-800 min-w-[200px]"
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
                                        className="px-6 py-3.5 bg-[#007AFF] text-white text-base font-bold rounded-xl shadow-xl shadow-blue-200 hover:bg-[#0066CC] transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 min-w-[200px]"
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

                                    <button
                                        onClick={() => setShowWaitlistModal(true)}
                                        className="px-6 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-base font-bold rounded-xl shadow-xl shadow-purple-200 hover:from-purple-600 hover:to-pink-600 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 min-w-[200px]"
                                    >
                                        <Bell size={24} className="shrink-0" />
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-[10px] uppercase font-medium text-purple-100">iOS Native</span>
                                            <span className="text-sm font-bold whitespace-nowrap">Join Waitlist</span>
                                        </div>
                                    </button>
                                </div>

                                <div className="mt-4 text-sm text-gray-500 font-medium flex items-center gap-2">
                                    <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">New</span>
                                    <span>Beta users saved $450 on average</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Buttons - Mobile Only (Order 3) - Restored below carousel */}
                    <motion.div
                        className="order-3 lg:hidden w-full text-center mt-2 relative z-20"
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
                                <span className="text-gray-400">•</span>
                                <button
                                    onClick={() => setShowWaitlistModal(true)}
                                    className="text-[#007AFF] hover:underline font-semibold"
                                >
                                    Join Waitlist
                                </button>
                            </div>


                        </div>
                    </motion.div>

                    {/* Feature Bullets - Mobile Only (Order 4) - Moved below buttons */}
                    <motion.div
                        className="order-4 lg:hidden w-full mt-6 px-4"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                    >
                        <div className="grid grid-cols-2 gap-3 px-2 max-w-sm mx-auto text-left">
                            {[
                                { text: "Renewal reminders", icon: <Bell size={14} className="text-indigo-600" /> },
                                { text: "Spend analytics", icon: <PieChart size={14} className="text-purple-600" /> },
                                { text: "Categories", icon: <Layers size={14} className="text-blue-600" /> },
                                { text: "Find unused subs", icon: <Search size={14} className="text-orange-600" /> },
                                { text: "Payment calendar", icon: <Calendar size={14} className="text-pink-600" /> }
                            ].map((item, i) => (
                                <div key={i} className={`flex items-center gap-2 text-gray-700 font-medium text-xs ${i === 4 ? 'col-span-2 justify-center' : ''}`}>
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 shadow-sm border border-gray-100">
                                        {item.icon}
                                    </div>
                                    <span>{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section >

            {/* How It Works Section */}
            < section id="how-it-works" className="py-16 md:py-24 bg-white relative" >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6">How it works</h2>
                        <p className="text-lg text-gray-500">Take control in 3 simple steps.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 md:gap-12 relative z-10 text-center">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gray-100 -z-10"></div>

                        {[
                            { title: "Add Subscriptions", desc: "Connect email to auto-import.", icon: "📝" },
                            { title: "Get Reminders", desc: "We notify before you pay.", icon: "🔔" },
                            { title: "Save Money", desc: "Spot what you don't use.", icon: "💰" }
                        ].map((step, i) => (
                            <div key={i} className="flex flex-col items-center group">
                                <div className="relative mb-3 md:mb-6">
                                    <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-2xl md:rounded-3xl border-2 border-gray-100 shadow-xl flex items-center justify-center text-2xl md:text-4xl group-hover:scale-110 transition-transform duration-300 relative z-10">
                                        {step.icon}
                                    </div>
                                    <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs md:text-base border-2 md:border-4 border-white shadow-md z-20">
                                        {i + 1}
                                    </div>
                                </div>
                                <h3 className="text-xs md:text-xl font-bold text-gray-900 mb-1 md:mb-3 leading-tight">{step.title}</h3>
                                <p className="text-[10px] md:text-base text-gray-500 leading-tight max-w-[100px] md:max-w-xs">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* Comparison Section */}
            < section id="comparison" className="py-16 md:py-24 bg-gray-50" >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div className="order-2 lg:order-1">
                            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
                                Stop using Excel sheets & Sticky notes.
                            </h2>
                            <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                                Manual tracking is tedious, prone to errors, and doesn't alert you when it matters. Spendyx does the heavy lifting for you.
                            </p>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 shrink-0">
                                        <X size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Manual Excel Tracking</p>
                                        <p className="text-sm text-gray-500">Requires constant updating, no alerts.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-lg border border-indigo-100 relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                        <Check size={20} className="stroke-[3px]" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Spendyx Automation</p>
                                        <p className="text-sm text-gray-500">Auto-renewals, notifications, insights.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2 flex justify-center">
                            {/* Abstract Visual Representation of Chaos vs Order */}
                            <div className="relative w-full max-w-md aspect-square bg-white rounded-3xl shadow-2xl p-8 flex flex-col justify-between overflow-hidden">
                                <div className="absolute top-0 right-0 p-32 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>

                                <div className="relative z-10 h-full flex items-center justify-center">
                                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-xl w-full">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">February 2026</h4>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl font-black text-gray-900">$1,240</span>
                                                    <span className="text-xs font-bold text-gray-400">Total</span>
                                                </div>
                                            </div>
                                            <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg flex items-center gap-1">
                                                <TrendingDown size={14} />
                                                <span>12% saved</span>
                                            </div>
                                        </div>

                                        {/* Chart/Bars */}
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                                        Entertainment
                                                    </span>
                                                    <span>$450</span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-purple-500 w-[65%] rounded-full"></div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                        Software & SaaS
                                                    </span>
                                                    <span>$290</span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 w-[42%] rounded-full"></div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                                        Utilities
                                                    </span>
                                                    <span>$180</span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-orange-500 w-[30%] rounded-full"></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer/Action */}
                                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                                            <span className="text-gray-400 font-medium">4 subscriptions cancelled</span>
                                            <span className="text-indigo-600 font-bold flex items-center gap-1 cursor-pointer hover:underline">
                                                Full Report <ArrowRight size={14} />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section >

            {/* Features Grid */}
            < section id="features" className="py-12 md:py-24 bg-white relative overflow-hidden" >
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything you need to regain control</h2>
                        <p className="text-base md:text-lg text-gray-500">Spendyx is more than just a list. It's an intelligent financial assistant for your subscriptions.</p>
                    </div>

                    <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-8 overflow-x-auto md:overflow-visible pb-8 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory hide-scrollbar">
                        {[
                            { title: "Auto Reminders", desc: "Get notified days before a renewal so you can cancel in time.", icon: "🔔", color: "bg-amber-100 text-amber-600" },
                            { title: "Visual Analytics", desc: "See exactly where your money goes with monthly spend graphs.", icon: "📊", color: "bg-indigo-100 text-indigo-600" },
                            { title: "Payment Calendar", desc: "View all upcoming charges in a clean, categorized calendar view.", icon: "📅", color: "bg-blue-100 text-blue-600" },
                            { title: "Category Breakdown", desc: "Sort by Entertainment, Utilities, or Work to budget better.", icon: "🏷️", color: "bg-purple-100 text-purple-600" },
                            { title: "Price Protection", desc: "We track price hikes and alert you instantly. No more surprises.", icon: "📈", color: "bg-red-100 text-red-600" },
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
            </section >

            {/* Footer */}
            <footer id="contact" className="relative overflow-hidden bg-[#060f1f] text-white border-t border-white/10">
                <div className="pointer-events-none absolute -top-24 right-0 w-80 h-80 rounded-full bg-cyan-400/10 blur-3xl"></div>
                <div className="pointer-events-none absolute -bottom-24 left-0 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl"></div>

                <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-16">
                    <div className="rounded-3xl border border-white/15 bg-white/[0.04] backdrop-blur-sm p-6 md:p-8">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div>
                                <div className="inline-flex items-center gap-3 mb-3">
                                    <img src="/Spendyx.png" alt="Spendyx Logo" className="w-10 h-10 object-contain" />
                                    <span className="text-2xl font-black tracking-tight">Spendyx</span>
                                </div>
                                <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
                                    Stop paying for things you forgot. Spendyx keeps your renewals visible, your spending clear, and your choices intentional.
                                </p>
                            </div>

                            <button
                                onClick={onGetStarted}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cyan-400 text-slate-950 font-black text-sm hover:bg-cyan-300 transition-colors"
                            >
                                Start Free
                                <ArrowRight size={16} />
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3 font-bold">Product</p>
                                <div className="flex flex-col gap-2 text-sm text-slate-200">
                                    <a href="#features" className="group inline-flex items-center gap-2 hover:text-white transition-colors">
                                        <span className="w-6 h-6 rounded-md bg-white/10 border border-white/10 inline-flex items-center justify-center">
                                            <Sparkles size={13} />
                                        </span>
                                        <span>Features</span>
                                    </a>
                                    <button onClick={onGetStarted} className="group inline-flex items-center gap-2 text-left hover:text-white transition-colors">
                                        <span className="w-6 h-6 rounded-md bg-white/10 border border-white/10 inline-flex items-center justify-center">
                                            <LayoutDashboard size={13} />
                                        </span>
                                        <span>Dashboard</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3 font-bold">Legal</p>
                                <div className="flex flex-col gap-2 text-sm text-slate-200">
                                    <Link href="/privacy-policy" className="group inline-flex items-center gap-2 hover:text-white transition-colors">
                                        <span className="w-6 h-6 rounded-md bg-white/10 border border-white/10 inline-flex items-center justify-center">
                                            <ShieldCheck size={13} />
                                        </span>
                                        <span>Privacy Policy</span>
                                    </Link>
                                    <Link href="/terms" className="group inline-flex items-center gap-2 hover:text-white transition-colors">
                                        <span className="w-6 h-6 rounded-md bg-white/10 border border-white/10 inline-flex items-center justify-center">
                                            <FileText size={13} />
                                        </span>
                                        <span>Terms of Service</span>
                                    </Link>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3 font-bold">Contact</p>
                                <div className="flex flex-col gap-2 text-sm text-slate-200">
                                    <a href="mailto:jwrstack@gmail.com" className="group inline-flex items-center gap-2 hover:text-white transition-colors">
                                        <span className="w-6 h-6 rounded-md bg-white/10 border border-white/10 inline-flex items-center justify-center">
                                            <Mail size={13} />
                                        </span>
                                        <span>jwrstack@gmail.com</span>
                                    </a>
                                    <a
                                        href="https://x.com/jagadeeswarrrr"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group inline-flex items-center gap-2 hover:text-white transition-colors"
                                    >
                                        <span className="w-6 h-6 rounded-md bg-white/10 border border-white/10 inline-flex items-center justify-center">
                                            <XBrandIcon className="w-[13px] h-[13px]" />
                                        </span>
                                        <span>@jagadeeswarrrr</span>
                                        <ExternalLink size={12} className="opacity-70 group-hover:opacity-100" />
                                    </a>
                                    <span className="text-slate-400">For issues and support, email or message on X.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-400">
                        <p>© 2026 Spendyx Inc. All rights reserved.</p>
                        <p>Built for people who want fewer subscriptions, not more surprises.</p>
                    </div>
                </div>
            </footer>

            {/* PWA Install Modal */}
            <AnimatePresence>
                {
                    showInstallModal && (
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
                    )
                }
            </AnimatePresence >

            {/* iOS Waitlist Modal */}
            <AnimatePresence>
                {showWaitlistModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                        onClick={() => {
                            setShowWaitlistModal(false);
                            setWaitlistMessage(null);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => {
                                    setShowWaitlistModal(false);
                                    setWaitlistMessage(null);
                                }}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Bell size={32} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    Get Notified for iOS
                                </h3>
                                <p className="text-gray-500 text-sm">
                                    Be the first to know when Spendyx launches on the App Store!
                                </p>
                            </div>

                            {waitlistMessage?.type === 'success' ? (
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Check size={32} className="text-green-600" />
                                    </div>
                                    <p className="text-green-600 font-medium">{waitlistMessage.text}</p>
                                </div>
                            ) : (
                                <form onSubmit={handleJoinWaitlist} className="space-y-4">
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="email"
                                            placeholder="Enter your email"
                                            value={waitlistEmail}
                                            onChange={(e) => setWaitlistEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-all"
                                            required
                                            disabled={isSubmittingWaitlist}
                                        />
                                    </div>

                                    {waitlistMessage?.type === 'error' && (
                                        <p className="text-red-500 text-sm text-center">{waitlistMessage.text}</p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isSubmittingWaitlist || !waitlistEmail.trim()}
                                        className="w-full py-3.5 bg-gradient-to-r from-[#007AFF] to-[#5856D6] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingWaitlist ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                Joining...
                                            </>
                                        ) : (
                                            'Join Waitlist'
                                        )}
                                    </button>
                                </form>
                            )}

                            <p className="text-xs text-gray-400 text-center mt-4">
                                We'll only email you about the iOS launch. No spam, ever.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default LandingPage;
