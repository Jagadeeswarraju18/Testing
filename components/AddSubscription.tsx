import React, { useState, useCallback } from 'react';
import { POPULAR_PROVIDERS } from '../constants';
import { BillingCycle, SubscriptionStatus } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { X, Search, Check, Trash2, Building2, Users, UserPlus, XCircle, Mic, MicOff } from 'lucide-react';
import SeatTracker from './SeatTracker';
import { motion } from 'framer-motion';
import { getCurrencySymbol, convertCurrency } from '../utils';
import ServiceLogo from './ServiceLogo';
import Dropdown from './Dropdown';
import { VoiceService } from '../services/VoiceService';
import { parseVoiceInput } from '../utils/SmartParser';
import VoiceListeningModal from './VoiceListeningModal';

interface AddSubscriptionProps {
  onClose: () => void;
  onSave: (data: any) => void;
  currency: string;
  initialData?: any;
  categories?: { id: string, name: string, icon: string }[];
  onDelete?: (id: string) => void;
  onCancelSub?: (id: string, url?: string) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  rates?: Record<string, number>;
}

const AddSubscription: React.FC<AddSubscriptionProps> = ({ onClose, onSave, onDelete, onCancelSub, currency, initialData, categories = [], onShowToast, rates }) => {
  const { isBusinessWorkspace } = useWorkspace();
  const [step, setStep] = useState<1 | 2>(initialData ? 2 : 1);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    amount: (() => {
      // Prioritize Anchor Pricing
      if (initialData?.original_amount) {
        // If anchor currency matches target, use anchor directly
        if (initialData.original_currency === currency) {
          return initialData.original_amount.toString();
        }
        // If anchor currency exists but differs, convert from ANCHOR
        if (rates && initialData.original_currency) {
          return convertCurrency(initialData.original_amount, initialData.original_currency, currency, rates).toFixed(2);
        }
      }

      if (!initialData?.amount) return '';
      // Fallback to legacy conversion if no anchor
      if (initialData.currency && initialData.currency !== currency && rates) {
        return convertCurrency(initialData.amount, initialData.currency, currency, rates).toFixed(2);
      }
      return initialData.amount.toString();
    })(),
    currency: currency, // Force form to work in current workspace currency
    billingCycle: initialData?.billingCycle || BillingCycle.Monthly,
    customBillingPeriod: initialData?.customBillingPeriod || 1,
    customBillingUnit: initialData?.customBillingUnit || 'month',
    status: initialData?.status || SubscriptionStatus.Active,
    renewalDate: initialData?.renewalDate ? initialData.renewalDate.split('T')[0] : new Date().toISOString().split('T')[0],
    category: initialData?.category || 'other',
    tags: initialData?.tags?.join(', ') || '',
    paymentMethod: initialData?.paymentMethod || '',
    reminderDays: initialData?.reminderDays || [3],
    notes: initialData?.notes || '',
    logoUrl: initialData?.logoUrl || '',
    notificationTime: initialData?.notificationTime || '09:00',
    notificationFrequency: initialData?.notificationFrequency || 'once',
    sharedWith: initialData?.sharedWith || 0,
    sharedMembers: initialData?.sharedMembers || [],
    cancelUrl: initialData?.cancelUrl || '',
    // B2B Fields
    seatsTotal: initialData?.seatsTotal || 0,
    seatsAssigned: initialData?.seatsAssigned || 0,
    department: initialData?.department || '',

    ownerUserId: initialData?.ownerUserId || '',
    ownerName: initialData?.ownerName || ''
  });

  const [newMemberName, setNewMemberName] = useState('');

  // Voice Logic
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const voiceServiceRef = React.useRef<VoiceService | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const startListening = () => {
    // DEBUG: Visual confirmation that function started
    // const isNative = typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.isNativePlatform();
    // if (isNative) alert("Starting Voice Service...");

    setIsListening(true);
    setVoiceTranscript('');
    setIsProcessingVoice(false);

    try {
      voiceServiceRef.current = new VoiceService(
        (text, isFinal) => {
          setVoiceTranscript(text);

          if (isFinal) {
            setIsProcessingVoice(true);
            console.log("Final Voice Result:", text);

            // Small delay to let user see the final text
            setTimeout(() => {
              const parsed = parseVoiceInput(text);
              setFormData(prev => ({
                ...prev,
                name: parsed.name || prev.name,
                amount: parsed.amount || prev.amount,
                currency: parsed.currency || prev.currency,
                billingCycle: parsed.billingCycle || prev.billingCycle,
                renewalDate: parsed.renewalDate || prev.renewalDate
              }));

              setIsListening(false);
              if (parsed.name || parsed.amount) {
                setStep(2);
              }
            }, 100);
          }
        },
        () => {
          // On End - do nothing, let the result handler close it or user close it
          // But if no result came, we might want to reset
        },
        (err) => {
          // Ignore "aborted" error, as it happens when user manually stops/closes
          if (err === 'aborted') return;

          console.error("Voice Error", err);
          setIsListening(false);

          let msg = "Microphone access denied.";
          // Detect if running on native mobile (via Capacitor)
          // const isNative = typeof window !== 'undefined' &&
          //   (window as any).Capacitor &&
          //   (window as any).Capacitor.isNativePlatform();

          if (err === 'network') msg = "Network error: Voice recognition requires internet.";
          if (err === 'no-speech') msg = "No speech detected. Please try again.";
          if (err === 'not-allowed') {
            msg = "Voice permission denied. Please enable in Settings.";
            // msg = isNative
            //   ? "Voice permission denied. Please enable in Settings."
            //   : "Microphone permission denied. Click the lock icon in URL bar.";
          }
          if (typeof err === 'string' && err.includes('not supported')) {
            msg = "Voice input is not available on this device.";
          }

          // Handle specific Android Error Codes/Strings if they come through raw
          const errStr = String(err);
          if (errStr.includes('7') || errStr.includes('NO_MATCH')) msg = "No match found. Try speaking clearly.";
          if (errStr.includes('6') || errStr.includes('SPEECH_TIMEOUT')) msg = "Listening timed out. Please try again.";
          if (errStr.includes('2') || errStr.includes('NETWORK')) msg = "Network unavailable. Please check connection.";

          // If generic fallback is still active but we have a specific error string, show it for debugging
          // If generic fallback is still active but we have a specific error string, show it for debugging
          if (msg === "Microphone access denied." && err) {
            msg = `Voice Error: ${JSON.stringify(err)}`;
          }

          if (onShowToast) {
            onShowToast(msg, 'error');
          } else {
            alert(msg);
          }
        }
      );

      voiceServiceRef.current.start().catch(e => {
        console.error("Start Exception", e);
        setIsListening(false);
      });

    } catch (e: any) {
      console.error("Constructor Error", e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.stop();
      setIsListening(false);
    }
  };

  // Handle Done button - immediately process the transcript
  const handleVoiceDone = () => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.stop();
    }

    if (voiceTranscript) {
      setIsProcessingVoice(true);
      const parsed = parseVoiceInput(voiceTranscript);
      setFormData(prev => ({
        ...prev,
        name: parsed.name || prev.name,
        amount: parsed.amount || prev.amount,
        currency: parsed.currency || prev.currency,
        billingCycle: parsed.billingCycle || prev.billingCycle,
        renewalDate: parsed.renewalDate || prev.renewalDate
      }));

      setIsListening(false);
      if (parsed.name || parsed.amount) {
        setStep(2);
      }
    } else {
      setIsListening(false);
    }
  };

  const addMember = () => {
    if (newMemberName.trim() && !formData.sharedMembers.includes(newMemberName.trim())) {
      setFormData(prev => ({
        ...prev,
        sharedMembers: [...prev.sharedMembers, newMemberName.trim()],
        sharedWith: prev.sharedMembers.length + 1
      }));
      setNewMemberName('');
    }
  };

  const removeMember = (name: string) => {
    setFormData(prev => ({
      ...prev,
      sharedMembers: prev.sharedMembers.filter((m: string) => m !== name),
      sharedWith: Math.max(0, prev.sharedMembers.length - 1)
    }));
  };

  const [isTrial, setIsTrial] = useState(initialData?.tags?.includes('Trial') || false);

  const handleTrialToggle = (enabled: boolean) => {
    setIsTrial(enabled);
    if (enabled) {
      // Auto-configure for trial
      const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()) : [];
      if (!currentTags.includes('Trial')) currentTags.push('Trial');

      setFormData(prev => ({
        ...prev,
        tags: currentTags.join(', '),
        reminderDays: [1, 3], // Aggressive reminders
        renewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 7 days
      }));
    } else {
      // Remove Trial tag
      const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()) : [];
      setFormData(prev => ({
        ...prev,
        tags: currentTags.filter(t => t !== 'Trial').join(', ')
      }));
    }
  };


  const [isFetchingLogo, setIsFetchingLogo] = useState(false);

  // Auto-fetch logo
  React.useEffect(() => {
    // Only run in Step 2 (Form) and for new subscriptions
    if (step === 1 || initialData) return;

    // Debounce to avoid spamming while typing
    const timeoutId = setTimeout(() => {
      // Basic validation
      if (!formData.name || formData.name.length < 2) return;

      setIsFetchingLogo(true);

      // Clean name for domain guessing: Use FIRST word only (e.g. "Amazon Prime" -> "amazon")
      const firstName = formData.name.split(' ')[0];
      const cleanName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Common top-level domains to try
      const tlds = ['com', 'io', 'app', 'co', 'net', 'org', 'in', 'co.in'];
      let currentTldIndex = 0;

      const tryFetchLogo = () => {
        if (currentTldIndex >= tlds.length) {
          setIsFetchingLogo(false);
          return; // No logo found
        }

        const domain = `${cleanName}.${tlds[currentTldIndex]}`;
        const logoUrl = `https://logo.clearbit.com/${domain}`;

        const img = new Image();
        img.onload = () => {
          setFormData(prev => ({ ...prev, logoUrl }));
          setIsFetchingLogo(false);
        };
        img.onerror = () => {
          currentTldIndex++;
          tryFetchLogo();
        };
        img.src = logoUrl;
      };

      tryFetchLogo();
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [formData.name, step, initialData]);

  const handleProviderSelect = (provider: any) => {
    setFormData(prev => ({
      ...prev,
      name: provider.name,
      amount: '', // User requested no default amount
      category: provider.categories[0] || 'other',
      cancelUrl: provider.cancellationUrl || ''
    }));
    setStep(2);
  };

  const handleSave = useCallback(() => {
    if (!formData.name || !formData.amount || isSaving) return;

    // Immediately show saving state
    setIsSaving(true);

    const newAmount = parseFloat(formData.amount);

    // Track price changes: if editing and amount changed, store old amount
    let previous_amount = initialData?.previous_amount;
    let previous_amount_date = initialData?.previous_amount_date;

    if (initialData) {
      let comparisonAmount = initialData.amount;

      // Handle Currency Conversion: If currency changed, normalize amounts to new currency
      if (initialData.currency !== formData.currency && rates) {
        comparisonAmount = convertCurrency(initialData.amount, initialData.currency, formData.currency, rates);

        // Also convert existing historical previous_amount to new currency so it stays relevant
        if (previous_amount) {
          previous_amount = convertCurrency(previous_amount, initialData.currency, formData.currency, rates);
        }
      }

      // Check for price change (using epsilon for potential float precisions)
      if (Math.abs(comparisonAmount - newAmount) > 0.01) {
        previous_amount = comparisonAmount;
        previous_amount_date = new Date().toISOString();
      }
    }

    onSave({
      ...formData,
      amount: newAmount,
      previous_amount,
      previous_amount_date,
      status: formData.status,
      currency: formData.currency,

      // Update Anchor Logic:
      // When saving manually, we treat the input as the NEW Anchor source of truth
      original_amount: newAmount,
      original_currency: formData.currency,

      autoRenew: true,
      tags: formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
      sharedWith: formData.sharedMembers.length || (typeof formData.sharedWith === 'string' ? parseInt(formData.sharedWith) || 0 : formData.sharedWith),
      sharedMembers: formData.sharedMembers,

      cancelUrl: formData.cancelUrl,
      // Map to snake_case for DB
      notification_time: formData.notificationTime,
      notification_frequency: formData.notificationFrequency,
      startDate: formData.renewalDate
    });
  }, [formData, initialData, onSave, isSaving, rates]);

  // Calculate display values for price update banner
  const getBannerValues = () => {
    if (!initialData?.previous_amount || initialData.previous_amount === initialData.amount) return null;

    let prev = initialData.previous_amount;
    let curr = initialData.amount;
    const isCurrencyMismatch = initialData.currency && initialData.currency !== formData.currency;

    if (isCurrencyMismatch && rates) {
      prev = convertCurrency(prev, initialData.currency, formData.currency, rates);
      curr = convertCurrency(curr, initialData.currency, formData.currency, rates);
    }

    // Check if the change is significant enough to show (e.g. > 0.01 change)
    if (Math.abs(prev - curr) < 0.01) return null;

    return {
      prev: parseFloat(prev.toFixed(2)),
      curr: parseFloat(curr.toFixed(2))
    };
  };

  const bannerValues = getBannerValues();


  return (
    <>
      <VoiceListeningModal
        isOpen={isListening}
        onClose={stopListening}
        onDone={handleVoiceDone}
        transcript={voiceTranscript}
        isProcessing={isProcessingVoice}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-0 bg-white z-50 flex flex-col"
      >
        <div className="px-4 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
          <h2 className="font-semibold text-lg">{step === 1 ? 'Select Service' : (initialData ? 'Edit Subscription' : 'Details')}</h2>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {step === 1 ? (
            <div className="max-w-md mx-auto space-y-4">
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search Netflix, Spotify..."
                    autoFocus
                    className="w-full pl-10 p-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 ${isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-white text-indigo-500 hover:bg-indigo-50'
                    }`}
                >
                  {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
              </div>

              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
                }}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 gap-4"
              >
                <motion.button
                  variants={{
                    hidden: { scale: 0, opacity: 0 },
                    show: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 400, damping: 25 } }
                  }}
                  whileHover={{ scale: 1.05, backgroundColor: '#f8fafc', borderColor: '#6366f1' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStep(2)}
                  className="bg-white p-4 rounded-[1.5rem] shadow-sm border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 text-gray-400 cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm">
                    <span className="text-3xl font-light">+</span>
                  </div>
                  <span className="font-bold text-sm text-gray-500">Custom</span>
                </motion.button>

                {POPULAR_PROVIDERS.map(p => (
                  <motion.button
                    key={p.id}
                    variants={{
                      hidden: { scale: 0, opacity: 0 },
                      show: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 400, damping: 25 } }
                    }}
                    whileHover={{ scale: 1.05, backgroundColor: '#f8fafc' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleProviderSelect(p)}
                    className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center font-bold text-gray-600 overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                      <ServiceLogo name={p.name} logoUrl={p.logoUrl} />
                    </div>
                    <span className="font-bold text-sm text-gray-700">{p.name}</span>
                  </motion.button>
                ))}

              </motion.div>
            </div>
          ) : (
            <div className="space-y-6 max-w-md mx-auto">
              <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">

                {/* Price Change Alert Banner */}
                {bannerValues && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    <p className="text-sm text-amber-800">
                      Price updated: {getCurrencySymbol(formData.currency)}{bannerValues.prev} → {getCurrencySymbol(formData.currency)}{bannerValues.curr}
                      <span className="font-bold ml-1">
                        ({bannerValues.curr > bannerValues.prev ? '+' : ''}
                        {Math.round(((bannerValues.curr - bannerValues.prev) / bannerValues.prev) * 100)}%)
                      </span>
                    </p>
                  </div>
                )}

                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name</label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {isFetchingLogo ? (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center animate-pulse">
                          <Search size={16} className="text-gray-400" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100">
                          <ServiceLogo name={formData.name || 'S'} logoUrl={formData.logoUrl} />
                        </div>
                      )}
                      {/* Status Indicator */}
                      {formData.logoUrl && !isFetchingLogo && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border-2 border-white">
                          <Check size={8} />
                        </div>
                      )}
                    </div>

                    <input
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="flex-1 text-xl font-semibold border-b border-gray-200 py-2 focus:outline-none focus:border-primary bg-transparent placeholder-gray-300"
                      placeholder="Netflix, Spotify..."
                    />
                  </div>
                </div>

                {/* Free Trial Toggle */}
                <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                  <div className="flex items-center gap-2">
                    <div className="bg-white p-1.5 rounded-full text-indigo-500 shadow-sm">
                      <Check size={14} className={isTrial ? "opacity-100" : "opacity-0"} />
                    </div>
                    <span className="text-sm font-bold text-indigo-900">Is this a Free Trial?</span>
                  </div>
                  <button
                    onClick={() => handleTrialToggle(!isTrial)}
                    className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${isTrial ? 'bg-indigo-500' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isTrial ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount</label>
                    <div className="relative flex items-center border-b border-gray-200">
                      <span className="text-gray-400 font-semibold mr-1">{getCurrencySymbol(formData.currency)}</span>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="w-full text-xl font-semibold py-2 focus:outline-none focus:border-primary bg-transparent placeholder-gray-300"
                        placeholder="0.00"
                      />
                      <select
                        value={formData.currency}
                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                        className="text-xs font-bold text-gray-500 bg-transparent outline-none uppercase ml-1 cursor-pointer"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="INR">INR</option>
                        <option value="JPY">JPY</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex-1">
                    <Dropdown
                      label="Cycle"
                      options={Object.values(BillingCycle)}
                      value={formData.billingCycle}
                      onChange={(val) => setFormData({ ...formData, billingCycle: val as BillingCycle })}
                    />
                  </div>

                  {formData.billingCycle === BillingCycle.Custom && (
                    <div className="flex gap-4 bg-gray-50 p-3 rounded-lg">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Every</label>
                        <input
                          type="number"
                          value={formData.customBillingPeriod}
                          onChange={(e) => setFormData({ ...formData, customBillingPeriod: parseInt(e.target.value) || 1 })}
                          className="w-full bg-transparent border-b border-gray-300 focus:outline-none text-center font-semibold"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Unit</label>
                        <select
                          value={formData.customBillingUnit}
                          onChange={(e) => setFormData({ ...formData, customBillingUnit: e.target.value as any })}
                          className="w-full bg-transparent border-b border-gray-300 focus:outline-none"
                        >
                          <option value="day">Days</option>
                          <option value="week">Weeks</option>
                          <option value="month">Months</option>
                          <option value="year">Years</option>
                        </select>
                      </div>
                    </div>
                  )}

                </div>

                {/* Split the Bill - Family/Group Sharing */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                    <Users size={12} /> Split with Family/Friends
                  </label>

                  {/* Add Member Input */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                      <UserPlus size={16} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Add member name..."
                        value={newMemberName}
                        onChange={e => setNewMemberName(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addMember())}
                        className="flex-1 bg-transparent focus:outline-none text-sm"
                      />
                    </div>
                    <button
                      onClick={addMember}
                      disabled={!newMemberName.trim()}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>

                  {/* Member Tags */}
                  {formData.sharedMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {/* You (always first) */}
                      <div className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium">
                        <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">Y</div>
                        You
                      </div>
                      {formData.sharedMembers.map((member: string, i: number) => (
                        <div key={member} className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium group">
                          <div className="w-5 h-5 rounded-full bg-gray-400 text-white flex items-center justify-center text-[10px] font-bold">
                            {member[0].toUpperCase()}
                          </div>
                          {member}
                          <button
                            onClick={() => removeMember(member)}
                            className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cost Split Display */}
                  {formData.sharedMembers.length > 0 && formData.amount && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-green-600 font-bold uppercase">Your Share</span>
                          <p className="text-2xl font-black text-green-700">
                            {getCurrencySymbol(formData.currency)}
                            {(parseFloat(formData.amount) / (formData.sharedMembers.length + 1)).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-500 font-medium">Total</span>
                          <p className="text-lg font-bold text-gray-600">
                            {getCurrencySymbol(formData.currency)}{formData.amount}
                          </p>
                          <span className="text-xs text-gray-400">÷ {formData.sharedMembers.length + 1} people</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">First Renewal</label>
                  <input
                    type="date"
                    value={formData.renewalDate}
                    onChange={e => setFormData({ ...formData, renewalDate: e.target.value })}
                    className="w-full text-lg py-2 bg-transparent border-b border-gray-200 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Payment Method</label>
                    <input
                      value={formData.paymentMethod}
                      onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full text-base border-b border-gray-200 py-2 focus:outline-none focus:border-primary bg-transparent placeholder-gray-300"
                      placeholder="Card, UPI..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tags</label>
                    <input
                      value={formData.tags}
                      onChange={e => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full text-base border-b border-gray-200 py-2 focus:outline-none focus:border-primary bg-transparent placeholder-gray-300"
                      placeholder="Work, Shared..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Reminders</label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 3, 7, 14].map(day => (
                      <button
                        key={day}
                        onClick={() => {
                          const current = formData.reminderDays;
                          const newDays = current.includes(day)
                            ? current.filter(d => d !== day)
                            : [...current, day];
                          setFormData({ ...formData, reminderDays: newDays });
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${formData.reminderDays.includes(day)
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                          : 'bg-white text-gray-500 border-gray-200'}`}
                      >
                        {day} Days Before
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Reminder Settings */}
                <div className="flex gap-4 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Time</label>
                    <div className="relative">
                      <input
                        type="time"
                        value={formData.notificationTime}
                        onChange={e => setFormData({ ...formData, notificationTime: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-3 pr-2 text-sm font-semibold text-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 shadow-sm"
                      />
                      {/* Optional: Add a subtle clock icon if needed, but native inputs usually show one. 
                          If we want to force an icon, we can absolute position it, but it might overlap native controls.
                          Let's trust the clean styling for now. */}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Dropdown
                      value={formData.notificationFrequency}
                      options={[
                        { label: 'Once', value: 'once' },
                        { label: 'Every 1 hr', value: '1h' },
                        { label: 'Every 3 hrs', value: '3h' },
                        { label: 'Every 5 hrs', value: '5h' },
                        { label: 'Daily (Until Paid)', value: '24h' }
                      ]}
                      onChange={(val) => setFormData({ ...formData, notificationFrequency: val as any })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setFormData({ ...formData, category: cat.id })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${formData.category === cat.id
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-200'
                          }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Status</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setFormData({ ...formData, status: SubscriptionStatus.Active })}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 border-2 ${formData.status === SubscriptionStatus.Active
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200 scale-[1.02]'
                          : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-100 hover:text-emerald-500'
                          }`}
                      >
                        {formData.status === SubscriptionStatus.Active && <Check size={16} strokeWidth={3} />}
                        Active
                      </button>

                      <button
                        onClick={() => setFormData({ ...formData, status: SubscriptionStatus.Cancelled })}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 border-2 ${formData.status === SubscriptionStatus.Cancelled
                          ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200 scale-[1.02]'
                          : 'bg-white border-gray-100 text-gray-400 hover:border-orange-100 hover:text-orange-500'
                          }`}
                      >
                        {formData.status === SubscriptionStatus.Cancelled && <Trash2 size={16} strokeWidth={3} />}
                        Archived
                      </button>
                    </div>
                  </div>
                </div>



                {/* B2B: SEATS & DEPARTMENT */}
                {isBusinessWorkspace && (
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <Building2 size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Business Details</span>
                    </div>

                    <SeatTracker
                      seatsTotal={formData.seatsTotal}
                      seatsAssigned={formData.seatsAssigned}
                      currency={currency}
                      costPerSeat={formData.seatsTotal > 0 ? (parseFloat(formData.amount) / formData.seatsTotal) : 0}
                      onUpdate={(total, assigned) => setFormData({ ...formData, seatsTotal: total, seatsAssigned: assigned })}
                    />

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Department</label>
                      <select
                        value={formData.department}
                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select Department...</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Sales">Sales</option>
                        <option value="HR">HR</option>
                        <option value="Finance">Finance</option>
                        <option value="Operations">Operations</option>

                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Owner Name</label>
                      <input
                        value={formData.ownerName || ''}
                        onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="e.g. John Doe, Design Team..."
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl p-3 border-none focus:ring-2 focus:ring-primary outline-none text-sm min-h-[80px]"
                    placeholder="Login details, cancellation info, etc."
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={!formData.name || !formData.amount || isSaving}
                  className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    initialData ? 'Update Subscription' : 'Add Subscription'
                  )}
                </button>

                {initialData && onCancelSub && initialData.status === 'active' && (
                  <button
                    onClick={() => onCancelSub(initialData.id, initialData.cancelUrl)}
                    className="w-full py-4 bg-orange-50 text-orange-600 font-bold rounded-xl hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={18} /> Cancel Subscription
                  </button>
                )}

                {initialData && onDelete && (
                  <button
                    onClick={() => onDelete(initialData.id)}
                    className="w-full py-4 bg-red-50 text-red-500 font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} /> Delete Subscription
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div >
    </>
  );
};

export default AddSubscription;