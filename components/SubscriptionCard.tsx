import React from 'react';
import { motion } from 'framer-motion';
import { Subscription } from '../types';
import ServiceLogo from './ServiceLogo';
import { formatCurrency, convertCurrency, getUserShare, isSharedSubscription, getSubscriptionStatus } from '../utils';
import { CheckCircle, Circle, Info as InfoIcon, Users } from 'lucide-react';

interface SubscriptionCardProps {
    sub: Subscription;
    currency: string;
    rates?: Record<string, number>;
    onSelect: (sub: Subscription) => void;
    onMarkAsUsed: (id: string) => void;
    onMarkAsPaid?: (sub: Subscription) => void;
    selectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelection?: (id: string) => void;
    isBusiness?: boolean;
    isLocked?: boolean;
    isSharedWithFamily?: boolean; // V2: True if this sub is shared with family group
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
    sub,
    currency,
    rates,
    onSelect,
    onMarkAsUsed,
    onMarkAsPaid,
    selectionMode = false,
    isSelected = false,
    onToggleSelection,
    isBusiness = false,
    isLocked = false,
    isSharedWithFamily = false,
    onLockedClick
}) => {
    // Currency Conversion - Use USER'S SHARE
    let sourceAmount = sub.amount;
    let sourceCurrency = sub.currency;

    // Use Anchor if available (Review Logic)
    if (sub.original_amount && sub.original_currency) {
        sourceAmount = sub.original_amount;
        sourceCurrency = sub.original_currency;
    }

    const userShare = getUserShare(sourceAmount, sub.sharedWith);
    let displayAmount = userShare;
    let displayCurrency = sourceCurrency;

    // If source currency differs from requested workspace currency, convert it
    if (rates && sourceCurrency && sourceCurrency !== currency) {
        displayAmount = convertCurrency(userShare, sourceCurrency, currency, rates);
        displayCurrency = currency;
    }

    const isShared = isSharedSubscription(sub.sharedWith);

    // Days Left Calculation - Payment Mode Aware
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const renewal = new Date(sub.renewalDate);
    renewal.setHours(0, 0, 0, 0);

    const diffTime = renewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Use payment mode to determine status text
    const paymentMode = sub.paymentMode || 'auto_renew'; // Default to auto_renew
    const status = getSubscriptionStatus(sub.renewalDate, paymentMode, sub.lastPaidDate);

    let daysLeftText = status.label;
    let isUrgent = status.type === 'overdue' || status.type === 'due';

    // Business Warning Logic
    let autoRenewWarning = null;
    let warningColor = "bg-purple-100 text-purple-700";

    // We can't use showBusinessUI here because it's defined later, let's move definition up or duplicate simple check
    const isBusinessContext = isBusiness || !!sub.department || (sub.seatsTotal !== undefined && sub.seatsTotal > 0);

    if (isBusinessContext && sub.autoRenew) {
        if (diffDays < 0) {
            const absDays = Math.abs(diffDays);
            autoRenewWarning = `🔴 Overdue (${absDays} ${absDays === 1 ? 'day' : 'days'})`;
            warningColor = "bg-red-50 text-red-600 border border-red-100";
        } else if (diffDays === 0) {
            autoRenewWarning = `🔴 Auto-renews Today`;
            warningColor = "bg-red-50 text-red-600 border border-red-100";
        } else if (diffDays <= 7) {
            autoRenewWarning = `🔴 Auto-renews in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
            warningColor = "bg-red-50 text-red-600 border border-red-100";
        } else if (diffDays <= 45 && sub.billingCycle === 'Annual') {
            autoRenewWarning = `Please Review (${diffDays} days)`;
            warningColor = "bg-orange-50 text-orange-600 border border-orange-100";
        } else if (diffDays <= 30) {
            autoRenewWarning = `Renews in ${diffDays} days`;
        }
    }


    // Usage Logic
    const daysSinceUsed = sub.lastUsedDate ? (new Date().getTime() - new Date(sub.lastUsedDate).getTime()) / (1000 * 60 * 60 * 24) : 999;
    const isUsed = daysSinceUsed <= 30;

    const handleClick = (e: React.MouseEvent) => {
        if (isLocked) {
            // Prevent interaction if locked
            // Ideally, we should trigger the "Upgrade" flow here.
            // Since we don't have the callback passed directly for "onUpgrade",
            // we can rely on the parent (onSelect) or just alert for now.
            // But better: onSelect(sub) might handle it if it checks lock status?
            // No, onSelect opens detail.
            // I will emulate a "soft block" here or just allow select but show lock in detail?
            // User requirement: "Clicking shows 'Upgrade' toast".
            if (onLockedClick) onLockedClick();
            return;
        }

        if (selectionMode && onToggleSelection) {
            e.stopPropagation(); // Prevent detailed view opening
            onToggleSelection(sub.id);
        } else {
            onSelect(sub);
        }
    };

    // Auto-detect business context if data is present
    const showBusinessUI = isBusiness || (sub.seatsTotal !== undefined && sub.seatsTotal > 0) || !!sub.department;

    // Badge Logic: If urgent renewal warning exists, force "Days Left" to be neutral to avoid double-red
    const daysLeftColor = autoRenewWarning ? 'bg-gray-100 text-gray-500' : (diffDays <= 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500');

    return (
        <motion.div
            layout
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1, scale: isSelected ? 0.98 : 1 }}
            whileHover={{ y: selectionMode ? 0 : -5, scale: selectionMode ? 1 : 1.02, zIndex: 10, transition: { duration: 0.2 } }}
            onClick={handleClick}
            className={`p-4 rounded-[1.25rem] shadow-[0_4px_20px_rgb(0,0,0,0.05)] flex flex-col md:flex-row md:items-center justify-between relative cursor-pointer border transition-colors overflow-hidden ${isSelected
                ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                }`}
        >
            {/* LOCKED OVERLAY */}
            {isLocked && (
                <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-[1.25rem]">
                    <div className="bg-gray-900/90 text-white px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg scale-90">
                        <span className="text-xs font-bold">🔒 Locked</span>
                    </div>
                </div>
            )}

            <div className={`flex items-start gap-4 flex-1 ${isLocked ? 'blur-sm opacity-50' : ''}`}>
                {selectionMode && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`flex-shrink-0 text-indigo-600 mt-2`}
                    >
                        {isSelected ? <CheckCircle fill="currentColor" className="text-white" size={24} /> : <Circle className="text-gray-300" size={24} />}
                    </motion.div>
                )}

                <div className="flex-shrink-0 w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden">
                    <ServiceLogo name={sub.name} logoUrl={sub.logoUrl} size={24} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 text-base leading-none truncate">{sub.name}</h4>
                        {sub.department && showBusinessUI && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-600 border border-slate-200 tracking-wider">
                                {sub.department}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* 1. Status/Date Badge: Show Business Warning if exists (Priority), otherwise Standard Date */}
                        {autoRenewWarning ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block ${warningColor}`}>
                                {autoRenewWarning}
                            </span>
                        ) : (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block ${daysLeftColor}`}>
                                {daysLeftText}
                            </span>
                        )}



                        {sub.tags?.includes('Trial') && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md inline-block bg-indigo-100 text-indigo-700">
                                Trial
                            </span>
                        )}

                        {/* Family Sharing Badge (V2) */}
                        {isSharedWithFamily && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md inline-block bg-purple-100 text-purple-700 flex items-center gap-1">
                                <Users size={10} />
                                Family
                            </span>
                        )}
                    </div>

                    {showBusinessUI && (
                        // Business Stats
                        <div className="mt-3 space-y-2">
                            {sub.seatsTotal !== undefined && sub.seatsTotal > 0 && (
                                <div className="max-w-[200px]">
                                    <div className="flex justify-between items-center text-[10px] font-medium text-slate-500 mb-1">
                                        <div className="flex items-center gap-1">
                                            <span>Seats</span>
                                            <div title="Unused seats are billed but not assigned." className="cursor-help text-slate-400 hover:text-slate-600">
                                                <InfoIcon size={10} />
                                            </div>
                                        </div>
                                        <span><span className="text-slate-900 font-bold">{sub.seatsAssigned || 0}</span> / {sub.seatsTotal} used</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${Math.min(100, ((sub.seatsAssigned || 0) / sub.seatsTotal) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                        {((sub.seatsTotal || 0) - (sub.seatsAssigned || 0)) > 0 ? (
                                            <span className="text-orange-500">
                                                {((sub.seatsTotal || 0) - (sub.seatsAssigned || 0))} unused
                                            </span>
                                        ) : <span className="text-emerald-500">Fully utilized</span>}
                                        <span className="text-slate-300">•</span>
                                        <span>Owner: <span className="font-medium text-slate-600">{sub.ownerName || (sub.ownerUserId ? 'Internal' : 'Unassigned')}</span></span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className={`mt-4 md:mt-0 md:text-right flex-shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-gray-50 md:pl-4 ${isLocked ? 'blur-sm opacity-50' : ''}`}>
                <div className="flex flex-col items-start md:items-end">
                    <div className="flex items-center gap-1">
                        <p className="font-black text-gray-900 text-base leading-tight">
                            {formatCurrency(displayAmount, displayCurrency)}
                        </p>
                        {/* Price Change Badge - next to amount */}
                        {sub.previous_amount && sub.previous_amount !== sub.amount && (!sub.previous_amount_date || (new Date().getTime() - new Date(sub.previous_amount_date).getTime()) < (30 * 24 * 60 * 60 * 1000)) && (

                            <span className={`text-xs font-bold ${sub.amount > sub.previous_amount
                                ? 'text-red-500'
                                : 'text-green-500'
                                }`}>
                                {sub.amount > sub.previous_amount ? 'Price ↑' : 'Price ↓'}
                                ({Math.abs(((sub.amount - sub.previous_amount) / sub.previous_amount) * 100).toFixed(0)}%)
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 justify-start md:justify-end w-full">
                        {/* Shared indicator */}
                        {isShared && (
                            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <Users size={10} /> ({sub.sharedWith + 1})
                            </span>
                        )}
                        <p className="text-[10px] text-gray-400 font-medium capitalize tracking-wide text-left md:text-right">
                            {sub.billingCycle}
                        </p>
                    </div>
                </div>

                {!selectionMode && (
                    <div className="flex items-center gap-2 mt-0 md:mt-3">
                        {sub.cancelUrl && (
                            <a
                                href={sub.cancelUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                    if (showBusinessUI) {
                                        if (!confirm(`⚠️ Warning: Determining to cancel ${sub.name}.\n\nThis may affect team access for ${sub.seatsAssigned || 'all'} users.\n\nContinue to provider?`)) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }
                                    }
                                    e.stopPropagation();
                                }}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors border ${showBusinessUI
                                    ? 'text-red-600 bg-white border-red-200 hover:bg-red-50 hover:border-red-300'
                                    : 'text-orange-500 bg-orange-50 border-transparent hover:bg-orange-100'
                                    }`}
                            >
                                {showBusinessUI ? 'Cancel Request' : 'Cancel'}
                            </a>
                        )}
                        {/* Mark as Paid button for overdue manual_pay subscriptions */}
                        {paymentMode === 'manual_pay' && status.type === 'overdue' && onMarkAsPaid && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onMarkAsPaid(sub); }}
                                className="text-[10px] bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1"
                            >
                                💵 Mark Paid
                            </button>
                        )}
                        {/* Used Status / Action */}
                        {!sub.tags?.includes('Trial') && (
                            isUsed ? (
                                <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                    <CheckCircle size={10} /> Used
                                </span>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMarkAsUsed(sub.id); }}
                                    className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-bold transition-colors"
                                >
                                    Mark Used
                                </button>
                            )
                        )}
                    </div>
                )}
            </div>
        </motion.div >
    );
};

export default SubscriptionCard;
