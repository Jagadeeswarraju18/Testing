import React, { useState } from 'react';
import { Subscription, BillingCycle, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import { formatCurrency, convertCurrency, getUserShare } from '../utils';
import ServiceLogo from './ServiceLogo';

interface CalendarViewProps {
    user: User;
    subscriptions: Subscription[];
    currency: string;
    onSettings: () => void;
    rates?: Record<string, number>;
}

const CalendarView: React.FC<CalendarViewProps> = ({ user, subscriptions, currency, onSettings, rates }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedDay(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedDay(null);
    };

    // Helper to check if a sub renews on a specific day in this specific month/year
    const getSubsForDay = (day: number) => {
        return subscriptions.filter(sub => {
            const renewal = new Date(sub.renewalDate);
            // Use UTC Date to avoid timezone shifts from inputs like "2025-01-01T00:00:00Z" -> "Dec 31"
            // Alternatively, use simple string parsing if available, but for now let's try to be consistent.
            // Actually, best way for billing is to check if the *Day of Month* matches.

            if (sub.status !== 'Active' && sub.status !== 'active') return false; // Handle case sensitivity

            if (sub.billingCycle === BillingCycle.Monthly || sub.billingCycle === 'Monthly') {
                // Monthly: Renews on the same day every month
                // Handle edge case: 31st on a 30-day month -> clip to last day
                const renewalDay = renewal.getDate(); // Uses local time. If input is UTC midnight, this might be T-1.
                // Fix: Parse YYYY-MM-DD manually to get absolute day, or use UTC.
                // Let's assume input dates are correctly stored or we want to respect the day number.

                // Robust Day Extraction:
                const rDay = parseInt(sub.renewalDate.split('T')[0].split('-')[2]);

                if (day === daysInMonth && rDay > daysInMonth) return true; // Renewal on 31st, current is 30th
                return rDay === day;
            } else if (sub.billingCycle === BillingCycle.Annual || sub.billingCycle === 'Annual' || sub.billingCycle === 'Yearly') {
                // Annual: Match Month and Day
                const rDate = new Date(sub.renewalDate);
                // Robust Check:
                const rMonth = parseInt(sub.renewalDate.split('T')[0].split('-')[1]) - 1; // 0-indexed
                const rDay = parseInt(sub.renewalDate.split('T')[0].split('-')[2]);

                return rDay === day && rMonth === currentDate.getMonth();
            }
            // Add Weekly logic if needed, but for MVP Monthly/Annual are key
            return false;
        });
    };

    const selectedSubs = selectedDay ? getSubsForDay(selectedDay) : [];

    return (
        <div className="p-4 pb-24 min-h-screen bg-gray-50">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl shadow-sm border border-gray-100">
                        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16} /></button>
                        <span className="text-xs font-semibold min-w-[80px] text-center">{currentDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronRight size={16} /></button>
                    </div>
                    <button
                        onClick={onSettings}
                        className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md transition-transform active:scale-95 flex-shrink-0"
                    >
                        {user.avatar ? (
                            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs">{user.name[0]}</div>
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                {/* Days Header */}
                <div className="grid grid-cols-7 mb-2 text-center">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <span key={d} className="text-xs font-semibold text-gray-400 uppercase">{d}</span>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square"></div>
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const subs = getSubsForDay(day);
                        const hasSubs = subs.length > 0;
                        const isSelected = selectedDay === day;
                        const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();

                        return (
                            <motion.button
                                onClick={() => setSelectedDay(day)}
                                animate={{
                                    backgroundColor: isSelected ? '#4f46e5' : isToday ? '#eef2ff' : 'rgba(255,255,255,0)',
                                    scale: isSelected ? 1.1 : 1
                                }}
                                whileHover={{ scale: 1.1, backgroundColor: isSelected ? '#4338ca' : '#e0e7ff' }}
                                whileTap={{ scale: 0.95 }}
                                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-shadow duration-200 ${isSelected
                                    ? 'shadow-lg shadow-indigo-200 z-10'
                                    : isToday
                                        ? 'border border-indigo-200'
                                        : 'text-gray-700'
                                    }`}
                            >
                                <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-700'}`}>{day}</span>
                                {hasSubs && (
                                    <div className="flex gap-0.5 mt-1">
                                        {subs.slice(0, 3).map((_, idx) => (
                                            <div key={idx} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/70' : 'bg-indigo-500'}`}></div>
                                        ))}
                                    </div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Details */}
            <div className="mt-6 bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                        {selectedDay
                            ? new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })
                            : 'Select a Date'
                        }
                    </h3>
                    {selectedDay && selectedSubs.length > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">
                            {/* Calculate Daily Total */}
                            {(() => {
                                const total = selectedSubs.reduce((acc, sub) => {
                                    let amount = getUserShare(sub.amount, sub.sharedWith);
                                    if (rates && sub.currency && sub.currency !== currency) {
                                        amount = convertCurrency(amount, sub.currency, currency, rates);
                                    }
                                    return acc + amount;
                                }, 0);
                                return formatCurrency(total, currency);
                            })()}
                        </span>
                    )}
                </div>

                <div className="p-4 min-h-[120px]">
                    <AnimatePresence mode="popLayout">
                        {selectedDay && selectedSubs.length > 0 ? (
                            <div className="space-y-3">
                                {selectedSubs.map((sub, idx) => (
                                    <motion.div
                                        key={sub.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex justify-between items-center group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center p-1 overflow-hidden">
                                                <ServiceLogo name={sub.name} logoUrl={sub.logoUrl} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{sub.name}</p>
                                                <p className="text-[10px] text-gray-400 font-medium capitalize">{sub.billingCycle}</p>
                                            </div>
                                        </div>
                                        <p className="font-bold text-gray-900 text-sm">
                                            {rates && sub.currency && sub.currency !== currency
                                                ? formatCurrency(convertCurrency(getUserShare(sub.amount, sub.sharedWith), sub.currency, currency, rates), currency)
                                                : formatCurrency(getUserShare(sub.amount, sub.sharedWith), currency)
                                            }
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        ) : selectedDay ? (
                            <div className="flex flex-col items-center justify-center h-full py-4 space-y-2 opacity-50">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                    <CalIcon size={18} className="text-gray-400" />
                                </div>
                                <p className="text-gray-400 text-xs font-medium">No payments due this day</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-4 space-y-2 opacity-40">
                                <p className="text-gray-400 text-sm font-medium">Tap a date to see details</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default React.memo(CalendarView);
