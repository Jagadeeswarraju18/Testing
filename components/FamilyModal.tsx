import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Copy, Check, LogOut, UserPlus, Shield, Share2, Eye, Package, Plus, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User, Subscription, FamilyGroup, FamilyMember, SharedSubscription } from '../types';
import { formatCurrency } from '../utils';
import ServiceLogo from './ServiceLogo';

interface FamilyModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    currency: string;
    subscriptions?: Subscription[]; // Owner's subscriptions (for sharing)
}

type TabType = 'members' | 'shared';

const FamilyModal: React.FC<FamilyModalProps> = ({ isOpen, onClose, user, currency, subscriptions = [] }) => {
    const [mode, setMode] = useState<'view' | 'create' | 'join'>('view');
    const [activeTab, setActiveTab] = useState<TabType>('members');
    const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [sharedSubs, setSharedSubs] = useState<SharedSubscription[]>([]);
    const [loading, setLoading] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSharePicker, setShowSharePicker] = useState(false);

    const isOwner = familyGroup?.owner_id === user.id;

    useEffect(() => {
        if (isOpen && user) {
            fetchFamilyStatus();
        }
    }, [isOpen, user]);

    const fetchFamilyStatus = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('[FamilyModal] Fetching family status for user:', user.id);

            // Step 1: Check if user is in family_members (NO JOIN - avoids RLS issues)
            // Use .limit(1) instead of .maybeSingle() because user might be in multiple groups
            const { data: memberRows, error: memberError } = await supabase
                .from('family_members')
                .select('*')
                .eq('user_id', user.id)
                .order('joined_at', { ascending: false }) // Get most recent first
                .limit(1);

            const memberData = memberRows && memberRows.length > 0 ? memberRows[0] : null;
            console.log('[FamilyModal] Member query result:', { memberData, memberError });

            if (memberData && memberData.group_id) {
                // Step 2: Fetch the family group separately
                const { data: groupData, error: groupError } = await supabase
                    .from('family_groups')
                    .select('*')
                    .eq('id', memberData.group_id)
                    .single();

                console.log('[FamilyModal] Group query result:', { groupData, groupError });

                if (groupData) {
                    setFamilyGroup(groupData as FamilyGroup);

                    // Fetch all members of this group
                    const { data: allMembers } = await supabase
                        .from('family_members')
                        .select('*, user:users(name, email, avatar)')
                        .eq('group_id', memberData.group_id);

                    if (allMembers) setMembers(allMembers as FamilyMember[]);

                    // Fetch shared subscriptions
                    await fetchSharedSubscriptions(memberData.group_id);

                    setMode('view');
                    return; // Exit early, we found the family
                }
            }

            // Step 3: Check if user is an owner (edge case: owner not in family_members)
            console.log('[FamilyModal] Not a member, checking if owner...');
            const { data: ownerData, error: ownerError } = await supabase
                .from('family_groups')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();

            console.log('[FamilyModal] Owner query result:', { ownerData, ownerError });

            if (ownerData) {
                setFamilyGroup(ownerData as FamilyGroup);
                const { data: allMembers } = await supabase
                    .from('family_members')
                    .select('*, user:users(name, email, avatar)')
                    .eq('group_id', ownerData.id);
                if (allMembers) setMembers(allMembers as FamilyMember[]);
                await fetchSharedSubscriptions(ownerData.id);
                setMode('view');
            } else {
                console.log('[FamilyModal] User is not in any family');
                setFamilyGroup(null);
                setMembers([]);
                setSharedSubs([]);
                setMode('create');
            }
        } catch (err) {
            console.error('[FamilyModal] Unexpected error:', err);
            setError('Failed to load family status. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSharedSubscriptions = async (groupId: string) => {
        try {
            console.log('[FamilyModal] Fetching shared subscriptions for group:', groupId);

            const { data, error } = await supabase
                .from('shared_subscriptions')
                .select(`
                    *,
                    subscription:subscriptions(*)
                `)
                .eq('group_id', groupId);

            console.log('[FamilyModal] Shared subs result:', { data, error, count: data?.length });

            if (data && !error) {
                // Use sharer_name column directly instead of fetching from users
                const enrichedData = data.map((sub) => ({
                    ...sub,
                    sharer: { name: sub.sharer_name || 'Unknown', email: '' }
                }));
                setSharedSubs(enrichedData as SharedSubscription[]);
            } else if (error) {
                console.error('[FamilyModal] Error fetching shared subs:', error);
            }
        } catch (err) {
            console.error('Error fetching shared subscriptions:', err);
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
            const { data: group, error: groupError } = await supabase
                .from('family_groups')
                .select('*')
                .eq('invite_code', joinCode.trim())
                .single();

            if (!group || groupError) throw new Error("Invalid invite code");

            // Check if user is already a member of this group
            const { data: existingMember } = await supabase
                .from('family_members')
                .select('id')
                .eq('group_id', group.id)
                .eq('user_id', user.id)
                .single();

            if (existingMember) {
                throw new Error("You're already a member of this family!");
            }

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
            setSharedSubs([]);
            setMode('create');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleShareSubscription = async (subscriptionId: string) => {
        if (!familyGroup) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('shared_subscriptions')
                .insert({
                    group_id: familyGroup.id,
                    subscription_id: subscriptionId,
                    shared_by: user.id,
                    sharer_name: user.name || 'Unknown', // Store name for display
                    used_by: [user.id] // Owner uses it by default
                });

            if (error) {
                if (error.code === '23505') {
                    setError('This subscription is already shared');
                } else {
                    throw error;
                }
            } else {
                await fetchSharedSubscriptions(familyGroup.id);
                setShowSharePicker(false);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUnshare = async (sharedSubId: string) => {
        if (!confirm("Remove this subscription from family sharing?")) return;
        setLoading(true);
        try {
            await supabase
                .from('shared_subscriptions')
                .delete()
                .eq('id', sharedSubId);

            if (familyGroup) await fetchSharedSubscriptions(familyGroup.id);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleUsage = async (sharedSub: SharedSubscription, memberId: string) => {
        if (!isOwner) return; // Only owner can edit

        const currentUsedBy = sharedSub.used_by || [];
        const newUsedBy = currentUsedBy.includes(memberId)
            ? currentUsedBy.filter(id => id !== memberId)
            : [...currentUsedBy, memberId];

        try {
            await supabase
                .from('shared_subscriptions')
                .update({ used_by: newUsedBy })
                .eq('id', sharedSub.id);

            if (familyGroup) await fetchSharedSubscriptions(familyGroup.id);
        } catch (err) {
            console.error(err);
        }
    };

    const copyCode = () => {
        if (familyGroup?.invite_code) {
            navigator.clipboard.writeText(familyGroup.invite_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Get subscriptions that haven't been shared yet
    const unsharedSubs = subscriptions.filter(
        sub => !sharedSubs.some(ss => ss.subscription_id === sub.id)
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Users size={20} className="text-indigo-600" />
                        Family Sharing
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : familyGroup ? (
                        <div className="space-y-5">
                            {/* Family Header */}
                            <div className="text-center">
                                <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <Users size={28} className="text-indigo-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">{familyGroup.name}</h2>
                                <p className="text-xs text-gray-500">
                                    {members.length} member{members.length !== 1 ? 's' : ''} •
                                    {isOwner ? ' You are the owner' : ' You are a member'}
                                </p>
                            </div>

                            {/* Member-Only Banner */}
                            {!isOwner && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                                    <Eye size={16} className="text-amber-600 flex-shrink-0" />
                                    <p className="text-xs text-amber-700">
                                        You can view shared subscriptions but cannot edit them.
                                    </p>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                                <button
                                    onClick={() => setActiveTab('members')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'members'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <Users size={14} className="inline mr-1.5" />
                                    Members
                                </button>
                                <button
                                    onClick={() => setActiveTab('shared')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'shared'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <Package size={14} className="inline mr-1.5" />
                                    Shared ({sharedSubs.length})
                                </button>
                            </div>

                            {/* Tab Content */}
                            <AnimatePresence mode="wait">
                                {activeTab === 'members' ? (
                                    <motion.div
                                        key="members"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="space-y-4"
                                    >
                                        {/* Invite Code */}
                                        <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                                            <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-1.5 block">
                                                Invite Code
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 bg-white px-3 py-2 rounded-lg border border-indigo-200 text-base font-mono font-bold text-gray-800 text-center tracking-widest">
                                                    {familyGroup.invite_code}
                                                </code>
                                                <button
                                                    onClick={copyCode}
                                                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                                >
                                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Members List */}
                                        <div className="space-y-2">
                                            {members.map(member => (
                                                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-600">
                                                            {member.user?.name?.[0] || '?'}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900">
                                                                {member.user?.name || 'Unknown'} {member.user_id === user.id && '(You)'}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 capitalize">{member.role}</div>
                                                        </div>
                                                    </div>
                                                    {member.role === 'owner' && <Shield size={14} className="text-amber-500" />}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="shared"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="space-y-3"
                                    >
                                        {/* Share Button (Owner Only) */}
                                        {isOwner && (
                                            <button
                                                onClick={() => setShowSharePicker(!showSharePicker)}
                                                className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                                            >
                                                <Plus size={16} />
                                                Share a Subscription
                                            </button>
                                        )}

                                        {/* Share Picker */}
                                        <AnimatePresence>
                                            {showSharePicker && isOwner && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
                                                        <p className="text-xs font-bold text-gray-600">Select subscription to share:</p>
                                                        {unsharedSubs.length === 0 ? (
                                                            <p className="text-xs text-gray-400 text-center py-2">
                                                                All your subscriptions are already shared
                                                            </p>
                                                        ) : (
                                                            <div className="max-h-40 overflow-y-auto space-y-1">
                                                                {unsharedSubs.map(sub => (
                                                                    <button
                                                                        key={sub.id}
                                                                        onClick={() => handleShareSubscription(sub.id)}
                                                                        className="w-full flex items-center gap-3 p-2 bg-white rounded-lg hover:bg-indigo-50 transition-colors border border-gray-100"
                                                                    >
                                                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                                                                            <ServiceLogo name={sub.name} logoUrl={sub.logoUrl} size={20} />
                                                                        </div>
                                                                        <div className="flex-1 text-left">
                                                                            <div className="text-sm font-bold text-gray-900">{sub.name}</div>
                                                                            <div className="text-[10px] text-gray-500">
                                                                                {formatCurrency(sub.amount, sub.currency)} / {sub.billingCycle}
                                                                            </div>
                                                                        </div>
                                                                        <Share2 size={14} className="text-indigo-500" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Shared Subscriptions List */}
                                        {sharedSubs.length === 0 ? (
                                            <div className="text-center py-6">
                                                <Package size={32} className="mx-auto text-gray-300 mb-2" />
                                                <p className="text-sm text-gray-500">No shared subscriptions yet</p>
                                                {isOwner && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Share your subscriptions so family can see what you pay for
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {sharedSubs.map(ss => (
                                                    <div key={ss.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                <ServiceLogo
                                                                    name={ss.subscription?.name || ''}
                                                                    logoUrl={ss.subscription?.logoUrl}
                                                                    size={24}
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="font-bold text-gray-900 text-sm truncate">
                                                                        {ss.subscription?.name}
                                                                    </h4>
                                                                    <span className="text-sm font-bold text-gray-900">
                                                                        {formatCurrency(ss.subscription?.amount || 0, ss.subscription?.currency || currency)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[10px] text-gray-500">
                                                                        Paid by: <span className="font-bold">{ss.sharer?.name || 'Unknown'}</span>
                                                                    </span>
                                                                    <span className="text-gray-300">•</span>
                                                                    <span className="text-[10px] text-gray-500 capitalize">
                                                                        {ss.subscription?.billingCycle}
                                                                    </span>
                                                                </div>

                                                                {/* Usage Toggles (Owner Only) */}
                                                                <div className="mt-2">
                                                                    <p className="text-[10px] font-bold text-gray-600 mb-1">Who uses this?</p>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {members.map(m => {
                                                                            const isUsed = (ss.used_by || []).includes(m.user_id);
                                                                            return (
                                                                                <button
                                                                                    key={m.id}
                                                                                    onClick={() => handleToggleUsage(ss, m.user_id)}
                                                                                    disabled={!isOwner}
                                                                                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${isUsed
                                                                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                                                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                                                                                        } ${isOwner ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                                                                >
                                                                                    {isUsed && <Check size={10} className="inline mr-0.5" />}
                                                                                    {m.user?.name?.split(' ')[0] || 'Unknown'}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                {/* Unshare Button (Owner Only) */}
                                                                {isOwner && ss.shared_by === user.id && (
                                                                    <button
                                                                        onClick={() => handleUnshare(ss.id)}
                                                                        className="mt-2 text-[10px] text-red-500 hover:text-red-700 font-medium"
                                                                    >
                                                                        Stop sharing
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Error Display */}
                                        {error && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                                                <AlertCircle size={14} className="text-red-500" />
                                                <p className="text-xs text-red-600">{error}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Leave Button */}
                            <button
                                onClick={handleLeaveFamily}
                                className="w-full py-2.5 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                <LogOut size={14} /> Leave Family
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
                                            Share visibility, not payments. See what your family uses and stop wasting money.
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
