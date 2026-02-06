import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Check, CreditCard } from 'lucide-react';
import { Subscription } from '../types';

interface MarkAsPaidModalProps {
    isOpen: boolean;
    onClose: () => void;
    subscription: Subscription | null;
    onConfirm: (paidDate: string) => void;
}

const MarkAsPaidModal: React.FC<MarkAsPaidModalProps> = ({
    isOpen,
    onClose,
    subscription,
    onConfirm
}) => {
    const [selectedOption, setSelectedOption] = useState<'today' | 'dueDate' | 'custom'>('dueDate');
    const [customDate, setCustomDate] = useState('');

    if (!isOpen || !subscription) return null;

    const today = new Date();
    const dueDate = new Date(subscription.renewalDate);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleConfirm = () => {
        let paidDate: string;

        switch (selectedOption) {
            case 'today':
                paidDate = today.toISOString();
                break;
            case 'dueDate':
                paidDate = subscription.renewalDate;
                break;
            case 'custom':
                if (!customDate) {
                    alert('Please select a date');
                    return;
                }
                paidDate = new Date(customDate).toISOString();
                break;
        }

        onConfirm(paidDate);
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-full">
                                <CreditCard className="text-green-600" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Mark as Paid</h3>
                                <p className="text-xs text-gray-500">{subscription.name}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={18} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-5">
                        <p className="text-sm text-gray-600 mb-4">When did you pay?</p>

                        <div className="space-y-2">
                            {/* Option: Today */}
                            <label
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedOption === 'today'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-100 hover:border-gray-200'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="paymentDate"
                                    checked={selectedOption === 'today'}
                                    onChange={() => setSelectedOption('today')}
                                    className="hidden"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedOption === 'today' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                                    }`}>
                                    {selectedOption === 'today' && <Check size={12} className="text-white" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">Today</p>
                                    <p className="text-xs text-gray-500">{formatDate(today)}</p>
                                </div>
                            </label>

                            {/* Option: Due Date */}
                            <label
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedOption === 'dueDate'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-100 hover:border-gray-200'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="paymentDate"
                                    checked={selectedOption === 'dueDate'}
                                    onChange={() => setSelectedOption('dueDate')}
                                    className="hidden"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedOption === 'dueDate' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                                    }`}>
                                    {selectedOption === 'dueDate' && <Check size={12} className="text-white" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">On due date</p>
                                    <p className="text-xs text-gray-500">{formatDate(dueDate)}</p>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Recommended</span>
                            </label>

                            {/* Option: Custom */}
                            <label
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedOption === 'custom'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-100 hover:border-gray-200'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="paymentDate"
                                    checked={selectedOption === 'custom'}
                                    onChange={() => setSelectedOption('custom')}
                                    className="hidden"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedOption === 'custom' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                                    }`}>
                                    {selectedOption === 'custom' && <Check size={12} className="text-white" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">Custom date</p>
                                    {selectedOption === 'custom' && (
                                        <input
                                            type="date"
                                            value={customDate}
                                            onChange={(e) => setCustomDate(e.target.value)}
                                            max={today.toISOString().split('T')[0]}
                                            className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}
                                </div>
                                <Calendar size={16} className="text-gray-400" />
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 p-5 pt-0">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700 text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <Check size={16} />
                            Confirm
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MarkAsPaidModal;
