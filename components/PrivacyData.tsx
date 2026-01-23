import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { AlertTriangle, X } from 'lucide-react';

interface PrivacyDataProps {
    user: User;
    onBack: () => void;
}

const PrivacyData: React.FC<PrivacyDataProps> = ({ user, onBack }) => {
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
    const [error, setError] = useState<string | null>(null);

    const handleExportData = async () => {
        setExporting(true);
        try {
            const { data: workspaces } = await supabase.from('workspaces').select('*').eq('ownerId', user.id);
            const workspaceIds = workspaces?.map(w => w.id) || [];

            const { data: subscriptions } = await supabase
                .from('subscriptions')
                .select('*')
                .in('workspaceId', workspaceIds);

            const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();

            const exportData = {
                user: profile,
                workspaces,
                subscriptions,
                exportedAt: new Date().toISOString(),
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `spendyx-data-${user.id}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            setError('Failed to export data. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteStep === 1) {
            setDeleteStep(2);
            return;
        }

        setDeleting(true);
        try {
            const { data: workspaces } = await supabase.from('workspaces').select('id').eq('ownerId', user.id);
            const workspaceIds = workspaces?.map(w => w.id) || [];

            if (workspaceIds.length > 0) {
                await supabase.from('subscriptions').delete().in('workspaceId', workspaceIds);
            }

            await supabase.from('workspaces').delete().eq('ownerId', user.id);
            await supabase.from('users').delete().eq('id', user.id);

            // Clear local preferences so tour/onboarding shows again
            localStorage.removeItem(`spendyx_feature_tour_seen_${user.id}`);
            localStorage.removeItem('spendyx_feature_tour_seen'); // Clear legacy key
            localStorage.removeItem('spendyx_notifications'); // Clear notification preference

            await supabase.auth.signOut();
            window.location.reload();

        } catch (error) {
            console.error('Delete failed:', error);
            setError('Failed to delete some data. You may need to try again or contact support.');
            setDeleting(false);
            setShowDeleteConfirm(false);
            setDeleteStep(1);
        }
    };

    return (
        <div className="p-6 bg-white min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center mb-8">
                <button onClick={onBack} className="mr-4 text-gray-500 hover:text-gray-900">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-900">Privacy & Data Check</h2>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error}
                    <button onClick={() => setError(null)} className="float-right text-red-400 hover:text-red-600">×</button>
                </div>
            )}

            <div className="max-w-xl mx-auto space-y-8">

                {/* Privacy Policy Summary */}
                <section className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Data Privacy Promise
                    </h3>
                    <p className="text-gray-600 mb-2 leading-relaxed">
                        Your data is yours. We do not sell your subscription history to third parties.
                        All financial data is stored securely using row-level security, ensuring only you can access it.
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                        We use industry-standard encryption for all data transmission.
                    </p>
                </section>

                {/* Data Controls */}
                <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Data Controls</h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                            <div>
                                <h4 className="font-medium text-gray-900">Export My Data</h4>
                                <p className="text-sm text-gray-500">Download a copy of all your subscriptions and settings.</p>
                            </div>
                            <button
                                onClick={handleExportData}
                                disabled={exporting}
                                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                            >
                                {exporting ? 'Exporting...' : 'Export JSON'}
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white border border-red-100 rounded-lg hover:border-red-200 transition-colors">
                            <div>
                                <h4 className="font-medium text-red-700">Delete Account</h4>
                                <p className="text-sm text-red-500">Permanently remove all data and sign out.</p>
                            </div>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Contact */}
                <div className="text-center pt-8 border-t border-gray-100">
                    <p className="text-sm text-gray-400">Questions about privacy? Contact privacy@spendyx.app</p>
                </div>

            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setShowDeleteConfirm(false); setDeleteStep(1); }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-5">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="flex-shrink-0 p-3 bg-red-100 rounded-full">
                                        <AlertTriangle className="text-red-600" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 text-lg">
                                            {deleteStep === 1 ? 'Delete Account?' : 'Final Confirmation'}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {deleteStep === 1
                                                ? 'This action is PERMANENT and cannot be undone. All your subscriptions, workspaces, and history will be erased.'
                                                : 'Are you absolutely sure? There is no going back. All data will be permanently deleted.'
                                            }
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setShowDeleteConfirm(false); setDeleteStep(1); }}
                                        className="p-1 hover:bg-gray-100 rounded-full"
                                    >
                                        <X size={18} className="text-gray-400" />
                                    </button>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setShowDeleteConfirm(false); setDeleteStep(1); }}
                                        className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700 text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={deleting}
                                        className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                                    >
                                        {deleting ? 'Deleting...' : (deleteStep === 1 ? 'Yes, Delete' : 'Delete Forever')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PrivacyData;
