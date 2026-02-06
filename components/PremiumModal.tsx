import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Star, Zap, Shield, Infinity as InfinityIcon, Users, CreditCard, Loader2 } from 'lucide-react';
import { formatCurrency, convertCurrency, isUserPremium } from '../utils';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { getOfferings } from '../services/purchaseService';

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: (plan: 'monthly' | 'yearly') => void;
    onRestore?: () => void;
    isLoading?: boolean;
    currency?: string;
    rates?: Record<string, number>;
    user?: any;
}

const PremiumModal: React.FC<PremiumModalProps> = ({
    isOpen,
    onClose,
    onUpgrade,
    onRestore,
    isLoading = false,
    currency = 'USD',
    rates = {},
    user
}) => {
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
    const [history, setHistory] = useState<any[]>([]);
    const [pricesLoading, setPricesLoading] = useState(true);

    // Dynamic prices from RevenueCat
    const [monthlyPrice, setMonthlyPrice] = useState<number>(0.50);
    const [yearlyPrice, setYearlyPrice] = useState<number>(4.99);
    const [storeCurrency, setStoreCurrency] = useState<string>('USD');
    const [monthlyPriceString, setMonthlyPriceString] = useState<string>('$0.50');
    const [yearlyPriceString, setYearlyPriceString] = useState<string>('$4.99');

    // Fetch prices from RevenueCat
    useEffect(() => {
        const fetchPrices = async () => {
            if (!isOpen) return;

            // WEB: Static Pricing (Razorpay)
            if (!Capacitor.isNativePlatform()) {
                setMonthlyPrice(45);
                setMonthlyPriceString('₹45');
                setYearlyPrice(500);
                setYearlyPriceString('₹500');
                setYearlyPriceString('₹499');
                setStoreCurrency('INR');
                setPricesLoading(false);
                setSelectedPlan('monthly'); // Default to monthly on web
                return;
            }

            setPricesLoading(true);
            try {
                const packages = await getOfferings();
                console.log('[PremiumModal] Fetched packages:', packages);

                packages.forEach(pkg => {
                    const id = pkg.identifier.toLowerCase();
                    const productId = pkg.product?.identifier?.toLowerCase() || '';
                    const price = pkg.product?.price || 0;
                    const priceStr = pkg.product?.priceString || '';
                    const currencyCode = pkg.product?.currencyCode || 'USD';

                    console.log('[PremiumModal] Package:', id, productId, price, priceStr, currencyCode);

                    // Match monthly package
                    if (id === '$rc_monthly' || productId.includes('monthly') || (pkg as any).packageType === 7) {
                        setMonthlyPrice(price);
                        setMonthlyPriceString(priceStr);
                        setStoreCurrency(currencyCode);
                    }

                    // Match yearly package
                    if (id === '$rc_annual' || productId.includes('yearly') || productId.includes('annual') || (pkg as any).packageType === 3) {
                        setYearlyPrice(price);
                        setYearlyPriceString(priceStr);
                        // Yearly currency should match monthly, so no need to set again usually, but safe to do so
                        if (currencyCode) setStoreCurrency(currencyCode);
                    }
                });
            } catch (error) {
                console.error('[PremiumModal] Failed to fetch prices:', error);
                // Keep fallback prices
            } finally {
                setPricesLoading(false);
            }
        };

        fetchPrices();
    }, [isOpen]);

    React.useEffect(() => {
        console.log("PremiumModal Open:", isOpen, "User:", user);
        if (isOpen && user) {
            console.log("Fetching history for user:", user.id);
            supabase
                .from('premium_purchases')
                .select('*')
                .eq('user_id', user.id)
                .order('purchase_date', { ascending: false })
                .then(({ data, error }) => {
                    console.log("History Data:", data, "Error:", error);
                    if (data) setHistory(data);
                });
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    // Convert prices to user's selected currency
    // If storeCurrency matches user currency, use the formatted string from store (exact).
    // Otherwise, convert using our rates.
    const isSameCurrency = storeCurrency === currency;

    const displayMonthly = isSameCurrency
        ? monthlyPriceString
        : formatCurrency(convertCurrency(monthlyPrice, storeCurrency, currency, rates), currency);

    const displayYearly = isSameCurrency
        ? yearlyPriceString
        : formatCurrency(convertCurrency(yearlyPrice, storeCurrency, currency, rates), currency);

    // Dynamic Savings Calculation based on actual prices
    const yearlySavingsPercent = monthlyPrice > 0
        ? Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100)
        : 0;

    const features = [
        { title: 'Unlimited Subscriptions', desc: 'No limits. Track everything.', icon: InfinityIcon },
        { title: 'Family Sharing', desc: 'Share premium with up to 5 members.', icon: Users },
        { title: 'Price Change Alerts', desc: 'Get notified when prices jump.', icon: Zap },
        { title: 'Advanced Analytics', desc: 'Visualize spending trends.', icon: Star },
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                >
                    {/* Premium Header */}
                    <div className="bg-gray-900 text-white p-6 pb-8 relative overflow-hidden shrink-0">
                        {/* Abstract shapes */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-400 rounded-full blur-3xl opacity-10 -ml-12 -mb-12"></div>

                        <div className="relative z-10 text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-4">
                                <Star size={12} className="text-amber-400 fill-amber-400" />
                                <span className="text-[10px] font-bold tracking-wider uppercase text-amber-100">Pro Upgrade</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Unlock Full Potental</h2>
                            <p className="text-gray-400 text-sm">Get unlimited power to manage your subscriptions.</p>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors text-white/70 z-50"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 pt-2 -mt-4 bg-white rounded-t-3xl relative z-20 no-scrollbar">
                        {/* Features List */}
                        <div className="space-y-4 mb-1">
                            {features.map((f, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                        <f.icon size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">{f.title}</h4>
                                        <p className="text-xs text-gray-500">{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Plan Cards */}
                        {/* Plan Cards or Active Status */}
                        <div className="space-y-3">
                            {isUserPremium(user) ? (
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 text-center">
                                    <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
                                        <Check size={32} className="text-white" strokeWidth={3} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Premium Active</h3>
                                    <p className="text-gray-500 text-sm mb-4">
                                        You have full access to all features.
                                    </p>

                                    {user?.premiumExpiryDate && (
                                        <div className="inline-block px-3 py-1 bg-white rounded-full border border-amber-100 text-amber-700 text-xs font-bold mb-4 shadow-sm">
                                            Valid until {new Date(user.premiumExpiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </div>
                                    )}

                                    {!Capacitor.isNativePlatform() && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            To manage or cancel, please check your email for the Razorpay invoice or contact support.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Yearly Plan (Visible on Web & Native) */}
                                    <button
                                        onClick={() => setSelectedPlan('yearly')}
                                        className={`w-full relative p-1 rounded-2xl group transition-all ${selectedPlan === 'yearly'
                                            ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-200'
                                            : 'bg-transparent'
                                            }`}
                                    >
                                        <div className={`relative p-4 rounded-xl flex items-center justify-between ${selectedPlan === 'yearly' ? 'bg-white' : 'bg-gray-50 border border-gray-100'
                                            }`}>
                                            {selectedPlan === 'yearly' && (
                                                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl rounded-tr-xl">
                                                    Best Value
                                                </div>
                                            )}

                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'yearly' ? 'border-indigo-500' : 'border-gray-300'
                                                    }`}>
                                                    {selectedPlan === 'yearly' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-50500" />}
                                                </div>
                                                <div className="text-left">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900">Yearly</span>
                                                        {yearlySavingsPercent > 0 && (
                                                            <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                                                                Save {yearlySavingsPercent}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-0.5">Pay upfront for 12 months</p>
                                                </div>
                                            </div>

                                            <div className="text-right mt-4">
                                                {pricesLoading ? (
                                                    <Loader2 size={16} className="animate-spin text-gray-400" />
                                                ) : (
                                                    <>
                                                        <span className="block text-lg font-black text-gray-900">{displayYearly}</span>
                                                        <span className="text-[10px] text-gray-400">/year</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </button>

                                    {/* Monthly Plan */}
                                    <button
                                        onClick={() => setSelectedPlan('monthly')}
                                        className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${selectedPlan === 'monthly'
                                            ? 'border-indigo-500 bg-indigo-50/50'
                                            : 'border-gray-100 bg-white hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'monthly' ? 'border-indigo-500' : 'border-gray-300'
                                                }`}>
                                                {selectedPlan === 'monthly' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-50" />}
                                            </div>
                                            <div className="text-left">
                                                <span className="font-bold text-gray-900 block">Monthly</span>
                                                <p className="text-xs text-gray-500 mt-0.5">Short term flexibility</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {pricesLoading ? (
                                                <Loader2 size={16} className="animate-spin text-gray-400" />
                                            ) : (
                                                <>
                                                    <span className="block text-lg font-black text-gray-900">{displayMonthly}</span>
                                                    <span className="text-[10px] text-gray-400">/month</span>
                                                </>
                                            )}
                                        </div>
                                    </button>

                                    {!Capacitor.isNativePlatform() && !isSameCurrency && (
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-400 bg-gray-50 inline-block px-2 py-1 rounded-full border border-gray-100">
                                                * You will be billed in {storeCurrency} ({storeCurrency === 'INR' ? '₹' : storeCurrency}). Your bank handles the conversion.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0">
                        {isUserPremium(user) ? (
                            <button
                                onClick={onClose}
                                className="w-full py-4 rounded-xl bg-gray-200 text-gray-800 font-bold text-base hover:bg-gray-300 transition-colors"
                            >
                                Close
                            </button>
                        ) : (
                            <button
                                onClick={() => onUpgrade(selectedPlan)}
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl bg-gray-900 text-white font-bold text-base shadow-xl shadow-gray-200 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                            >
                                {isLoading ? 'Processing...' : `Get ${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'} Plan`}
                                {!isLoading && <Zap size={18} className="text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />}
                            </button>
                        )}

                        {Capacitor.isNativePlatform() && (
                            <button
                                onClick={onRestore}
                                className="w-full mt-4 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Restore Purchase
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PremiumModal;
