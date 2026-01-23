import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    isVisible: boolean;
    message: string;
    type?: ToastType;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ isVisible, message, type = 'info', onClose }) => {
    React.useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    const styles = {
        success: {
            bg: 'bg-green-50 border-green-200',
            icon: <CheckCircle className="text-green-500" size={20} />,
            text: 'text-green-800'
        },
        error: {
            bg: 'bg-red-50 border-red-200',
            icon: <AlertCircle className="text-red-500" size={20} />,
            text: 'text-red-800'
        },
        info: {
            bg: 'bg-blue-50 border-blue-200',
            icon: <Info className="text-blue-500" size={20} />,
            text: 'text-blue-800'
        }
    };

    const style = styles[type];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20, x: "-50%", scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                    exit={{ opacity: 0, y: -20, x: "-50%", scale: 0.9 }}
                    className="fixed top-6 left-1/2 z-[9999] w-[90%] max-w-sm"
                >
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border ${style.bg}`}>
                        {style.icon}
                        <p className={`flex-1 font-medium text-sm ${style.text}`}>{message}</p>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-black/5 rounded-full transition-colors"
                        >
                            <X size={16} className="text-gray-400" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
