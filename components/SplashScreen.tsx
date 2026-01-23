import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
    onComplete: () => void;
    duration?: number; // Total duration in ms
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, duration = 2000 }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            // Give time for exit animation
            setTimeout(onComplete, 500);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
                >
                    {/* Background animated shapes */}
                    <div className="absolute inset-0 overflow-hidden">
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.1 }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 blur-3xl"
                        />
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.1 }}
                            transition={{ duration: 1, delay: 0.4 }}
                            className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 blur-3xl"
                        />
                    </div>

                    {/* Logo container with animations */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 15,
                            delay: 0.1
                        }}
                        className="relative z-10"
                    >
                        {/* Logo image - clean without effects */}
                        <motion.img
                            src="/Spendyx.png"
                            alt="Spendyx"
                            className="relative w-40 h-40 object-contain"
                            initial={{ rotate: -10 }}
                            animate={{ rotate: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                                delay: 0.3
                            }}
                        />
                    </motion.div>

                    {/* App name with stagger animation */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="mt-6 text-center z-10"
                    >
                        <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                            Spendyx
                        </h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8, duration: 0.5 }}
                            className="text-sm text-gray-500 mt-1"
                        >
                            Subscriptions Under Control
                        </motion.p>
                    </motion.div>

                    {/* Loading indicator */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1, duration: 0.3 }}
                        className="mt-12 z-10"
                    >
                        <div className="flex gap-1.5">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        delay: i * 0.15
                                    }}
                                    className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                />
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SplashScreen;
