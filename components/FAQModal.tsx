import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FAQItem {
    question: string;
    answer: string;
}

const FAQS: FAQItem[] = [
    {
        question: "Does Spendyx automatically cancel my subscriptions?",
        answer: "No. Spendyx is a tracker. We help you monitor your spending and due dates, but to cancel a subscription, you must visit the service provider's website (e.g., Netflix.com) directly."
    },
    {
        question: "Is my data secure?",
        answer: "Yes! We prioritize your privacy. Your subscription data is stored securely. We do not sell your personal data to third parties."
    },
    {
        question: "How do I change my currency?",
        answer: "Go to Settings (tap your profile picture) and look for the 'Currency' option. You can select from major world currencies, and we'll automatically convert your existing prices."
    },
    {
        question: "Can I separate personal and work subscriptions?",
        answer: "Absolutely! Use the 'Workspace Switcher' at the top of your dashboard to toggle between 'Personal' and 'Business' modes. Each has its own list and budget."
    },
    {
        question: "How do price alerts work?",
        answer: "If you edit a subscription's price (e.g., Netflix raises rates), we'll detect the change and verify it. If confirmed, we'll verify it and highlight the increase on your dashboard."
    },
    {
        question: "What happens if I exceed my budget?",
        answer: "Your budget bar will turn red to warn you. This is just a visual guide to help you stay on track—it won't stop your subscriptions from renewing."
    },
    {
        question: "How do I delete a subscription?",
        answer: "You can tap on any subscription card to open its details, then scroll down to find the 'Delete Subscription' button."
    },
    {
        question: "Does the app connect to my bank account?",
        answer: "No. Spendyx is designed to be manual and privacy-focused. You add what you want to track. We don't require bank logins or credentials."
    },
    {
        question: "Can I track yearly payments?",
        answer: "Yes. When adding a subscription, simply select 'Yearly' as the billing cycle. We'll calculate the monthly equivalent for your budget view automatically."
    },
    {
        question: "I found a bug. How do I report it?",
        answer: "We appreciate your help! Go to Settings > Help & Support and tap 'Report a Bug' to send us an email directly."
    }
];

interface FAQModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FAQModal: React.FC<FAQModalProps> = ({ isOpen, onClose }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleIndex = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 max-w-md mx-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-[2.5rem]" // Matches App radius if any, or just fills rect
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative max-h-[85vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                    <HelpCircle size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">FAQ</h2>
                                    <p className="text-xs text-gray-500">Frequently Asked Questions</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable List */}
                        <div className="overflow-y-auto p-6 space-y-3 pb-24">
                            {FAQS.map((faq, index) => (
                                <motion.div
                                    key={index}
                                    initial={false}
                                    className={`border rounded-2xl overflow-hidden transition-colors ${openIndex === index ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-white'}`}
                                >
                                    <button
                                        onClick={() => toggleIndex(index)}
                                        className="w-full flex items-center justify-between p-4 text-left gap-4"
                                    >
                                        <span className={`font-semibold text-sm ${openIndex === index ? 'text-blue-700' : 'text-gray-700'}`}>
                                            {faq.question}
                                        </span>
                                        {openIndex === index ? (
                                            <ChevronUp size={18} className="text-blue-500 shrink-0" />
                                        ) : (
                                            <ChevronDown size={18} className="text-gray-400 shrink-0" />
                                        )}
                                    </button>
                                    <AnimatePresence>
                                        {openIndex === index && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-blue-100/50 pt-3">
                                                    {faq.answer}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}

                            <div className="pt-6 text-center">
                                <p className="text-xs text-gray-400 mb-2">Still have questions?</p>
                                <a
                                    href="mailto:jwrstack@gmail.com"
                                    className="text-sm font-bold text-indigo-600 hover:underline"
                                >
                                    Contact Support
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default FAQModal;
