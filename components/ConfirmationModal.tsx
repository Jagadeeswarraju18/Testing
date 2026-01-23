import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, X, Loader } from 'lucide-react';

export type ConfirmationType = 'danger' | 'warning' | 'success' | 'info';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmationType;
    isLoading?: boolean;
    showCancel?: boolean;
    onCancel?: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning',
    isLoading = false,
    showCancel = true,
    onCancel
}) => {
    if (!isOpen) return null;

    const icons = {
        danger: <AlertTriangle className="text-red-500" size={28} />,
        warning: <AlertTriangle className="text-amber-500" size={28} />,
        success: <CheckCircle className="text-green-500" size={28} />,
        info: <Info className="text-blue-500" size={28} />
    };

    const buttonStyles = {
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-amber-500 hover:bg-amber-600 text-white',
        success: 'bg-green-600 hover:bg-green-700 text-white',
        info: 'bg-blue-600 hover:bg-blue-700 text-white'
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
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-start gap-3 p-5 pb-0">
                        <div className="flex-shrink-0 p-2 bg-gray-100 rounded-full">
                            {icons[type]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
                            <div className="text-sm text-gray-500 mt-1 leading-relaxed">{message}</div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={18} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 p-5">
                        {showCancel && (
                            <button
                                onClick={onCancel || onClose}
                                disabled={isLoading}
                                className="flex-1 py-3 px-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700 text-xs transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 py-3 px-2 rounded-xl font-semibold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1 ${buttonStyles[type]} whitespace-nowrap`}
                        >
                            {isLoading ? <Loader className="animate-spin" size={14} /> : confirmText}
                        </button>
                    </div>
                </motion.div>
            </div >
        </AnimatePresence >
    );
};

export default ConfirmationModal;
