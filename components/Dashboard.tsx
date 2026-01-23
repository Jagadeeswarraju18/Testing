import React from 'react';
import { Subscription, User, BillingCycle } from '../types';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, CreditCard, ChevronRight, AlertTriangle } from 'lucide-react';
import { formatCurrency, convertCurrency } from '../utils';
import ServiceLogo from './ServiceLogo';

interface DashboardProps {
  user: User;
  subscriptions: Subscription[];
  onManage: (sub: Subscription) => void;
  onSettings: () => void;
  rates?: Record<string, number>;
}

const Dashboard: React.FC<DashboardProps> = ({ user, subscriptions, onManage, onSettings, rates }) => {
  // 1. Calculate Monthly Spend (Amortized)
  const monthlySpend = subscriptions
    .filter(s => s.status === 'Active')
    .reduce((acc, sub) => {
      const subCurrency = sub.currency || 'USD';
      let amount = sub.amount;
      if (rates && subCurrency !== user.currency) {
        amount = convertCurrency(sub.amount, subCurrency, user.currency, rates);
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

  // 2. Yearly Projection
  const yearlySpend = monthlySpend * 12;

  // 3. Upcoming Renewals (Next 30 days)
  const upcomingRenewals = subscriptions
    .filter(s => s.status === 'Active')
    .map(sub => {
      const nextDate = new Date(sub.renewalDate);
      nextDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Simple diff logic
      const diffTime = nextDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...sub, daysLeft: diffDays };
    })
    .filter(s => s.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

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
      className="p-5 space-y-6 pb-32 bg-gray-50/50 min-h-screen"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <header className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Overview</h1>
        </div>
        <button
          onClick={onSettings}
          className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md transition-transform active:scale-95"
        >
          {user.avatar ? (
            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">{user.name[0]}</div>
          )}
        </button>
      </header>

      {/* Hero "Wallet" Card */}
      <motion.div
        variants={cardVariants}
        className="relative h-64 rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-500/30 ring-1 ring-white/20"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] z-0"></div>
        {/* Animated Abstract shapes */}
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
              <span className="text-[10px] text-indigo-200 block font-medium uppercase tracking-wider mb-0.5">Budget</span>
              <span className="text-sm font-bold bg-white/20 px-2 py-0.5 rounded text-white">{formatCurrency(user.monthlyBudget, user.currency)}</span>
            </div>
          </div>

          <div className="flex flex-col items-center py-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-light text-indigo-200 self-start mt-2">
                {formatCurrency(0, user.currency).replace(/[0-9.,\s]/g, '')}
              </span>
              <h2 className="text-6xl font-extrabold tracking-tight">
                {Math.floor(monthlySpend).toLocaleString()}
              </h2>
              <span className="text-2xl font-medium text-indigo-300">
                .{monthlySpend.toFixed(2).split('.')[1]}
              </span>
            </div>
            <p className="text-sm text-indigo-200/80 font-medium">Estimated {formatCurrency(yearlySpend, user.currency)} / year</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
              <span>{Math.round((monthlySpend / user.monthlyBudget) * 100)}% Used</span>
              <span>{formatCurrency(Math.max(0, user.monthlyBudget - monthlySpend), user.currency)} Remain</span>
            </div>
            <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden p-0.5 backdrop-blur-sm">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((monthlySpend / user.monthlyBudget) * 100, 100)}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={`h-full rounded-full shadow-lg ${monthlySpend > user.monthlyBudget ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-400 to-purple-400'}`}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Next Payment & Active Count Grid */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div variants={cardVariants} className="bg-indigo-50 p-5 rounded-[1.5rem] border border-indigo-100 relative overflow-hidden group transition-all hover:shadow-[0_8px_30px_rgb(99,102,241,0.1)]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Calendar size={20} />
            </div>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Next Bill</p>
          </div>

          {nextUp ? (
            <div className="relative z-10">
              <div className="text-3xl font-black text-indigo-900 tracking-tight leading-none mb-2">
                {nextUp.daysLeft === 0 ? 'Due' : nextUp.daysLeft} <span className="text-sm font-semibold text-indigo-400">{nextUp.daysLeft === 0 ? 'Today' : (nextUp.daysLeft === 1 ? 'Day' : 'Days')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                <p className="text-xs font-semibold text-indigo-700 truncate max-w-[100px]">{nextUp.name}</p>
              </div>
              <p className="text-[10px] text-indigo-400 font-medium pl-3">{formatCurrency(nextUp.amount, user.currency)}</p>
            </div>
          ) : (
            <div className="text-indigo-400 text-sm font-medium py-2">All Clear</div>
          )}
        </motion.div>

        <motion.div variants={cardVariants} className="bg-purple-50 p-5 rounded-[1.5rem] border border-purple-100 group transition-all hover:shadow-[0_8px_30px_rgb(168,85,247,0.1)]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-500 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <TrendingUp size={20} />
            </div>
            <p className="text-[10px] font-bold text-purple-600/60 uppercase tracking-widest mt-1">Active</p>
          </div>
          <div className="relative z-10">
            <p className="text-3xl font-black text-purple-900 tracking-tight leading-none mb-1">{subscriptions.filter(s => s.status === 'Active').length}</p>
            <p className="text-xs font-medium text-purple-700">Subscriptions</p>
            <p className="text-[10px] text-purple-500/80 mt-1">tracking {subscriptions.length} total</p>
          </div>
        </motion.div>
      </div>

      {/* Upcoming Cards Stack */}
      <motion.div variants={cardVariants}>
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="font-bold text-xl text-gray-900 tracking-tight">Upcoming</h3>
          <button className="text-indigo-600 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">See All</button>
        </div>

        <div className="space-y-2 relative pb-10">
          {upcomingRenewals.length > 0 ? (
            upcomingRenewals.map((sub, idx) => (
              <motion.div
                key={sub.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5, scale: 1.02, zIndex: 10, transition: { duration: 0.2 } }}
                onClick={() => onManage(sub)}
                style={{
                  marginTop: idx === 0 ? 0 : '-0.5rem', // Overlap effect
                  zIndex: 5 - idx
                }}
                className="bg-white p-4 rounded-[1.25rem] shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-gray-100 flex items-center justify-between relative cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm">
                    <ServiceLogo name={sub.name} logoUrl={sub.logoUrl} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg leading-none mb-1">{sub.name}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${sub.daysLeft <= 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {sub.daysLeft === 0 ? 'Due Today' : (sub.daysLeft === 1 ? 'Tomorrow' : `${sub.daysLeft} days left`)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900 text-lg">
                    {rates && sub.currency && sub.currency !== user.currency
                      ? formatCurrency(convertCurrency(sub.amount, sub.currency, user.currency, rates), user.currency)
                      : formatCurrency(sub.amount, user.currency)}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium capitalize tracking-wide">{sub.billingCycle}</p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-10 bg-white rounded-[1.5rem] border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                <Calendar size={24} />
              </div>
              <p className="text-gray-400 text-sm font-medium">No upcoming payments soon!</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;