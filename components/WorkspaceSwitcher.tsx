import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Briefcase, User, Building2, Plus, ChevronDown, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const WorkspaceSwitcher: React.FC = () => {
    const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace } = useWorkspace();
    const [isOpen, setIsOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setCurrentUser(user);
        });
    }, []);

    // Safety: If no active workspace (should rarely happen in Dashboard tab due to parent checks), render simplified or nothing
    if (!activeWorkspace) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 text-gray-400">
                <span className="text-sm font-medium">Loading...</span>
            </div>
        );
    }

    const handleCreateBusiness = async () => {
        if (!currentUser) {
            return;
        }

        if (newWorkspaceName.trim()) {
            const userObj = {
                id: currentUser.id,
                name: currentUser.user_metadata?.name || 'User',
                email: currentUser.email || '',
                defaultCurrency: 'USD'
            };
            try {
                await createWorkspace(newWorkspaceName.trim(), 'business', userObj);
                setNewWorkspaceName('');
                setShowCreateModal(false);
                setIsOpen(false);
            } catch (error) {
                console.error("Failed to create business workspace:", error);
                // Ideally show toast here, but we don't have showToast in props/context here?
                // For now, we rely on the console error. 
                // Context doesn't expose toast. We can alert as fallback or just log.
                // Assuming global toast/error handler might exist or we just ignore UI feedback here for now to avoid breaking hooks.
            }
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors w-full"
            >
                <div className={`p-1.5 rounded-md ${activeWorkspace.type === 'business' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                    {activeWorkspace.type === 'business' ? <Building2 size={18} /> : <User size={18} />}
                </div>
                <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                        <p className="text-xs text-gray-500 font-medium truncate">
                            {activeWorkspace.type === 'business' ? 'Team' : 'Personal'}
                        </p>
                        <ChevronDown size={12} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 leading-none truncate">{activeWorkspace.name}</p>
                </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="p-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 py-1 mb-1">Switch Workspace</p>
                            {workspaces.map(ws => (
                                <button
                                    key={ws.id}
                                    onClick={() => {
                                        setActiveWorkspace(ws);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeWorkspace.id === ws.id ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                                >
                                    {ws.type === 'business' ? <Building2 size={16} className="text-gray-500" /> : <User size={16} className="text-gray-500" />}
                                    <span className={`flex-1 text-left ${activeWorkspace.id === ws.id ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                        {ws.name}
                                    </span>
                                    {activeWorkspace.id === ws.id && <Check size={14} className="text-blue-600" />}
                                </button>
                            ))}

                            <div className="h-px bg-gray-100 my-1"></div>

                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                                <Plus size={16} />
                                Create Business Team
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Create Workspace Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                            onClick={() => { setShowCreateModal(false); setNewWorkspaceName(''); }}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ duration: 0.15 }}
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                                            <Building2 size={20} />
                                        </div>
                                        <h3 className="font-bold text-gray-900">New Business Team</h3>
                                    </div>
                                    <button
                                        onClick={() => { setShowCreateModal(false); setNewWorkspaceName(''); }}
                                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="p-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Company Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newWorkspaceName}
                                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newWorkspaceName.trim()) {
                                                handleCreateBusiness();
                                            }
                                            if (e.key === 'Escape') {
                                                setShowCreateModal(false);
                                                setNewWorkspaceName('');
                                            }
                                        }}
                                        placeholder="e.g., Acme Inc."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                                        autoFocus
                                    />
                                    <p className="text-xs text-gray-400 mt-2">
                                        Create a separate workspace for your business subscriptions
                                    </p>
                                </div>

                                {/* Footer */}
                                <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
                                    <button
                                        onClick={() => { setShowCreateModal(false); setNewWorkspaceName(''); }}
                                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateBusiness}
                                        disabled={!newWorkspaceName.trim()}
                                        className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Create Team
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WorkspaceSwitcher;
