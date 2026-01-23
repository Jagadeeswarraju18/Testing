import React from 'react';
import { Trash2, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BulkActionBarProps {
    selectedCount: number;
    onClear: () => void;
    onDelete: () => void;
    onMarkUsed: () => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({ selectedCount, onClear, onDelete, onMarkUsed }) => {
    return (
        <AnimatePresence>
            {selectedCount > 0 && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-24 left-0 right-0 px-4 z-50 flex justify-center pointer-events-none"
                >
                    <div className="bg-gray-900 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-6 pointer-events-auto max-w-sm w-full justify-between border border-gray-700">
                        <div className="flex items-center gap-3">
                            <span className="bg-white text-black font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                {selectedCount}
                            </span>
                            <span className="text-sm font-medium">Selected</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={onMarkUsed}
                                className="p-2 hover:bg-gray-700 rounded-full transition-colors text-green-400"
                                title="Mark as Used"
                            >
                                <CheckCircle size={20} />
                            </button>
                            <div className="w-px h-6 bg-gray-700"></div>
                            <button
                                onClick={onDelete}
                                className="p-2 hover:bg-gray-700 rounded-full transition-colors text-red-400"
                                title="Delete Selected"
                            >
                                <Trash2 size={20} />
                            </button>
                            <button
                                onClick={onClear}
                                className="ml-2 p-1 hover:bg-gray-700 rounded-full transition-colors text-gray-400"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BulkActionBar;
