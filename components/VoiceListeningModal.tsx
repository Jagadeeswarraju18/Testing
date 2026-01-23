import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Check } from 'lucide-react';

interface VoiceListeningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDone: () => void;  // New: Triggered when user taps Done
    transcript: string;
    isProcessing: boolean;
}

const VoiceListeningModal: React.FC<VoiceListeningModalProps> = ({ isOpen, onClose, onDone, transcript, isProcessing }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center gap-6 text-center"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        >
                            <X size={20} />
                        </button>

                        <div className="relative">
                            {/* Pulsing Rings */}
                            <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-75" />
                            <div className="absolute inset-0 bg-red-200 rounded-full animate-pulse opacity-50 delay-75" />

                            <div className="relative w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-red-200">
                                <Mic className="text-white" size={32} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-gray-800">
                                {isProcessing ? "Processing..." : "Listening..."}
                            </h3>
                            <p className="text-gray-500 text-sm">
                                Say something like <br />
                                <span className="font-medium text-indigo-500">"Netflix $15 monthly"</span>
                            </p>
                        </div>

                        {/* Live Transcript Box */}
                        <div className="w-full min-h-[100px] bg-gray-50 rounded-2xl p-4 flex items-center justify-center border-2 border-dashed border-gray-200">
                            {transcript ? (
                                <span className="text-lg font-medium text-gray-700 leading-relaxed">
                                    "{transcript}"
                                </span>
                            ) : (
                                <span className="text-gray-400 text-sm italic">
                                    Listening for speech...
                                </span>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 w-full">
                            {/* Done Button - Only show when there's a transcript */}
                            {transcript && !isProcessing && (
                                <button
                                    onClick={onDone}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                >
                                    <Check size={20} />
                                    Done
                                </button>
                            )}

                            <button
                                onClick={onClose}
                                className="text-gray-400 text-sm hover:text-gray-600 font-medium py-2"
                            >
                                Cancel
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default VoiceListeningModal;

