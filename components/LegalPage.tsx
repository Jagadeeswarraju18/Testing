import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface LegalPageProps {
    type: 'privacy' | 'terms';
    onBack?: () => void;
}

const LegalPage: React.FC<LegalPageProps> = ({ type, onBack }) => {
    const isPrivacy = type === 'privacy';
    const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
    const lastUpdated = 'January 1, 2024';

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            window.history.back();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">{title}</h1>
                </div>
            </header>

            <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 prose prose-sm md:prose-base max-w-none text-gray-700">
                    <p className="text-sm text-gray-400 mb-8">Effective Date: {lastUpdated}</p>

                    {isPrivacy ? (
                        <>
                            <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">1. Introduction</h2>
                            <p className="mb-4">Spendyx ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by Spendyx.</p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">2. Information We Collect</h2>
                            <ul className="list-disc pl-5 mb-4 space-y-2">
                                <li><strong>Personal Information:</strong> We collect your name, email address, and profile picture to create your account.</li>
                                <li><strong>Financial Data:</strong> We do <strong>not</strong> store your credit card information. Payments are processed securely via our payment partners (Google Play Store, Razorpay, RevenueCat).</li>
                                <li><strong>Subscription Data:</strong> We store the subscription details you manually enter (name, cost, renewal date) to provide the service.</li>
                            </ul>

                            <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">3. How We Use Your Information</h2>
                            <ul className="list-disc pl-5 mb-4 space-y-2">
                                <li>To provide and maintain our Service.</li>
                                <li>To notify you about subscription renewals.</li>
                                <li>To provide customer support.</li>
                            </ul>

                            <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">4. Data Security</h2>
                            <p className="mb-4">We use industry-standard encryption to protect your data. Your data is stored securely in the cloud.</p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">5. Data Processors (Sub-processors)</h2>
                            <p className="mb-4">To provide our service, we share data with the following trusted third-party providers:</p>
                            <ul className="list-disc pl-5 mb-4 space-y-2">
                                <li><strong>Supabase:</strong> Authentication, Database, and secure backend hosting.</li>
                                <li><strong>RevenueCat:</strong> Management of app subscriptions and purchase tracking.</li>
                                <li><strong>Razorpay:</strong> Payment processing for web users.</li>
                                <li><strong>Google Play:</strong> Payment processing for Android users.</li>
                            </ul>

                            <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">6. Contact Us</h2>
                            <p className="mb-4">If you have any questions about this Privacy Policy, please contact us at: <a href="mailto:jwrstack@gmail.com" className="text-indigo-600 font-medium">jwrstack@gmail.com</a></p>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">1. Acceptance of Terms</h2>
                            <p className="mb-4">By accessing or using Spendyx, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.</p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">2. Subscriptions</h2>
                            <p className="mb-4">Some parts of the Service are billed on a subscription basis ("Premium"). You will be billed in advance on a recurring and periodic basis (such as monthly or annually).</p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">3. Free Plan Limits</h2>
                            <p className="mb-4">The Free Plan is limited to 6 active subscriptions across all workspaces. You may upgrade to Premium for unlimited access.</p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">4. Termination</h2>
                            <p className="mb-4">We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">5. Changes</h2>
                            <p className="mb-4">We reserve the right, at our sole discretion, to modify or replace these Terms at any time.</p>

                            <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">6. Contact Us</h2>
                            <p className="mb-4">If you have any questions about these Terms, please contact us at: <a href="mailto:jwrstack@gmail.com" className="text-indigo-600 font-medium">jwrstack@gmail.com</a></p>
                        </>
                    )}
                </div>
            </main>

            <footer className="bg-white border-t border-gray-100 py-8 text-center text-sm text-gray-400">
                <p>&copy; {new Date().getFullYear()} Spendyx. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LegalPage;
