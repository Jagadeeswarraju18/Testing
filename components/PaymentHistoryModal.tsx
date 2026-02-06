import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Check } from 'lucide-react';
import { formatCurrency } from '../utils';

interface PaymentHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: any[];
}

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({ isOpen, onClose, history }) => {
    if (!isOpen) return null;

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
                    className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <FileText size={20} className="text-purple-600" />
                            Payment History
                        </h3>
                        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {history.length > 0 ? (
                            history.map((payment) => (
                                <div key={payment.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-gray-900 text-lg">
                                            {formatCurrency(payment.amount, payment.currency || 'INR')}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${payment.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {payment.status === 'active' && <Check size={10} />}
                                            {payment.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-gray-500 text-xs mt-2 pt-2 border-t border-gray-50">
                                        <span>{new Date(payment.purchase_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                        <span className="font-mono text-[10px] bg-gray-50 px-1.5 py-0.5 rounded text-gray-400">
                                            #{payment.transaction_reference?.slice(-6) || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-300 mt-1 font-mono break-all line-clamp-1">
                                        REF: {payment.transaction_reference || (payment.id ? payment.id : 'N/A')}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                                    <FileText size={32} />
                                </div>
                                <h4 className="text-gray-900 font-bold mb-1">No payments yet</h4>
                                <p className="text-gray-400 text-xs">Your invoice history will appear here once you make a purchase.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PaymentHistoryModal;
