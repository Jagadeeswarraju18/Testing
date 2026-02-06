import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { User, Subscription } from '../types';
import { CreditCard, Bell, Users, Shield, LogOut, ChevronRight, Download, Upload, Camera, Edit2, Save, User as UserIcon, Check, X, ChevronDown, Lock, FileJson, FileText, Scale, Star, RefreshCw, Lightbulb, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { requestNotificationPermission, getPermissionStatus } from '../services/notificationService';
import { INITIAL_SUBSCRIPTIONS } from '../constants';
import { formatCurrency, convertCurrency, getCurrencySymbol } from '../utils';
import Dropdown from './Dropdown';
import PrivacyData from './PrivacyData';
import ImportModal from './ImportModal';
import FamilyModal from './FamilyModal';
import ConfirmationModal from './ConfirmationModal';
import FAQModal from './FAQModal';
import PaymentHistoryModal from './PaymentHistoryModal';

interface SettingsProps {
    user: User;
    subscriptions: Subscription[];
    onUpgrade?: () => void;
    onOpenPremiumModal?: () => void;
    onSignOut: () => void;
    onChangeCurrency: (currency: string, oldCurrency: string, currentBudget: number, timezone: string) => void;
    onImport?: (data: any[]) => void;
    onUpdateProfile?: (name: string, email: string) => void;
    onUpdateBudget: (budget: number) => void;
    rates?: Record<string, number>;
    categories: { id: string, name: string, icon: string }[];
    onAddCategory: (name: string, icon: string) => void;
    currency: string;
    monthlyBudget: number;
    isPremium?: boolean;
    onClose?: () => void;
    onDeleteWorkspace: (id: string) => void;
    onRestorePurchase?: () => void;
    onManageSubscription?: () => void;
    onConvertAllSubscriptions?: (newCurrency: string) => void;
}

const Settings: React.FC<SettingsProps> = ({
    user,
    subscriptions,
    onClose,
    onSignOut,
    onChangeCurrency,
    onUpdateBudget,
    rates,
    categories = [],
    onAddCategory,
    currency,
    monthlyBudget,
    isPremium = false,
    onUpgrade,
    onOpenPremiumModal,
    onImport,

    onUpdateProfile,
    onDeleteWorkspace,
    onRestorePurchase,
    onManageSubscription,
    onConvertAllSubscriptions
}) => {
    const { workspaces, activeWorkspace, createWorkspace } = useWorkspace(); // Get workspace context
    const [localCurrency, setLocalCurrency] = useState(currency);
    const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
    const [currencySearch, setCurrencySearch] = useState('');

    // Timezone state
    const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
    const [timezoneSearch, setTimezoneSearch] = useState('');

    // Supported timezones
    const allTimezones = React.useMemo(() => {
        const majorTimezones = [
            'Asia/Kolkata', 'America/New_York', 'Europe/London', 'UTC',
            'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
            'America/Toronto', 'Europe/Zurich', 'Asia/Hong_Kong', 'Asia/Singapore',
            'Asia/Seoul', 'America/Mexico_City', 'America/Sao_Paulo', 'Europe/Moscow',
            'Africa/Johannesburg', 'Asia/Dubai', 'Asia/Riyadh', 'Pacific/Auckland',
            'Asia/Bangkok'
        ];

        try {
            // @ts-ignore - supportedValuesOf is standard in modern browsers
            const systemTimezones = Intl.supportedValuesOf('timeZone');
            // Merge and deduplicate
            return Array.from(new Set([...majorTimezones, ...systemTimezones])).sort();
        } catch (e) {
            return majorTimezones.sort();
        }
    }, []);

    const filteredTimezones = allTimezones.filter((tz: string) =>
        tz.toLowerCase().includes(timezoneSearch.toLowerCase())
    );

    // Profile Edit State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState(user.name);
    const [editEmail, setEditEmail] = useState(user.email);



    // Budget Edit State
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [tempBudget, setTempBudget] = useState(monthlyBudget.toString());

    // Category Modal State
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false); // Kept for compatibility if used elsewhere
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('📦');

    // Privacy View State
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showFamilyModal, setShowFamilyModal] = useState(false);
    const [showFAQModal, setShowFAQModal] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);


    const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');

    // Payment History State
    const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

    useEffect(() => {
        if (user && isPremium) {
            supabase
                .from('premium_purchases')
                .select('*')
                .eq('user_id', user.id)
                .order('purchase_date', { ascending: false })
                .then(({ data }) => {
                    if (data) setPaymentHistory(data);
                });
        }
    }, [user, isPremium]);

    // App Version State
    const [appVersion, setAppVersion] = useState('1.0.0');

    // Fetch native app version on mount
    useEffect(() => {
        const getAppVersion = async () => {
            try {
                if (Capacitor.isNativePlatform()) {
                    const info = await App.getInfo();
                    setAppVersion(`${info.version} (${info.build})`);
                } else {
                    // Fallback for web - use a static version or fetch from package.json
                    setAppVersion('1.0.1 (Web)');
                }
            } catch (error) {
                console.error('Failed to get app version:', error);
                setAppVersion('1.0.1');
            }
        };
        getAppVersion();
    }, []);


    // Top 20 world currencies with flags and timezones
    const currencies = [
        { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳', timezone: 'Asia/Kolkata' },
        { code: 'USD', name: 'US Dollar', flag: '🇺🇸', timezone: 'America/New_York' },
        { code: 'EUR', name: 'Euro', flag: '🇪🇺', timezone: 'Europe/Berlin' },
        { code: 'GBP', name: 'British Pound', flag: '🇬🇧', timezone: 'Europe/London' },
        { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵', timezone: 'Asia/Tokyo' },
        { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳', timezone: 'Asia/Shanghai' },
        { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺', timezone: 'Australia/Sydney' },
        { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦', timezone: 'America/Toronto' },
        { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', timezone: 'Europe/Zurich' },
        { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰', timezone: 'Asia/Hong_Kong' },
        { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬', timezone: 'Asia/Singapore' },
        { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷', timezone: 'Asia/Seoul' },
        { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽', timezone: 'America/Mexico_City' },
        { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷', timezone: 'America/Sao_Paulo' },
        { code: 'RUB', name: 'Russian Ruble', flag: '🇷🇺', timezone: 'Europe/Moscow' },
        { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦', timezone: 'Africa/Johannesburg' },
        { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪', timezone: 'Asia/Dubai' },
        { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦', timezone: 'Asia/Riyadh' },
        { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿', timezone: 'Pacific/Auckland' },
        { code: 'THB', name: 'Thai Baht', flag: '🇹🇭', timezone: 'Asia/Bangkok' },
    ];

    // Filter currencies based on search
    const filteredCurrencies = currencies.filter(c =>
        c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
        c.name.toLowerCase().includes(currencySearch.toLowerCase())
    );

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText: string;
        cancelText?: string;
        showCancel?: boolean;
        onCancel?: () => void;
        onClose?: () => void;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        confirmText: 'Confirm',
        showCancel: true,
        onConfirm: () => { }
    });

    // Sync local state if prop changes from outside
    useEffect(() => {
        setLocalCurrency(currency);
    }, [currency]);

    useEffect(() => {
        const checkStatus = async () => {
            const pref = localStorage.getItem('spendyx_notifications');
            const wantsNotifications = pref !== 'false';

            const hasSystemPerm = await getPermissionStatus();

            // Toggle is ON only if: User wants it (default true) AND System granted it
            setNotificationsEnabled(wantsNotifications && hasSystemPerm);
        };
        checkStatus();
    }, []);


    const handleToggleNotifications = async () => {
        if (notificationsEnabled) {
            // User turning OFF - Soft Disable
            setNotificationsEnabled(false);
            localStorage.setItem('spendyx_notifications', 'false');

            // Cancel any pending notifications immediately
            import('../services/notificationService').then(mod => {
                mod.cancelAllNotifications();
            });
        } else {
            // User turning ON
            const granted = await requestNotificationPermission();
            if (granted) {
                setNotificationsEnabled(true);
                localStorage.setItem('spendyx_notifications', 'true');
            } else {
                const isNative = Capacitor.isNativePlatform();
                setConfirmModal({
                    isOpen: true,
                    title: 'Permission Denied 🚫',
                    message: isNative
                        ? 'To receive reminders, please enable notifications in your device settings (Apps > Spendyx > Notifications).'
                        : 'To receive reminders, please enable notifications in your browser settings.',
                    type: 'error',
                    confirmText: 'OK',
                    showCancel: false,
                    onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                });
            }
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const jsonInputRef = useRef<HTMLInputElement>(null);

    // Calculate Premium Price
    const basePrice = 0.50; // MVP Pricing Strategy
    let displayPrice = basePrice;
    if (rates && currency !== 'USD') {
        displayPrice = convertCurrency(basePrice, 'USD', currency, rates);
    }

    const handleRestoreJSON = () => {
        jsonInputRef.current?.click();
    };

    const processJSONRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            try {
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    if (data.subscriptions && Array.isArray(data.subscriptions)) {
                        if (onImport) onImport(data.subscriptions);
                        alert(`Backup restored! ${data.subscriptions.length} subscriptions loaded.`);
                    } else {
                        // Fallback for flat array or different structure
                        if (Array.isArray(data)) { // Legacy array
                            if (onImport) onImport(data);
                            alert(`Backup restored! ${data.length} subscriptions loaded.`);
                        } else {
                            alert("Invalid backup file format.");
                        }
                    }
                } else {
                    alert("Please select a valid .json backup file.");
                }
            } catch (err) {
                console.error(err);
                alert("Failed to parse file. Please check the format.");
            }
        };
        reader.readAsText(file);
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (onUpdateProfile) onUpdateProfile(user.name, user.email);
            };
            reader.readAsDataURL(file);
        }
    };

    const saveProfile = () => {
        if (onUpdateProfile) onUpdateProfile(editName, editEmail);
        setIsEditingProfile(false);
    };

    if (showPrivacy) {
        return <PrivacyData user={user} onBack={() => setShowPrivacy(false)} />;
    }

    return (
        <div className="p-4 pb-24 min-h-screen bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Settings</h2>

            {/* Profile Section - Enhanced with PRO Ring */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4 flex items-center gap-4">
                <div className="relative group cursor-pointer flex-shrink-0" onClick={handleAvatarClick}>
                    {/* PRO Glow Ring for Premium Users */}
                    {isPremium && (
                        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 opacity-80 blur-sm animate-pulse" />
                    )}
                    <div className={`relative w-16 h-16 rounded-full overflow-hidden bg-gray-50 ${isPremium ? 'ring-[3px] ring-gradient ring-amber-400 ring-offset-2 ring-offset-white' : 'border-2 border-gray-100 shadow-sm'}`}>
                        {user.avatar ? (
                            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-400">
                                {user.name[0]}
                            </div>
                        )}
                    </div>
                    {/* Camera Icon with Premium Styling */}
                    <div className={`absolute bottom-0 right-0 p-1 rounded-full shadow-md border-2 border-white ${isPremium ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : 'bg-gray-900 text-white'}`}>
                        <Camera size={10} />
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                <div className="flex-1 min-w-0">
                    {isEditingProfile ? (
                        <div className="space-y-2">
                            <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full font-bold text-lg border-b border-gray-300 focus:border-black outline-none py-0.5 bg-transparent"
                                placeholder="Your Name"
                                autoFocus
                            />
                            <div className="flex items-center gap-2">
                                <button onClick={saveProfile} className="px-3 py-1 bg-black text-white rounded-md text-xs font-medium">
                                    Save
                                </button>
                                <button onClick={() => setIsEditingProfile(false)} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                {user.name}
                                {isPremium && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm uppercase tracking-wide">
                                        PRO
                                    </span>
                                )}
                                <button onClick={() => setIsEditingProfile(true)} className="text-gray-300 hover:text-black transition-colors">
                                    <Edit2 size={12} />
                                </button>
                            </h3>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        </div>
                    )}
                </div>
            </div>

            {!isPremium ? (
                <div className="bg-gray-900 rounded-xl p-4 text-white shadow-lg mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-sm">Upgrade to Pro</h3>
                        <p className="text-gray-400 text-xs">Unlock workspaces, export & more. Starting at $0.50/mo</p>
                    </div>
                    <button
                        onClick={onOpenPremiumModal}
                        className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold text-xs hover:bg-gray-100 transition-colors whitespace-nowrap"
                    >
                        {formatCurrency(displayPrice, currency)}/mo
                    </button>
                </div>
            ) : (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                            <Star size={16} fill="currentColor" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-gray-900">Pro Active</h3>
                            <p className="text-amber-700/70 text-xs">
                                {user.premiumExpiryDate
                                    ? `Pro until ${new Date(user.premiumExpiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                    : 'You are a Pro member!'}
                            </p>
                        </div>
                    </div>
                    {onManageSubscription && (
                        <button
                            onClick={onManageSubscription}
                            className="bg-white text-amber-600 border border-amber-200 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-amber-50 transition-colors shadow-sm"
                        >
                            Manage
                        </button>
                    )}
                </div>
            )}

            <div className="space-y-3">
                <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Account</h3>
                    <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                        <div className="p-3 flex justify-between items-center relative z-30">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 p-1.5 rounded-md text-blue-600"><CreditCard size={16} /></div>
                                <span className="text-sm font-medium text-gray-700">Currency</span>
                            </div>
                            <div className="relative">
                                <button
                                    onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 hover:from-gray-100 hover:to-gray-150 transition-all active:scale-95 shadow-sm min-w-[100px] justify-between"
                                >
                                    <span className="flex items-center gap-2">
                                        <span>{currencies.find(c => c.code === localCurrency)?.flag}</span>
                                        <span>{localCurrency}</span>
                                    </span>
                                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showCurrencyDropdown && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => { setShowCurrencyDropdown(false); setCurrencySearch(''); }} />
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                                            >
                                                {/* Search Bar */}
                                                <div className="p-2 border-b border-gray-100">
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            placeholder="Search currency..."
                                                            value={currencySearch}
                                                            onChange={(e) => setCurrencySearch(e.target.value)}
                                                            className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder-gray-400"
                                                            autoFocus
                                                        />
                                                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="max-h-56 overflow-y-auto">
                                                    {filteredCurrencies.length > 0 ? (
                                                        filteredCurrencies.map((curr) => (
                                                            <button
                                                                key={curr.code}
                                                                onClick={() => {
                                                                    const newCurrency = curr.code;

                                                                    // Close dropdown immediately
                                                                    setShowCurrencyDropdown(false);
                                                                    setCurrencySearch('');

                                                                    // If we have the converter function and user has existing subs, ask to convert
                                                                    if (onConvertAllSubscriptions && subscriptions.length > 0 && newCurrency !== currency) {
                                                                        setConfirmModal({
                                                                            isOpen: true,
                                                                            title: `Switch to ${newCurrency}?`,
                                                                            message: `You are changing your dashboard to ${newCurrency}.\n\nDo you want to convert your ${subscriptions.length} existing subscriptions too?\n• Future notifications will be in ${newCurrency}\n• Past history remains unchanged`,
                                                                            type: 'info',
                                                                            confirmText: `Yes, Convert Everything`,
                                                                            cancelText: `No, Just Display ${newCurrency}`,
                                                                            showCancel: true,
                                                                            onConfirm: () => {
                                                                                // YES: Convert & Change
                                                                                onConvertAllSubscriptions(newCurrency);
                                                                                setLocalCurrency(newCurrency);
                                                                                onChangeCurrency(newCurrency, currency, monthlyBudget, curr.timezone);
                                                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                                            },
                                                                            onCancel: () => {
                                                                                // NO: Change Only
                                                                                setLocalCurrency(newCurrency);
                                                                                onChangeCurrency(newCurrency, currency, monthlyBudget, curr.timezone);
                                                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                                            },
                                                                            // X / Abort: Do nothing (keep old currency)
                                                                            onClose: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                                                                        });
                                                                    } else {
                                                                        // Standard behavior (No subs or same currency)
                                                                        setLocalCurrency(newCurrency);
                                                                        onChangeCurrency(newCurrency, currency, monthlyBudget, curr.timezone);
                                                                    }
                                                                }}
                                                                className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all ${localCurrency === curr.code
                                                                    ? 'bg-indigo-50 text-indigo-700'
                                                                    : 'text-gray-700 hover:bg-gray-50'
                                                                    }`}
                                                            >
                                                                <span className="text-lg">{curr.flag}</span>
                                                                <div className="flex-1 text-left">
                                                                    <div className="font-bold text-sm">{curr.code}</div>
                                                                    <div className="text-[11px] text-gray-400">{curr.name}</div>
                                                                </div>
                                                                {localCurrency === curr.code && (
                                                                    <Check size={16} className="text-indigo-600" />
                                                                )}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="py-6 text-center text-gray-400 text-sm">
                                                            No currency found
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* --- NEW Timezone Selector --- */}
                        <div className="p-3 flex justify-between items-center relative z-20 border-b border-dashed border-gray-100 pb-4 mb-2">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 p-1.5 rounded-md text-blue-600"><RefreshCw size={16} /></div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-700">Timezone</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeWorkspace?.timezone_set_manually
                                            ? 'bg-orange-100 text-orange-700'
                                            : 'bg-green-100 text-green-700'}`}>
                                            {activeWorkspace?.timezone_set_manually ? 'Custom' : 'Auto'}
                                        </span>
                                    </div>
                                    <span className="block text-xs text-gray-400 max-w-[200px]">
                                        {activeWorkspace?.timezone_set_manually
                                            ? "Timezone locked — won't change with currency"
                                            : "Timezone updates automatically based on currency"}
                                    </span>
                                </div>
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
                                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    <span>{activeWorkspace?.timezone?.split('/')[1]?.replace(/_/g, ' ') || 'UTC'}</span>
                                    <ChevronRight size={14} className={`text-gray-400 transition-transform ${showTimezoneDropdown ? 'rotate-90' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showTimezoneDropdown && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-20"
                                                onClick={() => setShowTimezoneDropdown(false)}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-30 overflow-hidden"
                                            >
                                                <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            placeholder="Search timezone..."
                                                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                            value={timezoneSearch}
                                                            onChange={(e) => setTimezoneSearch(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="max-h-56 overflow-y-auto">
                                                    {filteredTimezones.length > 0 ? (
                                                        filteredTimezones.map((tz) => (
                                                            <button
                                                                key={tz}
                                                                onClick={() => {
                                                                    onChangeCurrency(localCurrency, localCurrency, monthlyBudget, tz);
                                                                    setShowTimezoneDropdown(false);
                                                                    setTimezoneSearch('');
                                                                }}
                                                                className={`w-full px-4 py-2 flex items-center gap-3 transition-all ${activeWorkspace?.timezone === tz
                                                                    ? 'bg-indigo-50 text-indigo-700'
                                                                    : 'text-gray-700 hover:bg-gray-50'
                                                                    }`}
                                                            >
                                                                <div className="flex-1 text-left">
                                                                    <div className="font-medium text-xs truncate">{tz}</div>
                                                                </div>
                                                                {activeWorkspace?.timezone === tz && (
                                                                    <Check size={14} className="text-indigo-600" />
                                                                )}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="py-6 text-center text-gray-400 text-xs">
                                                            No timezone found
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>



                        <div className="p-3 flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-50 p-1.5 rounded-md text-orange-600"><Bell size={16} /></div>
                                <span className="text-sm font-medium text-gray-700">Notifications</span>
                            </div>
                            <button
                                onClick={handleToggleNotifications}
                                className={`w-10 h-5 rounded-full relative transition-colors ${notificationsEnabled ? 'bg-green-500' : 'bg-gray-200'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${notificationsEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                            </button>
                        </div>



                        <div className="p-3 flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-50 p-1.5 rounded-md text-green-600"><CreditCard size={16} /></div>
                                <div>
                                    <span className="block text-sm font-medium text-gray-700">Monthly Budget</span>
                                    <span className="block text-xs text-gray-400">Target limit</span>
                                </div>
                            </div>
                            <AnimatePresence mode="wait">
                                {isEditingBudget ? (
                                    <motion.div
                                        key="editing"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex items-center gap-2"
                                    >
                                        <input
                                            type="number"
                                            value={tempBudget}
                                            onChange={(e) => setTempBudget(e.target.value)}
                                            className="w-24 bg-gray-50 border border-indigo-200 rounded-lg py-1 px-2 text-sm font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => {
                                                if (tempBudget && !isNaN(parseFloat(tempBudget))) {
                                                    onUpdateBudget(parseFloat(tempBudget));
                                                    setIsEditingBudget(false);
                                                }
                                            }}
                                            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onClick={() => setIsEditingBudget(false)}
                                            className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                        >
                                            <X size={14} />
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.button
                                        key="display"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => {
                                            setTempBudget(monthlyBudget.toString());
                                            setIsEditingBudget(true);
                                        }}
                                        className="text-sm font-bold bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        {formatCurrency(monthlyBudget, currency)}
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </section>



                <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 ml-1">Workspaces</h3>
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        {workspaces.map(ws => (
                            <div key={ws.id} className="p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${ws.type === 'business' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                        {ws.type === 'business' ? <Users size={18} /> : <UserIcon size={18} />}
                                    </div>
                                    <div>
                                        <span className="block text-sm font-medium text-gray-700">
                                            {ws.name} {ws.id === activeWorkspace?.id && <span className="text-xs text-indigo-500 ml-1">(Active)</span>}
                                        </span>
                                        <span className="block text-xs text-gray-400 capitalize">{ws.type}</span>
                                    </div>
                                </div>
                                {ws.type !== 'personal' && (
                                    <button
                                        onClick={() => onDeleteWorkspace(ws.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Workspace"
                                    >
                                        <LogOut size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={() => setShowNewWorkspaceModal(true)}
                            className="w-full p-3 flex justify-center items-center gap-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                            + New Workspace
                        </button>
                    </div>

                    {/* New Workspace Modal */}
                    <AnimatePresence>
                        {showNewWorkspaceModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                                onClick={() => { setShowNewWorkspaceModal(false); setNewWorkspaceName(''); }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    transition={{ duration: 0.15 }}
                                    className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                                                <Users size={20} />
                                            </div>
                                            <h3 className="font-bold text-gray-900">New Workspace</h3>
                                        </div>
                                        <button
                                            onClick={() => { setShowNewWorkspaceModal(false); setNewWorkspaceName(''); }}
                                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Workspace Name
                                        </label>
                                        <input
                                            type="text"
                                            value={newWorkspaceName}
                                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newWorkspaceName.trim()) {
                                                    createWorkspace(newWorkspaceName.trim(), 'business', user);
                                                    setNewWorkspaceName('');
                                                    setShowNewWorkspaceModal(false);
                                                }
                                                if (e.key === 'Escape') {
                                                    setShowNewWorkspaceModal(false);
                                                    setNewWorkspaceName('');
                                                }
                                            }}
                                            placeholder="e.g., Work Subscriptions"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                            autoFocus
                                        />
                                        <p className="text-xs text-gray-400 mt-2">
                                            Organize subscriptions in separate workspaces
                                        </p>
                                    </div>
                                    <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
                                        <button
                                            onClick={() => { setShowNewWorkspaceModal(false); setNewWorkspaceName(''); }}
                                            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (newWorkspaceName.trim()) {
                                                    createWorkspace(newWorkspaceName.trim(), 'business', user);
                                                    setNewWorkspaceName('');
                                                    setShowNewWorkspaceModal(false);
                                                }
                                            }}
                                            disabled={!newWorkspaceName.trim()}
                                            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Create
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Data & Privacy</h3>
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        <button onClick={() => setShowPrivacy(true)} className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Lock size={18} /></div>
                                <div className="text-left">
                                    <span className="block text-sm font-medium text-gray-700">Privacy & Data Controls</span>
                                    <span className="block text-xs text-gray-400">Export data, delete account</span>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </button>

                        <button onClick={() => setShowImportModal(true)} className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><FileText size={18} /></div>
                                <div className="text-left">
                                    <span className="block text-sm font-medium text-gray-700">Import from CSV / Paste</span>
                                    <span className="block text-xs text-gray-400">Bulk add subscriptions</span>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </button>

                        <button onClick={handleRestoreJSON} className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="bg-gray-50 p-2 rounded-lg text-gray-600"><FileJson size={18} /></div>
                                <div className="text-left">
                                    <span className="block text-sm font-medium text-gray-700">Restore Backup</span>
                                    <span className="block text-xs text-gray-400">Restore from JSON file</span>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                            <input
                                ref={jsonInputRef}
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={processJSONRestore}
                            />
                        </button>

                        <button onClick={() => {
                            import('../utils/pdfGenerator').then(mod => {
                                mod.generatePDF(user, subscriptions, currency);
                            });
                        }} className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors border-t border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-50 p-2 rounded-lg text-red-500"><FileText size={18} /></div>
                                <div className="text-left">
                                    <span className="block text-sm font-medium text-gray-700">Export PDF Report</span>
                                    <span className="block text-xs text-gray-400">Download annual summary</span>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </button>
                    </div>
                </section>



                <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 ml-1">Family</h3>
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <button
                            onClick={() => setShowFamilyModal(true)}
                            className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><Users size={18} /></div>
                                <div>
                                    <span className="block text-sm font-medium text-gray-700">Family Sharing</span>
                                    <span className="block text-xs text-gray-400 text-left">{isPremium ? 'Manage' : 'Premium Only'}</span>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </button>
                    </div>
                </section>

                <AnimatePresence>
                    {showFamilyModal && (
                        <FamilyModal
                            isOpen={showFamilyModal}
                            onClose={() => setShowFamilyModal(false)}
                            user={user}
                            currency={currency}
                            subscriptions={subscriptions}
                        />
                    )}
                </AnimatePresence>

                <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 ml-1">Legal & Support</h3>
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        <button
                            onClick={() => {
                                window.history.pushState({}, '', '/terms');
                                window.dispatchEvent(new Event('popstate'));
                            }}
                            className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-gray-50 p-2 rounded-lg text-gray-600"><Scale size={18} /></div>
                                <span className="text-sm font-medium text-gray-700">Terms of Service</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </button>

                        <button
                            onClick={() => {
                                window.history.pushState({}, '', '/privacy-policy');
                                window.dispatchEvent(new Event('popstate'));
                            }}
                            className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-gray-50 p-2 rounded-lg text-gray-600"><Shield size={18} /></div>
                                <span className="text-sm font-medium text-gray-700">Privacy Policy</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </button>



                        <button
                            onClick={() => {
                                const isAndroid = /Android/i.test(navigator.userAgent);
                                const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                                if (isAndroid) {
                                    window.open('https://play.google.com/store/apps/details?id=com.jwr.spendyx', '_blank');
                                } else if (isIOS) {
                                    // TODO: Replace with your actual App Store ID when available
                                    window.open('https://apps.apple.com/app/idYOUR_APP_ID', '_blank');
                                } else {
                                    window.open('https://play.google.com/store/apps/details?id=com.jwr.spendyx', '_blank');
                                }
                            }}
                            className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-yellow-50 p-2 rounded-lg text-yellow-600"><Star size={18} /></div>
                                <span className="text-sm font-medium text-gray-700">Rate Us</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </button>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3 ml-1">Help & Support</h3>
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        <a
                            href="mailto:jwrstack@gmail.com?subject=Feature Request"
                            className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-50 p-2 rounded-lg text-orange-600"><Lightbulb size={18} /></div>
                                <span className="text-sm font-medium text-gray-700">Suggest a Feature</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </a>

                        <a
                            href="mailto:jwrstack@gmail.com?subject=Bug Report"
                            className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-red-50 p-2 rounded-lg text-red-600"><div className="text-sm">🐛</div></div>
                                <span className="text-sm font-medium text-gray-700">Report a Bug</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </a>

                        <button
                            onClick={() => setShowFAQModal(true)}
                            className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><FileText size={18} /></div>
                                <span className="text-sm font-medium text-gray-700">FAQs</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </button>
                    </div>
                </section>

                <section className="mb-8">
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        {isPremium && (
                            <button
                                onClick={() => setShowPaymentHistoryModal(true)}
                                className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><FileText size={18} /></div>
                                    <span className="text-sm font-medium text-gray-700">Payment History</span>
                                </div>
                                <ChevronRight size={16} className="text-gray-300" />
                            </button>
                        )}
                    </div>
                </section>

                <button
                    onClick={onSignOut}
                    className="w-full p-4 mt-8 flex items-center justify-center gap-2 text-red-500 font-medium"
                >
                    <LogOut size={18} /> Sign Out
                </button>

                <div className="text-center text-xs text-gray-300 mt-4 pb-32">
                    Version {appVersion}
                </div>
            </div>

            <AnimatePresence>
                {showImportModal && (
                    <ImportModal
                        isOpen={showImportModal}
                        onClose={() => setShowImportModal(false)}
                        onImport={(subs) => {
                            if (onImport) onImport(subs);
                        }}
                        currency={currency}
                    />
                )}
                {showFAQModal && (
                    <FAQModal
                        isOpen={showFAQModal}
                        onClose={() => setShowFAQModal(false)}
                    />
                )}
                {showPaymentHistoryModal && (
                    <PaymentHistoryModal
                        isOpen={showPaymentHistoryModal}
                        onClose={() => setShowPaymentHistoryModal(false)}
                        history={paymentHistory}
                    />
                )}
            </AnimatePresence>

            {/* Confirmation Modal (Reused) */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
                showCancel={confirmModal.showCancel}
                onCancel={confirmModal.onCancel}
                onClose={confirmModal.onClose || (() => setConfirmModal(prev => ({ ...prev, isOpen: false })))}
            />
        </div >
    );
}

export default Settings;
