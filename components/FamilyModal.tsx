import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Copy, Check, LogOut, UserPlus, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface FamilyModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    currency: string;
}

const FamilyModal: React.FC<FamilyModalProps> = ({ isOpen, onClose, user, currency }) => {
    const [mode, setMode] = useState<'view' | 'create' | 'join'>('view');
    const [familyGroup, setFamilyGroup] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && user) {
            fetchFamilyStatus();
        }
    }, [isOpen, user]);

    const fetchFamilyStatus = async () => {
        setLoading(true);
        setError(null);
        try {
            // Check if user is in a family (member or owner)
            const { data: memberData, error: memberError } = await supabase
                .from('family_members')
                .select('*, group:family_groups(*)')
                .eq('user_id', user.id)
                .single();

            if (memberData) {
                setFamilyGroup(memberData.group);
                // Fetch all members of this group
                const { data: allMembers } = await supabase
                    .from('family_members')
                    .select('*, user:users(name, email, avatar)')
                    .eq('group_id', memberData.group_id);

                if (allMembers) setMembers(allMembers);
                setMode('view');
            } else {
                // Check if user is an owner directly (edge case)
                const { data: ownerData } = await supabase
                    .from('family_groups')
                    .select('*')
                    .eq('owner_id', user.id)
                    .single();

                if (ownerData) {
                    setFamilyGroup(ownerData);
                    const { data: allMembers } = await supabase
                        .from('family_members')
                        .select('*, user:users(name, email, avatar)')
                        .eq('group_id', ownerData.id);
                    if (allMembers) setMembers(allMembers);
                    setMode('view');
                } else {
                    setFamilyGroup(null);
                    setMembers([]);
                    setMode('create'); // Default to create/join options
                }
            }
        } catch (err) {
            console.error('Error fetching family:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFamily = async () => {
        if (!user.isPremium) {
            setError("Only Premium users can create a family.");
            return;
        }
        setLoading(true);
        try {
            const code = 'FAM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data, error } = await supabase
                .from('family_groups')
                .insert({
                    owner_id: user.id,
                    name: `${user.name}'s Family`,
                    invite_code: code
                })
                .select()
                .single();

            if (error) throw error;

            // Add self as owner member
            await supabase.from('family_members').insert({
                group_id: data.id,
                user_id: user.id,
                role: 'owner'
            });

            await fetchFamilyStatus();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinFamily = async () => {
        setLoading(true);
        setError(null);
        try {
            // Find group by code
            const { data: group, error: groupError } = await supabase
                .from('family_groups')
                .select('*')
                .eq('invite_code', joinCode.trim())
                .single();

            if (!group || groupError) throw new Error("Invalid invite code");

            // Join
            const { error: joinError } = await supabase
                .from('family_members')
                .insert({
                    group_id: group.id,
                    user_id: user.id,
                    role: 'member'
                });

            if (joinError) throw joinError;

            await fetchFamilyStatus();
        } catch (err: any) {
            setError(err.message || "Failed to join");
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveFamily = async () => {
        if (!confirm("Are you sure you want to leave this family?")) return;
        setLoading(true);
        try {
            await supabase
                .from('family_members')
                .delete()
                .eq('user_id', user.id);

            setFamilyGroup(null);
            setMembers([]);
            setMode('create');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const copyCode = () => {
        if (familyGroup?.invite_code) {
            navigator.clipboard.writeText(familyGroup.invite_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Users size={20} className="text-indigo-600" />
                        Family Sharing
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
                    ) : familyGroup ? (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Users size={32} className="text-indigo-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">{familyGroup.name}</h2>
                                <p className="text-sm text-gray-500">
                                    {members.length} member{members.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            {/* Invite Section (Owner Only or Visible to all?) Usually owner only manages invites, but code can be shared by anyone */}
                            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                <label className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2 block">Invite Code</label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-white px-3 py-2 rounded-lg border border-indigo-200 text-lg font-mono font-bold text-gray-800 text-center tracking-widest">
                                        {familyGroup.invite_code}
                                    </code>
                                    <button
                                        onClick={copyCode}
                                        className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                    >
                                        {copied ? <Check size={20} /> : <Copy size={20} />}
                                    </button>
                                </div>
                                <p className="text-xs text-indigo-600/70 mt-2 text-center">
                                    Share this code to invite members to your family.
                                </p>
                            </div>

                            {/* Members List */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-3">Members</h4>
                                <div className="space-y-2">
                                    {members.map(member => (
                                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-600">
                                                    {member.user?.name?.[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">
                                                        {member.user?.name} {member.user_id === user.id && '(You)'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 capitalize">{member.role}</div>
                                                </div>
                                            </div>
                                            {member.role === 'owner' && <Shield size={14} className="text-amber-500" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleLeaveFamily}
                                className="w-full py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                <LogOut size={16} /> Leave Family
                            </button>
                        </div>
                    ) : (
                        // Not in a family -> Create or Join
                        <div className="space-y-6">
                            {mode === 'create' ? (
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white">
                                            <UserPlus size={32} />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900">Create a Family</h2>
                                        <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                                            Share your subscription limits with up to 5 family members.
                                        </p>
                                    </div>

                                    {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg text-center">{error}</div>}

                                    <button
                                        onClick={handleCreateFamily}
                                        className="w-full py-3 bg-black text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                                    >
                                        Create Family Group
                                    </button>

                                    <div className="relative py-2">
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                                        <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-gray-400">OR</span></div>
                                    </div>

                                    <button
                                        onClick={() => setMode('join')}
                                        className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                    >
                                        Join an Existing Family
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <h2 className="text-xl font-bold text-gray-900">Join Family</h2>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Enter the invite code from the family owner.
                                        </p>
                                    </div>

                                    {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg text-center">{error}</div>}

                                    <input
                                        type="text"
                                        placeholder="FAM-XXXXXX"
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-3 text-center text-2xl font-mono font-bold border-2 border-gray-200 rounded-xl focus:border-indigo-600 outline-none uppercase tracking-widest placeholder-gray-300"
                                        maxLength={10}
                                        autoFocus
                                    />

                                    <button
                                        onClick={handleJoinFamily}
                                        disabled={!joinCode}
                                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                                    >
                                        Join Family
                                    </button>

                                    <button
                                        onClick={() => setMode('create')}
                                        className="w-full py-2 text-gray-500 text-sm font-medium hover:text-gray-900"
                                    >
                                        Back to Create
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default FamilyModal;
