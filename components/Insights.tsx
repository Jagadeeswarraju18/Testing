import React from 'react';
import { Subscription, BillingCycle, User } from '../types';
import { POPULAR_PROVIDERS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip as RechartsTooltip } from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency, convertCurrency, getUserShare } from '../utils';
import { generateSavingsSuggestions, getSuggestionStats, SavingsSuggestion } from '../services/savingsEngine';
import { TrendingUp, AlertTriangle, Clock, Repeat, Tag, DollarSign, Lightbulb } from 'lucide-react';

interface InsightsProps {
  user: User;
  subscriptions: Subscription[];
  currency: string;
  rates?: Record<string, number>;
  onSettings: () => void;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const Insights: React.FC<InsightsProps> = ({ user, subscriptions, currency, rates, onSettings }) => {

  // 1. Prepare Category Data - USER'S SHARE ONLY
  const categoryData = React.useMemo(() => {
    const map = new Map<string, number>();
    subscriptions.forEach(sub => {
      if (sub.status?.toLowerCase() !== 'active') return;

      // Get user's share first
      let amount = getUserShare(sub.amount, sub.sharedWith);

      // Normalize to MONTHLY
      if (sub.billingCycle === BillingCycle.Annual) amount = amount / 12;
      if (sub.billingCycle === BillingCycle.Weekly) amount = amount * 4.33;

      // Currency conversion
      if (rates && sub.currency && sub.currency !== currency) {
        amount = convertCurrency(amount, sub.currency, currency, rates);
      }

      const current = map.get(sub.category) || 0;
      map.set(sub.category, current + amount);
    });

    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [subscriptions, currency, rates]);

  // 2. Prepare Monthly Projection (Smart Logic)
  const projectionData = React.useMemo(() => {
    const today = new Date();
    const months = [];

    // Generate next 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push({
        name: d.toLocaleString('default', { month: 'short' }),
        date: d,
        amount: 0
      });
    }

    // Iterate subs and add cost to relevant months - USER'S SHARE ONLY
    subscriptions.forEach(sub => {
      if (sub.status?.toLowerCase() !== 'active') return;

      let cost = getUserShare(sub.amount, sub.sharedWith);
      if (rates && sub.currency && sub.currency !== currency) {
        cost = convertCurrency(cost, sub.currency, currency, rates);
      }

      const renewal = new Date(sub.renewalDate);

      if (sub.billingCycle === BillingCycle.Monthly) {
        months.forEach(m => m.amount += cost);
      } else if (sub.billingCycle === BillingCycle.Annual) {
        months.forEach(m => {
          if (m.date.getMonth() === renewal.getMonth()) {
            m.amount += cost;
          }
        });
      } else if (sub.billingCycle === BillingCycle.Weekly) {
        months.forEach(m => m.amount += (cost * 4.33));
      }
    });

    return months;
  }, [subscriptions, currency, rates]);

  // 3. Top Subscriptions - USER'S SHARE ONLY
  const topSubs = React.useMemo(() => {
    const sorted = [...subscriptions]
      .filter(s => s.status?.toLowerCase() === 'active')
      .map(s => {
        // Use user's share, not full amount
        let converted = getUserShare(s.amount, s.sharedWith);
        if (rates && s.currency && s.currency !== currency) {
          converted = convertCurrency(converted, s.currency, currency, rates);
        }
        // Normalize to monthly for fair comparison
        if (s.billingCycle === BillingCycle.Custom) return { ...s, normalized: converted };
        if (s.billingCycle === BillingCycle.Annual) converted /= 12;
        if (s.billingCycle === BillingCycle.Weekly) converted *= 4.33;

        return { ...s, normalized: converted };
      })
      .sort((a, b) => b.normalized - a.normalized)
      .slice(0, 3);
    return sorted;
  }, [subscriptions, currency, rates]);


  // State for hover interaction
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 ring-1 ring-black/5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label || payload[0].name}</p>
          <p className="text-lg font-bold text-gray-900 leading-none">
            {formatCurrency(payload[0].value, currency)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 pb-24 min-h-screen bg-gray-50 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
        <button
          onClick={onSettings}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md transition-transform active:scale-95"
        >
          {user.avatar ? (
            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs">{user.name[0]}</div>
          )}
        </button>
      </div>

      {/* Monthly Spend Breakdown */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
        <h3 className="text-sm font-semibold text-gray-500 mb-6 w-full flex justify-between items-center">
          <span>Spend Breakdown</span>
          <span className="text-[10px] font-normal bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">Monthly</span>
        </h3>

        {/* Chart Container with Absolute Center Text */}
        <div className="relative h-64 w-full flex justify-center items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={100}
                paddingAngle={6}
                dataKey="value"
                cornerRadius={8}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="none"
                    opacity={activeIndex !== null && activeIndex !== index ? 0.6 : 1}
                  />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} cursor={false} />
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Total Text */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-300 ${activeIndex !== null ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">Total</span>
            <span className="text-2xl font-black text-gray-900 tracking-tight">
              {(() => {
                const total = categoryData.reduce((acc, curr) => acc + curr.value, 0);
                return formatCurrency(total, currency).split('.')[0]; // Show whole number for cleaner look
              })()}
            </span>
            <span className="text-xs font-semibold text-gray-300">/ month</span>
          </div>
        </div>

        {/* Modern Pill Legend */}
        <div className="flex flex-wrap gap-2 justify-center mt-6 w-full">
          {categoryData.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
              <span className="font-semibold text-gray-600 capitalize">{entry.name}</span>
              <span className="text-gray-400 font-medium pl-1 border-l border-gray-200 ml-1">
                {Math.round((entry.value / categoryData.reduce((a, c) => a + c.value, 0)) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Projection Bar Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-500 mb-4">6-Month Forecast</h3>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectionData} barSize={36}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                fontSize={12}
                tick={{ fill: '#9ca3af', fontWeight: 500 }}
                dy={10}
              />
              <Bar
                dataKey="amount"
                fill="#6366f1"
                radius={[12, 12, 0, 0]}
                background={{ fill: '#f8fafc', radius: [12, 12, 0, 0] }}
              />
              <RechartsTooltip
                cursor={{ fill: '#eef2ff', radius: [12, 12, 0, 0] }}
                content={<CustomTooltip />}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-center text-gray-400 mt-2">Includes estimated annual renewals</p>
      </div>

      {/* Top Subscriptions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500">Biggest Spenders (Monthly Normalized)</h3>
        {topSubs.map((sub, i) => (
          <div key={sub.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                {i + 1}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{sub.name}</p>
                <p className="text-xs text-gray-400 capitalize">{sub.billingCycle}</p>
              </div>
            </div>
            <span className="font-bold text-gray-900 text-sm">
              {formatCurrency(sub.normalized, currency)}
            </span>
          </div>
        ))}
      </div>

      {/* Smart Suggestions from SavingsEngine */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-2">
            <Lightbulb size={14} className="text-amber-500" />
            Smart Suggestions
          </h3>
          {(() => {
            const suggestions = generateSavingsSuggestions(subscriptions, currency);
            const stats = getSuggestionStats(suggestions);
            if (stats.totalSavings > 0) {
              return (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  Save up to {formatCurrency(stats.totalSavings, currency)}
                </span>
              );
            }
            return null;
          })()}
        </div>

        {(() => {
          const suggestions = generateSavingsSuggestions(subscriptions, currency);

          if (suggestions.length === 0) {
            return (
              <div className="text-center py-8 bg-white border border-dashed border-gray-200 rounded-xl">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-gray-500 font-medium text-sm">You're doing great!</p>
                <p className="text-gray-400 text-xs mt-1">No savings suggestions right now.</p>
              </div>
            );
          }

          const getIcon = (type: string) => {
            switch (type) {
              case 'unused': return <Clock size={16} />;
              case 'price_increase': return <TrendingUp size={16} />;
              case 'annual_switch': return <Repeat size={16} />;
              case 'trial_ending': return <AlertTriangle size={16} />;
              case 'duplicate': return <Tag size={16} />;
              case 'high_spend': return <DollarSign size={16} />;
              default: return <Lightbulb size={16} />;
            }
          };

          const getColors = (severity: string, type: string) => {
            if (type === 'price_increase') return 'bg-rose-50 border-rose-100 text-rose-800';
            if (type === 'trial_ending') return 'bg-amber-50 border-amber-100 text-amber-800';
            if (severity === 'high') return 'bg-red-50 border-red-100 text-red-800';
            if (severity === 'medium') return 'bg-orange-50 border-orange-100 text-orange-800';
            return 'bg-emerald-50 border-emerald-100 text-emerald-800';
          };

          const getIconColors = (severity: string, type: string) => {
            if (type === 'price_increase') return 'bg-rose-100 text-rose-600';
            if (type === 'trial_ending') return 'bg-amber-100 text-amber-600';
            if (severity === 'high') return 'bg-red-100 text-red-600';
            if (severity === 'medium') return 'bg-orange-100 text-orange-600';
            return 'bg-emerald-100 text-emerald-600';
          };

          return suggestions.slice(0, 5).map((suggestion, i) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-4 rounded-xl border ${getColors(suggestion.severity, suggestion.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getIconColors(suggestion.severity, suggestion.type)}`}>
                  {getIcon(suggestion.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{suggestion.title}</p>
                  <p className="text-xs mt-0.5 opacity-80">{suggestion.message}</p>
                  {suggestion.savings && (
                    <p className="text-xs font-bold mt-1.5 flex items-center gap-1">
                      💰 Save {formatCurrency(suggestion.savings, currency)}
                      {suggestion.type === 'annual_switch' && '/year'}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ));
        })()}
      </div>
    </div>
  );
};

export default React.memo(Insights);