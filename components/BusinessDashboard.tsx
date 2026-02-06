
import React from 'react';
import { Subscription, BillingCycle } from '../types';
import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, Building2, BarChart2 } from 'lucide-react';
import { formatCurrency, convertCurrency } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface DashboardProps {
    subscriptions: Subscription[];
    rates?: Record<string, number>;
    onManage: (sub: Subscription) => void;
    currency: string;
    onViewWaste?: () => void;
}

const BusinessDashboard: React.FC<DashboardProps> = ({ subscriptions, rates, onManage, currency, onViewWaste }) => {
    // currency is now passed as prop
    // const { activeWorkspace } = useWorkspace(); REMOVED


    // Metrics Calculation
    const metrics = subscriptions
        .filter(s => s.status?.toLowerCase() === 'active')
        .reduce((acc, sub) => {
            // 1. Cost Normalization
            let monthlyCost = sub.amount;
            if (sub.billingCycle === BillingCycle.Annual) monthlyCost /= 12;
            else if (sub.billingCycle === BillingCycle.Quarterly) monthlyCost /= 3;
            else if (sub.billingCycle === BillingCycle.SemiAnnual) monthlyCost /= 6;
            if (rates && sub.currency && sub.currency !== currency) {
                monthlyCost = convertCurrency(monthlyCost, sub.currency, currency, rates);
            }

            // 2. Waste Calculation
            const seatsTotal = sub.seatsTotal || 0;
            const seatsAssigned = sub.seatsAssigned || 0;
            const wastedSeats = Math.max(0, seatsTotal - seatsAssigned);

            // Cost per seat estimation (if total > 0)
            const costPerSeat = seatsTotal > 0 ? (monthlyCost / seatsTotal) : 0;
            const wastedCost = wastedSeats * costPerSeat;

            // 3. Department
            const dept = sub.department || 'Unassigned';
            acc.departments[dept] = (acc.departments[dept] || 0) + monthlyCost;

            return {
                totalBurn: acc.totalBurn + monthlyCost,
                totalWaste: acc.totalWaste + wastedCost,
                departments: acc.departments
            };
        }, { totalBurn: 0, totalWaste: 0, departments: {} as Record<string, number> });

    // Bar Chart Data (Sorted)
    const chartData = Object.entries(metrics.departments)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => (Number(b.value) - Number(a.value)));

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6'];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const cardVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            className="px-4 pt-4 space-y-6 pb-32 bg-slate-50 min-h-screen"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >


            {/* Hero Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Total Burn - Premium Dark Card */}
                <motion.div variants={cardVariants} className="col-span-2 bg-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                    <div className="relative z-10">
                        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1">Monthly Burn Rate</p>
                        <h2 className="text-4xl font-black tracking-tighter">
                            {formatCurrency(metrics.totalBurn, currency)}
                        </h2>
                    </div>
                    <div className="relative z-10 flex items-center justify-between mt-4">
                        <p className="text-slate-400 text-sm font-medium">
                            <span className="text-white font-bold">{subscriptions.length}</span> active subscription{subscriptions.length !== 1 ? 's' : ''}
                        </p>
                        <TrendingUp className="text-emerald-400" size={24} />
                    </div>
                    {/* Subtle Gradient Glow instead of Icon Watermark */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none"></div>
                </motion.div>

                {/* Wasted Spend - Soft Red Theme */}
                <motion.div
                    variants={cardVariants}
                    onClick={onViewWaste}
                    className={`col-span-1 bg-rose-50 p-5 rounded-3xl transition-all ${onViewWaste ? 'cursor-pointer hover:bg-rose-100' : ''}`}
                >
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex items-start justify-between mb-2">
                            <div className="p-2 bg-white rounded-full text-rose-500 shadow-sm">
                                <AlertTriangle size={16} />
                            </div>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-rose-900 tracking-tight">
                                {formatCurrency(metrics.totalWaste, currency)}
                            </p>
                            <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wide mt-1">Wasted Spend</p>
                        </div>
                    </div>
                </motion.div>

                {/* Active Teams - Soft Indigo Theme */}
                <motion.div variants={cardVariants} className="col-span-1 bg-indigo-50 p-5 rounded-3xl">
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex items-start justify-between mb-2">
                            <div className="p-2 bg-white rounded-full text-indigo-500 shadow-sm">
                                <Building2 size={16} />
                            </div>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-indigo-900 tracking-tight">
                                {Object.keys(metrics.departments).length}
                            </p>
                            <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide mt-1">Active Teams</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Department Breakdown Chart */}
            <motion.div variants={cardVariants} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900">Spend by Department</h3>
                    <BarChart2 size={16} className="text-slate-400" />
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={chartData}
                            margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                            barSize={32}
                            barGap={2}
                        >
                            <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={100}
                                tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '8px 12px' }}
                                formatter={(value: number) => [formatCurrency(value, currency), '']}
                            />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                {chartData.map((entry, index) => {
                                    const isUnassigned = entry.name === 'Unassigned';
                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={isUnassigned ? '#94a3b8' : COLORS[index % COLORS.length]}
                                        />
                                    );
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default BusinessDashboard;

