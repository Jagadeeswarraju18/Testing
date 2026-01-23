import React from 'react';
import { Subscription, User, BillingCycle } from '../types';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Users } from 'lucide-react';
import { formatCurrency, convertCurrency, getUserShare, isSharedSubscription } from '../utils';
import ServiceLogo from './ServiceLogo';

interface DashboardProps {
    user: User;
    subscriptions: Subscription[];
    onManage: (sub: Subscription) => void;
    onSettings: () => void;
    rates?: Record<string, number>;
    currency: string;
    monthlyBudget: number;
    onAdd?: () => void;
}

const PersonalDashboard: React.FC<DashboardProps> = ({ user, subscriptions, onManage, onSettings, rates, currency, monthlyBudget, onAdd }) => {
    // 1. Calculate Monthly Spend (Amortized) - USER'S SHARE ONLY
    const monthlySpend = React.useMemo(() => {
        return subscriptions
            .filter(s => s.status?.toLowerCase() === 'active')
            .reduce((acc, sub) => {
                const subCurrency = sub.currency || 'USD';
                let amount = getUserShare(sub.amount, sub.sharedWith); // Use user's share
                if (rates && subCurrency !== currency) {
                    amount = convertCurrency(amount, subCurrency, currency, rates);
                }

                switch (sub.billingCycle) {
                    case BillingCycle.Weekly: return acc + (amount * 4.33);
                    case BillingCycle.Monthly: return acc + amount;
                    case BillingCycle.Quarterly: return acc + (amount / 3);
                    case BillingCycle.SemiAnnual: return acc + (amount / 6);
                    case BillingCycle.Annual: return acc + (amount / 12);
                    case BillingCycle.Custom:
                        const period = sub.customBillingPeriod || 1;
                        if (sub.customBillingUnit === 'day') return acc + (amount / period) * 30.44;
                        if (sub.customBillingUnit === 'week') return acc + (amount / period) * 4.33;
                        if (sub.customBillingUnit === 'month') return acc + (amount / period);
                        if (sub.customBillingUnit === 'year') return acc + (amount / (period * 12));
                        return acc;
                    default: return acc;
                }
            }, 0);
    }, [subscriptions, rates, currency]);

    // 2. Yearly Projection
    const yearlySpend = monthlySpend * 12;

    // 3. Upcoming Renewals (Next 30 days)
    const upcomingRenewals = React.useMemo(() => {
        return subscriptions
            .filter(s => s.status?.toLowerCase() === 'active')
            .map(sub => {
                const nextDate = new Date(sub.renewalDate);
                nextDate.setHours(0, 0, 0, 0);

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const diffTime = nextDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const userAmount = getUserShare(sub.amount, sub.sharedWith);
                return { ...sub, daysLeft: diffDays, userAmount };
            })
            .filter(s => s.daysLeft >= 0)
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .slice(0, 5);
    }, [subscriptions]); // Recalculate only when subscriptions change

    const nextUp = upcomingRenewals[0];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const cardVariants = {
        hidden: { y: 20, opacity: 0, scale: 0.95 },
        visible: { y: 0, opacity: 1, scale: 1 }
    };

    return (
        <motion.div
            className="px-4 pt-4 space-y-6 pb-32 bg-gray-50/50 min-h-screen"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >


            {/* Hero "Wallet" Card */}
            <motion.div
                variants={cardVariants}
                className="relative h-64 rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-500/30 ring-1 ring-white/20"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] z-0"></div>
                <motion.div
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-50%] right-[-20%] w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[80px]"
                />
                <motion.div
                    animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] bg-purple-500/20 rounded-full blur-[70px]"
                />

                <div className="relative z-10 p-7 flex flex-col justify-between h-full text-white">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-inner">
                            <span className="text-xs font-bold tracking-wide text-indigo-100">MONTHLY SPEND</span>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-indigo-200 block font-medium uppercase tracking-wider mb-0.5">Budget</span>
                            <span className="text-sm font-bold bg-white/20 px-2 py-0.5 rounded text-white">{formatCurrency(monthlyBudget || 0, currency)}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center py-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-light text-indigo-200 self-start mt-2">
                                {formatCurrency(0, currency).replace(/[0-9.,\s]/g, '')}
                            </span>
                            <h2 className="text-3xl font-extrabold tracking-tight">
                                {Number(monthlySpend.toFixed(2).split('.')[0]).toLocaleString()}
                            </h2>
                            <span className="text-lg font-medium text-indigo-300">
                                .{monthlySpend.toFixed(2).split('.')[1]}
                            </span>
                        </div>
                        <p className="text-sm text-indigo-200/80 font-medium">Estimated {formatCurrency(yearlySpend, currency)} / year</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
                            <span>{monthlyBudget > 0 ? Math.round((monthlySpend / monthlyBudget) * 100) : 0}% Used</span>
                            <span>{formatCurrency(monthlyBudget > 0 ? Math.max(0, monthlyBudget - monthlySpend) : 0, currency)} Remain</span>
                        </div>
                        <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden p-0.5 backdrop-blur-sm">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${monthlyBudget > 0 ? Math.min((monthlySpend / monthlyBudget) * 100, 100) : 0}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className={`h-full rounded-full shadow-lg ${monthlySpend > monthlyBudget && monthlyBudget > 0 ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-400 to-purple-400'}`}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
                <motion.div variants={cardVariants} className="bg-indigo-50 p-4 rounded-[1.25rem] border border-indigo-100 relative overflow-hidden group transition-all hover:shadow-[0_8px_30px_rgb(99,102,241,0.1)]">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-500 shadow-sm group-hover:scale-110 transition-transform duration-300">
                            <Calendar size={16} />
                        </div>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Next Bill</p>
                    </div>

                    {nextUp ? (
                        <div className="relative z-10">
                            <div className="text-lg font-black text-indigo-900 tracking-tight leading-none mb-1">
                                {nextUp.daysLeft} <span className="text-xs font-semibold text-indigo-400">{nextUp.daysLeft === 1 ? 'Day' : 'Days'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                <p className="text-xs font-semibold text-indigo-700 truncate max-w-[90px]">{nextUp.name}</p>
                            </div>
                            <p className="text-xs text-indigo-400 font-medium pl-2.5">
                                {formatCurrency(
                                    rates ? convertCurrency(nextUp.userAmount, nextUp.currency || 'USD', currency, rates) : nextUp.userAmount,
                                    currency
                                )}
                                {isSharedSubscription(nextUp.sharedWith) && (
                                    <span className="ml-1 text-indigo-300">(Shared)</span>
                                )}
                            </p>
                        </div>
                    ) : (
                        <div className="text-indigo-400 text-xs font-medium py-2">All Clear</div>
                    )}
                </motion.div>

                <motion.div variants={cardVariants} className="bg-purple-50 p-4 rounded-[1.25rem] border border-purple-100 group transition-all hover:shadow-[0_8px_30px_rgb(168,85,247,0.1)]">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-purple-500 shadow-sm group-hover:scale-110 transition-transform duration-300">
                            <TrendingUp size={16} />
                        </div>
                        <p className="text-[10px] font-bold text-purple-600/60 uppercase tracking-widest mt-1">Active</p>
                    </div>
                    <div className="relative z-10">
                        <p className="text-2xl font-black text-purple-900 tracking-tight leading-none mb-1">{subscriptions.filter(s => s.status?.toLowerCase() === 'active').length}</p>
                        <p className="text-xs font-medium text-purple-700">Subscriptions</p>
                    </div>
                </motion.div>
            </div>

            <motion.div variants={cardVariants}>
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="font-bold text-lg text-gray-900 tracking-tight">Upcoming</h3>
                </div>
                <div className="space-y-2 relative pb-10">
                    {upcomingRenewals.length > 0 ? (
                        upcomingRenewals.map((sub, idx) => (
                            <motion.div
                                key={sub.id}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                whileHover={{ y: -5, scale: 1.02 }}
                                onClick={() => onManage(sub)}
                                className="bg-white p-4 rounded-[1.25rem] shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm">
                                        <ServiceLogo name={sub.name} logoUrl={sub.logoUrl} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-base leading-none mb-1">{sub.name}</h4>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${sub.daysLeft <= 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {sub.daysLeft === 0 ? 'Due Today' : `${sub.daysLeft} ${sub.daysLeft === 1 ? 'day' : 'days'} left`}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-gray-900 text-base">
                                        {formatCurrency(
                                            rates ? convertCurrency(sub.userAmount, sub.currency || 'USD', currency, rates) : sub.userAmount,
                                            currency
                                        )}
                                    </p>
                                    <div className="flex items-center justify-end gap-1">
                                        {isSharedSubscription(sub.sharedWith) && (
                                            <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                <Users size={10} /> {sub.sharedWith + 1}
                                            </span>
                                        )}
                                        <p className="text-xs text-gray-400 font-medium capitalize">{sub.billingCycle}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : subscriptions.length === 0 && onAdd ? (
                        <div className="text-center py-8 px-6 bg-white rounded-[1.5rem] border border-dashed border-gray-200 flex flex-col items-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 text-indigo-500">
                                <span className="text-3xl">✨</span>
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg mb-1">Start Tracking</h3>
                            <p className="text-gray-500 text-sm mb-4">Add your first subscription to see analytics and get reminders.</p>
                            <button
                                onClick={onAdd}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all text-sm"
                            >
                                + Add Subscription
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white rounded-[1.5rem] border border-dashed border-gray-200">
                            <p className="text-gray-400 text-sm font-medium">No upcoming payments soon!</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default React.memo(PersonalDashboard);
