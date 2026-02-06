import React, { Component, useState, useEffect, useMemo, useCallback } from 'react';
// Local RevenueCat constants (mirroring @revenuecat/purchases-capacitor PACKAGE_TYPE)
const RC_PACKAGE_TYPE_ANNUAL = 3;
const RC_PACKAGE_TYPE_MONTHLY = 7;

import Navigation from './components/Navigation';
import PersonalDashboard from './components/PersonalDashboard';
import BusinessDashboard from './components/BusinessDashboard';
import SubscriptionList from './components/SubscriptionList';
import AddSubscription from './components/AddSubscription';
import Insights from './components/Insights';
import CalendarView from './components/CalendarView';
import Settings from './components/Settings';
import PremiumModal from './components/PremiumModal';
import ConfirmationModal from './components/ConfirmationModal';
import MarkAsPaidModal from './components/MarkAsPaidModal';
import Toast from './components/Toast';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import SplashScreen from './components/SplashScreen';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import LandingPage from './components/LandingPage';
import LegalPage from './components/LegalPage';
import { User, Subscription, SubscriptionStatus, BillingCycle } from './types';
import { supabase } from './lib/supabase';
import { INITIAL_SUBSCRIPTIONS, POPULAR_PROVIDERS, CATEGORIES, CURRENCY_TIMEZONE_MAP } from './constants';
import { AnimatePresence } from 'framer-motion';
import { fetchExchangeRates } from './services/currencyService';
import { scheduleSubscriptionReminders, initPushNotifications, requestNotificationPermission } from './services/notificationService';
import { convertCurrency, getCurrencySymbol, isUserPremium, shouldAutoAdvance, calculateNextRenewal, advanceBillingDateFromCycle } from './utils';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { initializePurchases, checkPremiumStatus, restorePurchases, presentPaywall, presentCustomerCenter, addCustomerInfoUpdateListener, getOfferings, purchasePackage } from './services/purchaseService';
import { createRazorpaySubscription } from './services/razorpayService';
import { supabaseRetry } from './utils/retryUtils';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { FeatureTour } from './components/FeatureTour';

// Simple Error Boundary
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState(prev => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.error?.message?.includes('fetch') ||
        this.state.error?.message?.includes('network');

      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center text-center px-6">
          <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">😵</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {isNetworkError ? 'Connection Lost' : 'Something went wrong'}
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              {isNetworkError
                ? "Please check your internet connection and try again."
                : "We hit an unexpected error. This has been logged."}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors active:scale-[0.98]"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Reload App
              </button>
            </div>

            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer text-center">Technical Details</summary>
                <pre className="bg-gray-50 p-3 rounded-lg text-[10px] text-gray-500 overflow-auto max-h-32 mt-2">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { getLockedSubscriptionIds } from './utils/lockUtils';

const MainApp: React.FC = () => {
  const { activeWorkspace, isBusinessWorkspace, createWorkspace, updateWorkspace, deleteWorkspace, workspaces, loading: workspacesLoading } = useWorkspace();

  // Persist Tab Selection & History Sync
  const [currentTab, setCurrentTabState] = useState(() => {
    // 1. Check URL first (deep linking)
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['dashboard', 'calendar', 'insights', 'settings'].includes(tabParam)) {
      return tabParam;
    }
    // 2. Fallback to localStorage (Web only) or Default
    const saved = localStorage.getItem('spendyx_current_tab');

    // On Native (Mobile), always start fresh at dashboard
    if (Capacitor.isNativePlatform()) {
      return 'dashboard';
    }

    return saved || 'dashboard';
  });

  // Wrapper to update URL when tab changes
  const setCurrentTab = (tab: string) => {
    setCurrentTabState(tab);
    // Push to history
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({ tab }, '', url.toString());
  };

  // Persist Tab Selection & History Sync
  useEffect(() => {
    if (currentTab) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') !== currentTab) {
        url.searchParams.set('tab', currentTab);
        window.history.pushState({}, '', url.toString());
      }
    }
  }, [currentTab]);


  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) {
        setCurrentTabState(tab);
      } else {
        // Default to dashboard if no param
        setCurrentTabState('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    localStorage.setItem('spendyx_current_tab', currentTab);
  }, [currentTab]);

  // Request Notification Permission on Startup
  useEffect(() => {
    const initNotifications = async () => {
      // Small delay to ensure UI is visible before popping up
      setTimeout(async () => {
        await requestNotificationPermission();
      }, 1000);
    };
    initNotifications();
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [globalSubscriptionCount, setGlobalSubscriptionCount] = useState(0);

  // Fetch global subscription count (across all owned workspaces)
  const fetchGlobalSubscriptionCount = async (userId: string) => {
    if (!userId) return;

    // 1. Get all workspaces owned by user
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('ownerId', userId);

    if (!workspaces || workspaces.length === 0) {
      setGlobalSubscriptionCount(0);
      return;
    }

    const workspaceIds = workspaces.map(w => w.id);

    // 2. Count active subscriptions in these workspaces
    const { count } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('workspaceId', workspaceIds)
      .eq('status', 'active'); // Only active ones

    setGlobalSubscriptionCount(count || 0);
  };

  const [initializing, setInitializing] = useState(true);
  const [showLanding, setShowLanding] = useState(() => {
    const isNative = Capacitor.isNativePlatform();
    // Check if running in standalone mode (PWA installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    return !isNative && !isStandalone;
  });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'success' | 'info';
    confirmText: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', confirmText: 'Confirm', onConfirm: () => { } });

  // Mark As Paid Modal State
  const [markAsPaidModal, setMarkAsPaidModal] = useState<{
    isOpen: boolean;
    subscription: Subscription | null;
  }>({ isOpen: false, subscription: null });

  // Toast State
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ isVisible: false, message: '', type: 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ isVisible: true, message, type });
  };

  // Handle Android Back Button - must be after all state declarations
  useEffect(() => {
    const handleBackButton = CapacitorApp.addListener('backButton', () => {
      // Priority 1: Close any open modals
      if (showAddModal) {
        setShowAddModal(false);
        return;
      }
      if (editingSubscription) {
        setEditingSubscription(null);
        return;
      }
      if (showPremiumModal) {
        setShowPremiumModal(false);
        return;
      }
      if (confirmModal.isOpen) {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        return;
      }

      // Priority 2: Navigate to dashboard if on other tabs
      if (currentTab !== 'dashboard') {
        setCurrentTab('dashboard');
        return;
      }

      // Priority 3: If on dashboard with no modals, minimize app (don't exit)
      CapacitorApp.minimizeApp();
    });

    return () => {
      handleBackButton.then(listener => listener.remove());
    };
  }, [showAddModal, editingSubscription, showPremiumModal, confirmModal.isOpen, currentTab]);

  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'danger' | 'warning' | 'success' | 'info' = 'warning',
    confirmText: string = 'Confirm'
  ) => {
    setConfirmModal({ isOpen: true, title, message, type, confirmText, onConfirm });
  };

  // App State
  const [user, setUser] = useState<User | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [customCategories, setCustomCategories] = useState<{ id: string, name: string, icon: string }[]>(() => {
    const saved = localStorage.getItem('spendyx_categories');
    return saved ? JSON.parse(saved) : [];
  });

  const allCategories = [...CATEGORIES, ...customCategories];

  const lockedIds = React.useMemo(() => {
    if (!user) return new Set<string>();
    return getLockedSubscriptionIds(subscriptions, isUserPremium(user));
  }, [subscriptions, user]);

  // Initialize Auth & Rates
  useEffect(() => {
    console.log("App mounted");
    // Flag to track if session was already restored on mount
    let sessionRestoredOnMount = false;

    fetchExchangeRates().then(data => {
      if (data) setRates(data.rates);
    }).catch(err => console.error("Rates error", err));

    const checkSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (user) {
          sessionRestoredOnMount = true; // Session exists on mount - don't show welcome
          // 1. render immediately with available metadata
          setUser({
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            defaultCurrency: 'USD',
            avatar: user.user_metadata?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
            isPremium: user.user_metadata?.is_premium || false // optimistically use metadata
          });
          setShowAuth(false);
          setInitializing(false); // Stop spinner immediately

          // Re-initialize notifications if enabled
          initPushNotifications();

          // 2. background fetch for strict premium state
          supabase.from('users').select('isPremium, premiumExpiryDate').eq('id', user.id).maybeSingle().then(({ data }) => {
            if (data?.isPremium) {
              setUser(prev => prev ? ({
                ...prev,
                isPremium: true,
                premiumExpiryDate: data.premiumExpiryDate
              }) : null);
            }
          });

        } else {
          console.log("No user found");
          setShowAuth(true);
          setShowOnboarding(false);
          setInitializing(false);
        }
      } catch (e) {
        console.error("Session check crashed:", e);
        setShowAuth(true);
        setInitializing(false);
      }
    };

    checkSession();

    // Handle Deep Links (for Google Auth Redirects)
    CapacitorApp.addListener('appUrlOpen', async (data) => {
      console.log('App opened with URL:', data.url);

      // Extract hash fragment from the URL
      const urlObj = new URL(data.url);
      const hash = urlObj.hash.substring(1); // Remove the '#'
      const params = new URLSearchParams(hash);

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        console.log("Setting session from Deep Link...");
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error("Failed to set session from deep link:", error);
          showToast("Login failed. Please try again.", "error");
          setInitializing(false); // Stop loading if error
        } else {
          console.log("Session set successfully! Checking user...");
          // Session is set, checkSession will now find the user
          checkSession();
        }
      } else if (data.url.includes('subtrack') || data.url.includes('login-callback')) {
        // Fallback: If no tokens in hash, maybe Supabase picked it up (rare)
        setTimeout(() => checkSession(), 1000);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);
      if (event === 'SIGNED_IN' && session?.user) {
        const userName = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
        // Immediate Render
        setUser({
          id: session.user.id,
          name: userName,
          email: session.user.email || '',
          defaultCurrency: 'USD',
          avatar: session.user.user_metadata?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
          isPremium: session.user.user_metadata?.is_premium || false
        });
        setShowAuth(false);
        setInitializing(false);

        // Show welcome toast ONLY for fresh login, not session restore on page reload
        if (!sessionRestoredOnMount) {
          // Slight delay to ensure it appears after any UI transitions
          setTimeout(() => {
            showToast(`Welcome back, ${userName}! 👋`, "success");
          }, 500);
        }

        // Background Check for Premium
        supabase.from('users').select('isPremium, premiumExpiryDate').eq('id', session.user.id).maybeSingle().then(({ data }) => {
          if (data?.isPremium) {
            setUser(prev => prev ? ({
              ...prev,
              isPremium: true,
              premiumExpiryDate: data.premiumExpiryDate
            }) : null);
          }
        });

        initPushNotifications();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setShowAuth(true);
        setShowOnboarding(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize RevenueCat and check entitlements on startup
  useEffect(() => {
    if (!user) return;

    let cleanup: (() => void) | null = null;

    const initRC = async () => {
      const initialized = await initializePurchases(user.id);
      if (initialized) {
        // Check initial premium status
        const { isPremium, expirationDate } = await checkPremiumStatus();
        setUser(prev => prev ? ({ ...prev, isPremium, premiumExpiryDate: expirationDate || undefined }) : null);
        // Always sync status AND expiration date to DB
        await supabase.from('users').update({
          "isPremium": isPremium,
          "premiumExpiryDate": expirationDate
        }).eq('id', user.id);

        // Subscribe to real-time entitlement changes (fires on purchase completion)
        cleanup = await addCustomerInfoUpdateListener(async ({ isPremium: newIsPremium, expirationDate: newExpiry }) => {
          setUser(prev => prev ? ({ ...prev, isPremium: newIsPremium, premiumExpiryDate: newExpiry || undefined }) : null);
          // Always sync status AND expiration date to DB
          await supabase.from('users').update({
            "isPremium": newIsPremium,
            "premiumExpiryDate": newExpiry
          }).eq('id', user.id);
        });
      }
    };

    initRC();

    // Cleanup listener on unmount or user change
    return () => {
      if (cleanup) cleanup();
    };
  }, [user?.id]);

  // Check for Onboarding Requirement
  useEffect(() => {
    console.log("Checking Onboarding Status:", {
      hasUser: !!user,
      workspacesLoading,
      workspacesCount: workspaces.length
    });

    if (user && !workspacesLoading && workspaces.length === 0) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [user, workspaces, workspacesLoading]);


  // Fetch Subscriptions when Workspace or User changes
  useEffect(() => {
    if (activeWorkspace) {
      console.log("Fetching subs for workspace:", activeWorkspace.id);
      fetchSubscriptions(activeWorkspace.id);
    } else {
      setSubscriptions([]);
    }
  }, [activeWorkspace]);

  const fetchSubscriptions = async (workspaceId: string) => {
    const { data, error } = await supabaseRetry(() =>
      supabase
        .from('subscriptions')
        .select('*')
        .eq('workspaceId', workspaceId) as any
    );

    if (error) {
      console.error('Error fetching subscriptions:', error);
    } else {
      // Auto-advance billing dates for auto_renew subscriptions
      const subsToUpdate: Subscription[] = [];
      const processedSubs = ((data as Subscription[]) || []).map((sub: Subscription) => {
        // Check if this sub needs auto-advance
        if (shouldAutoAdvance(sub.renewalDate, sub.paymentMode, sub.lastAutoRenewed, sub.billingCycle)) {
          const newRenewalDate = calculateNextRenewal(sub.renewalDate, sub.billingCycle);
          subsToUpdate.push({ ...sub, renewalDate: newRenewalDate, lastAutoRenewed: new Date().toISOString() });
          return { ...sub, renewalDate: newRenewalDate, lastAutoRenewed: new Date().toISOString() };
        }
        return sub;
      });

      // Update DB for auto-advanced subs (background, don't await)
      if (subsToUpdate.length > 0) {
        subsToUpdate.forEach(sub => {
          supabase
            .from('subscriptions')
            .update({ renewalDate: sub.renewalDate, lastAutoRenewed: sub.lastAutoRenewed })
            .eq('id', sub.id)
            .then(() => console.log('[Auto-Advance] Updated:', sub.name, 'to', sub.renewalDate));
        });
      }

      setSubscriptions(processedSubs);
    }
  };

  const handleOnboardingComplete = async (data: { currency: string, budget: number, selectedIds: string[] }) => {
    if (!user) return;

    console.log("Onboarding complete. Creating workspace & subscriptions...", data);
    try {
      // 1. Create Workspace
      const workspace = await createWorkspace(`${user.name}'s Space`, 'personal', user);

      if (workspace) {
        // 2. Update Workspace Budget/Currency
        await updateWorkspace(workspace.id, {
          currency: data.currency,
          monthlyBudget: data.budget,
          timezone: CURRENCY_TIMEZONE_MAP[data.currency] || 'America/New_York'
        });

        // 3. Create Selected Subscriptions
        if (data.selectedIds && data.selectedIds.length > 0) {
          const subsToCreate = data.selectedIds.map(id => {
            const provider = POPULAR_PROVIDERS.find(p => p.id === id);
            if (!provider) return null;

            // Convert Price to User's Currency
            // Default is USD in our constants
            const amount = convertCurrency(provider.defaultAmount || 0, 'USD', data.currency, rates);

            return {
              workspaceId: workspace.id,
              userId: user.id,
              name: provider.name,
              category: provider.categories[0] || 'other',
              amount: parseFloat(amount.toFixed(2)),
              currency: data.currency,
              billingCycle: 'Monthly',
              renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
              status: 'active',
              logoUrl: provider.logoUrl,
              autoRenew: true
            };
          }).filter(Boolean);

          if (subsToCreate.length > 0) {
            const { error: subError } = await supabase
              .from('subscriptions')
              .insert(subsToCreate);

            if (subError) {
              console.error("Failed to batch create subs:", subError);
              showToast("Workspace created, but failed to add some subscriptions.", "error");
            } else {
              console.log(`Created ${subsToCreate.length} default subscriptions`);
            }
          }
        }
      }
      console.log("Onboarding setup finished.");
    } catch (e) {
      console.error("Create workspace failed in onboarding:", e);
      showToast("Failed to create workspace. Please try again.", "error");
    }
  };

  const handleAuthComplete = (session: any) => {
    // Handled by onAuthStateChange logic for user state, but force UI to dashboard
    setCurrentTab('dashboard');
  };

  const handleUpgrade = async (planType?: 'monthly' | 'yearly') => {
    console.log('[Purchase] handleUpgrade called with planType:', planType);
    if (!user) {
      console.log('[Purchase] No user, aborting');
      return;
    }

    // WEB PAYMENT FLOW (Razorpay)
    // WEB PAYMENT FLOW (Razorpay)
    if (!Capacitor.isNativePlatform()) {
      createRazorpaySubscription({
        user,
        planId: planType || 'monthly', // Now supports both monthly and yearly
        onSuccess: async (response) => {
          console.log("Web Payment Success", response);
          await handleSuccess();
        },
        onFailure: (err) => {
          showToast(err.message || "Payment failed or cancelled.", "error");
        }
      });
      return;
    }

    try {
      // 1. If we don't have a specific plan type (unlikely given current flow), default to opening modal
      if (!planType) {
        console.log('[Purchase] No planType, opening modal');
        setShowPremiumModal(true);
        return;
      }

      // 2. Fetch Offerings to find the correct package
      console.log('[Purchase] Fetching offerings...');
      const packages = await getOfferings();
      console.log('[Purchase] Got packages:', packages.length, packages);

      // Map 'monthly'/'yearly' to RevenueCat Package Types
      // RC Package identifiers: $rc_monthly, $rc_annual (standard RevenueCat identifiers)
      // RC Package Types: 0=UNKNOWN, 1=CUSTOM, 2=LIFETIME, 3=ANNUAL, 4=SIX_MONTH, 5=THREE_MONTH, 6=TWO_MONTH, 7=MONTHLY, 8=WEEKLY
      // Product IDs: spendyx_pro:pro-monthly, spendyx_yearly:yearly
      const targetPackage = packages.find(pkg => {
        const id = pkg.identifier.toLowerCase();
        const productId = pkg.product?.identifier?.toLowerCase() || '';
        console.log('[Purchase] Checking package:', id, 'productId:', productId, 'type:', pkg.packageType);

        if (planType === 'monthly') {
          // Match $rc_monthly, product ID containing 'monthly', or packageType MONTHLY
          return id === '$rc_monthly' || productId.includes('monthly') || (pkg.packageType as any) === RC_PACKAGE_TYPE_MONTHLY;
        }
        if (planType === 'yearly') {
          // Match $rc_annual, product ID containing 'yearly' or 'annual', or packageType ANNUAL
          return id === '$rc_annual' || productId.includes('yearly') || productId.includes('annual') || (pkg.packageType as any) === RC_PACKAGE_TYPE_ANNUAL;
        }
        return false;
      });

      if (!targetPackage) {
        console.error("[Purchase] No matching package found for:", planType);
        console.error("[Purchase] Available packages:", packages.map(p => ({ id: p.identifier, type: p.packageType })));

        // Show specific error instead of confusing paywall fallback
        showToast(`${planType === 'yearly' ? 'Yearly' : 'Monthly'} plan not available yet. Please try again later.`, 'error');
        return;
      }

      // 3. Execute Direct Purchase
      console.log('[Purchase] Purchasing package:', targetPackage.identifier);
      console.log('[Purchase] Package details:', JSON.stringify({
        identifier: targetPackage.identifier,
        packageType: targetPackage.packageType,
        productId: targetPackage.product?.identifier,
        price: targetPackage.product?.priceString,
        title: targetPackage.product?.title
      }));
      const { success } = await purchasePackage(targetPackage);
      console.log('[Purchase] Purchase result:', success);

      if (success) {
        await handleSuccess();
      }
    } catch (error) {
      console.error('[Purchase] Purchase failed:', error);
      // Don't show generic error if user cancelled (handled in service), but service throws 'error' in some cases? 
      // The service logs cancellation and returns {success:false}, it re-throws real errors.
      if ((error as any).userCancelled) return;

      showToast('Purchase failed. Please try again.', 'error');
    }
  };

  const handleSuccess = async () => {
    // Always re-check premium status to get latest data including expiry
    let { isPremium: isPremiumNow, expirationDate } = await checkPremiumStatus();

    // WEB EXCEPTION: 
    // Razorpay webhook is async (takes 1-2s). usage of checkPremiumStatus via DB might be too fast.
    // If we are on Web and just came from a Success callback, we Optimistically enable Premium.
    // The Webhook (server-side) will handle the specific Expiry Date calculation and overwrite if needed.
    if (!Capacitor.isNativePlatform() && !isPremiumNow) {
      console.log("Optimistic Web Success: Enabling Premium immediately via Client");
      isPremiumNow = true;
      // Default to 1 month/1 year from now? Or just null and let webhook fix it?
      // Let's set a safe default of 30 days so the UI works, Webhook will correct it to 1 year if needed.
      expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    if (isPremiumNow) {
      // 1. Update DB with status AND expiry
      await supabase.from('users').update({
        "isPremium": true,
        "premiumExpiryDate": expirationDate
      }).eq('id', user!.id);

      // 2. Update Local State
      setUser(prev => prev ? ({ ...prev, isPremium: true, premiumExpiryDate: expirationDate || undefined }) : null);

      setShowPremiumModal(false);
      showToast("Welcome to Premium! 🌟", "success");
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleManageSubscription = async () => {
    // Show our custom Premium Modal which now includes History
    setShowPremiumModal(true);

    // Optional: If you want to also show RevenueCat management on mobile, 
    // you could add a button INSIDE PremiumModal to "Manage Subscription" (App Store/Play Store)
  };

  const handleRestorePurchases = async () => {
    try {
      const isPremium = await restorePurchases();
      if (isPremium) {
        setUser(prev => prev ? ({ ...prev, isPremium: true }) : null);
        await supabase.from('users').update({ "isPremium": true }).eq('id', user?.id);
        showToast("Purchases restored! Premium active. 🌟", "success");
      } else {
        showToast("No previous purchases found.", "info");
      }
    } catch (error) {
      console.error('Restore failed:', error);
      showToast('Restore failed. Please try again.', 'error');
    }
  };

  const handleAddSubscription = async (subData: any) => {
    if (!activeWorkspace || !user) return;

    const cleanedData = { ...subData };
    if (cleanedData.ownerUserId === '') cleanedData.ownerUserId = null;
    if (cleanedData.providerId === '') cleanedData.providerId = null;
    if (cleanedData.userId === '') cleanedData.userId = null;

    if (editingSubscription) {
      setSubscriptions(prev => prev.map(sub =>
        sub.id === editingSubscription.id ? { ...sub, ...cleanedData, workspaceId: activeWorkspace.id } : sub
      ));

      const dbPayload = {
        ...cleanedData,
        workspaceId: activeWorkspace.id
      };

      const { error } = await supabase
        .from('subscriptions')
        .update(dbPayload)
        .eq('id', editingSubscription.id)
        .select();

      if (error) {
        console.error("Error updating sub:", error);
        showToast(`Failed to update: ${error.message}`, 'error');
        fetchSubscriptions(activeWorkspace.id);
      } else {
        // Schedule reminders for updated subscription (OS-level scheduling)
        const updatedSubs = subscriptions.map(sub =>
          sub.id === editingSubscription.id ? { ...sub, ...cleanedData } as Subscription : sub
        );
        scheduleSubscriptionReminders(updatedSubs);

        // Phase 2: Report price change to crowdsourced table (any change)
        if (cleanedData.previous_amount && cleanedData.amount !== cleanedData.previous_amount) {
          // Show immediate toast notification for price update
          const diff = cleanedData.amount - cleanedData.previous_amount;
          const isIncrease = diff > 0;
          const currencySymbol = getCurrencySymbol(cleanedData.currency || activeWorkspace?.currency || 'USD');

          showToast(
            `${isIncrease ? '📈' : '📉'} ${cleanedData.name} price updated (${isIncrease ? '+' : ''}${currencySymbol}${diff.toFixed(2)})`,
            isIncrease ? 'error' : 'success'
          );

          const providerId = cleanedData.name.toLowerCase().replace(/[^a-z0-9]/g, '');

          // Try to upsert (insert or increment verification_count)
          const { error: upsertError } = await supabase
            .from('price_changes')
            .upsert({
              provider_id: providerId,
              provider_name: cleanedData.name,
              region: cleanedData.currency,
              old_amount: cleanedData.previous_amount,
              new_amount: cleanedData.amount,
              currency: cleanedData.currency,
              reported_by: user.id,
              last_verified_at: new Date().toISOString()
            }, {
              onConflict: 'provider_id,currency,new_amount',
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.log('Price change upsert failed (may already exist):', upsertError.message);
            // If upsert failed due to conflict, try to increment verification_count
            try {
              await supabase.rpc('increment_price_verification', {
                p_provider_id: providerId,
                p_currency: cleanedData.currency,
                p_new_amount: cleanedData.amount
              });
            } catch {
              // RPC doesn't exist yet, that's okay - the data is still being captured
              console.log('Verification increment skipped (RPC not available)');
            }
          }
        }
      }

      setEditingSubscription(null);
      fetchGlobalSubscriptionCount(user.id); // Update global count
    } else {
      // Enforce Free Plan Limit for new subscriptions (Global Active Count)
      // We use state 'globalSubscriptionCount' which is updated on load/change
      // But it might be slightly stale if user just added one in another tab.
      // For safety, we trust the state + current add.

      // Enforce Strict Free Plan Limit (Global)
      if (!isUserPremium(user)) {
        // Double check against DB to prevent bypass via stale state
        const { count, error } = await supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('userId', user.id); // Check ALL subscriptions owned by this user

        if (!error && (count || 0) >= 6) {
          showToast(`Free limit of 6 subscriptions reached across spaces. Upgrade to Premium for unlimited!`, "error");
          setShowPremiumModal(true);
          return;
        }
      }

      const newSubPayload = {
        workspaceId: activeWorkspace.id,
        userId: user.id,
        ...cleanedData
      };

      const { data, error } = await supabase
        .from('subscriptions')
        .insert([newSubPayload])
        .select()
        .single();

      if (error) {
        console.error("Error creating sub:", error);
        showToast(`Failed to create: ${error.message}`, 'error');
        fetchSubscriptions(activeWorkspace.id);
      } else if (data) {
        const newSub = data as Subscription;
        setSubscriptions(prev => [...prev, newSub]);
        // Schedule reminders for new subscription (OS-level scheduling)
        scheduleSubscriptionReminders([...subscriptions, newSub]);
      }
    }
    setShowAddModal(false);
    setCurrentTab('subscriptions');
  };

  const handleDeleteSubscription = async (id: string) => {
    showConfirmation(
      'Delete Subscription',
      'This subscription will be moved to trash. You can view it later in the "Deleted" filter.',
      async () => {
        // Soft delete - mark as deleted instead of removing
        setSubscriptions(prev => prev.map(s =>
          s.id === id ? { ...s, status: 'deleted' as any } : s
        ));
        setEditingSubscription(null);
        setShowAddModal(false);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await supabase.from('subscriptions').update({ status: 'deleted' }).eq('id', id);
        showToast('Subscription moved to trash', 'success');
        // Re-schedule reminders without the deleted subscription (OS-level scheduling)
        scheduleSubscriptionReminders(subscriptions.filter(s => s.id !== id && s.status === 'active'));
      },
      'warning',
      'Move to Trash'
    );
  };

  const handleBulkDelete = async (ids: string[]) => {
    showConfirmation(
      'Delete Subscriptions',
      `${ids.length} subscription${ids.length > 1 ? 's' : ''} will be moved to trash.`,
      async () => {
        // Soft delete - mark as deleted
        setSubscriptions(prev => prev.map(s =>
          ids.includes(s.id) ? { ...s, status: 'deleted' as any } : s
        ));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await supabase.from('subscriptions').update({ status: 'deleted' }).in('id', ids);
        showToast(`${ids.length} subscription${ids.length > 1 ? 's' : ''} moved to trash`, 'success');
      },
      'warning',
      'Move to Trash'
    );
  };

  const handleBulkMarkUsed = async (ids: string[]) => {
    const now = new Date().toISOString();
    setSubscriptions(prev => prev.map(s =>
      ids.includes(s.id) ? { ...s, lastUsedDate: now } : s
    ));
    await supabase.from('subscriptions').update({ "lastUsedDate": now }).in('id', ids);
  };

  const handleCancelSubscription = (id: string, cancelUrl?: string) => {
    if (cancelUrl) {
      window.open(cancelUrl, '_blank');
    }

    setTimeout(() => {
      showConfirmation(
        'Confirm Cancellation',
        'Have you successfully cancelled this subscription with the provider?',
        async () => {
          setSubscriptions(prev => prev.map(s =>
            s.id === id ? { ...s, status: 'cancelled' } : s
          ));
          setShowAddModal(false);
          setEditingSubscription(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', id);
          showToast('Subscription marked as cancelled', 'success');
        },
        'warning',
        'Yes, I cancelled it'
      );
    }, 500);
  };

  const handleMarkAsUsed = async (id: string) => {
    const now = new Date().toISOString();
    setSubscriptions(prev => prev.map(s =>
      s.id === id ? { ...s, lastUsedDate: now } : s
    ));
    await supabase.from('subscriptions').update({ "lastUsedDate": now }).eq('id', id);
  };

  // Mark as Paid handler for manual_pay subscriptions
  const handleMarkAsPaid = async (paidDate: string) => {
    const sub = markAsPaidModal.subscription;
    if (!sub) return;

    try {
      // Advance billing date from current billing date (not payment date)
      const newRenewalDate = advanceBillingDateFromCycle(sub.renewalDate, sub.billingCycle);

      // Update local state
      setSubscriptions(prev => prev.map(s =>
        s.id === sub.id ? { ...s, lastPaidDate: paidDate, renewalDate: newRenewalDate } : s
      ));

      // Update database
      await supabase.from('subscriptions').update({
        lastPaidDate: paidDate,
        renewalDate: newRenewalDate
      }).eq('id', sub.id);

      setMarkAsPaidModal({ isOpen: false, subscription: null });
      showToast('Payment recorded! Next due: ' + new Date(newRenewalDate).toLocaleDateString(), 'success');
    } catch (error) {
      console.error('Error marking as paid:', error);
      showToast('Failed to record payment', 'error');
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    // Count subscriptions in this workspace
    const subsInWorkspace = subscriptions.filter(s => s.workspaceId === id);
    const subCount = subsInWorkspace.length;

    const warningMessage = subCount > 0
      ? `This will permanently delete this workspace and ${subCount} subscription${subCount > 1 ? 's' : ''} in it. This action cannot be undone.`
      : 'Are you sure you want to delete this workspace? This action cannot be undone.';

    showConfirmation(
      'Delete Workspace',
      warningMessage,
      async () => {
        try {
          await deleteWorkspace(id);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          showToast(subCount > 0 ? `Workspace and ${subCount} subscription${subCount > 1 ? 's' : ''} deleted` : 'Workspace deleted', 'success');
        } catch (e: any) {
          showToast(e.message, 'error');
        }
      },
      'danger',
      subCount > 0 ? 'Delete All' : 'Delete Workspace'
    );
  };

  // Note: Notifications are scheduled when subscriptions are created/updated/deleted
  // Not on every subscriptions state change (this follows OS-level scheduling principle)

  const handleBulkCurrencyConvert = async (newCurrency: string) => {
    // 1. Calculate new amounts for all subscriptions
    const updatedSubs = subscriptions.map(sub => {
      // Skip if already same currency
      if (sub.currency === newCurrency) return sub;

      const newAmount = convertCurrency(sub.amount, sub.currency, newCurrency, rates);
      let newPreviousAmount = sub.previous_amount;
      if (sub.previous_amount) {
        newPreviousAmount = parseFloat(convertCurrency(sub.previous_amount, sub.currency, newCurrency, rates).toFixed(2));
      }

      let newOriginalAmount = sub.original_amount;
      if (sub.original_amount && sub.original_currency && sub.original_currency === sub.currency) {
        // If original was tracked in the old currency, convert it?
        // Actually, original_amount/currency is supposed to be the Anchor.
        // If we are converting everything, do we change the Anchor?
        // User intention: "Switch Dashboard to INR".
        // Usually valid anchor is the CONTRACT currency.
        // If I have Netflix (EUR), and switch dashboard to INR, Netflix is still EUR.
        // BUT `handleBulkCurrencyConvert` explicitly changes `sub.currency`.
        // This means we are RE-ANCHORING to the new currency?
        // If so, `original_amount` should probably update or be cleared?
        // Let's assume we convert it to preserve history relative value.
        newOriginalAmount = parseFloat(convertCurrency(sub.original_amount, sub.currency, newCurrency, rates).toFixed(2));
      }

      // Update original currency to new currency if we convert
      let newOriginalCurrency = sub.original_currency;
      if (sub.original_amount) {
        newOriginalCurrency = newCurrency;
      }

      return {
        ...sub,
        currency: newCurrency,
        amount: parseFloat(newAmount.toFixed(2)),
        previous_amount: newPreviousAmount,
        original_amount: newOriginalAmount,
        original_currency: newOriginalCurrency
      };
    });

    // 2. Optimistic Update
    setSubscriptions(updatedSubs);

    // 3. DB Update
    // Identify changed subs to optimize DB call
    const changedSubs = updatedSubs.filter(s => {
      const original = subscriptions.find(o => o.id === s.id);
      return original && original.currency !== s.currency;
    });

    if (changedSubs.length > 0) {
      // Upsert all changed subscriptions with new amount and currency
      // We pass the Full objects to be safe, assuming subscription object structure matches DB
      const { error } = await supabase.from('subscriptions').upsert(changedSubs);

      if (error) {
        console.error("Bulk update error:", error);
        showToast("Failed to save converted currencies", "error");
      } else {
        showToast(`Converted ${changedSubs.length} subscriptions to ${newCurrency}`, 'success');
      }
    }
  };

  const handleManage = React.useCallback((sub: Subscription) => {
    setEditingSubscription(sub);
    setShowAddModal(true);
  }, []);

  const handleSettings = React.useCallback(() => setCurrentTab('settings'), []);
  const handleViewWaste = React.useCallback(() => setCurrentTab('subscriptions'), []);

  const handleRestorePurchase = React.useCallback(async () => {
    // This would interface with RevenueCat
    showToast("Restoring purchases...", "info");
    setTimeout(() => {
      showToast("Purchases restored (Mock)", "success");
    }, 1500);
  }, []);

  // Simple Rate Us Logic: Show if we hit 5 subs exactly (once)
  React.useEffect(() => {
    if (subscriptions.length === 5 && !localStorage.getItem('hasRated')) {
      // Delay slightly for UX
      const timer = setTimeout(() => {
        setConfirmModal({
          isOpen: true,
          title: 'Enjoying SubTracker?',
          message: 'You have added 5 subscriptions! Would you mind rating us on the Play Store? It helps a lot. ⭐',
          type: 'info',
          confirmText: 'Rate Now',
          cancelText: 'Later',
          onConfirm: () => {
            window.open('https://play.google.com/store/apps/details?id=com.jwr.spendyx', '_blank');
            localStorage.setItem('hasRated', 'true');
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [subscriptions.length]);

  const handleUpdateProfile = async (name: string, email: string) => {
    if (!user) return;

    try {
      // 1. Update Supabase Auth Metadata (Source of Truth for name)
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: name }
      });

      if (authError) throw authError;

      // 2. Update Users Table (Sync)
      await supabase.from('users').update({ name }).eq('id', user.id);

      // 3. Update Local State
      setUser(prev => prev ? ({ ...prev, name: name }) : null);

      showToast('Profile updated!', 'success');

    } catch (error: any) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile', 'error');
    }
  };

  const handleSignOut = React.useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setShowAuth(true);
      setShowOnboarding(false);
      // Removed toast as it was appearing erroneously and UI switch is sufficient feedback
    } catch (error) {
      console.error("Sign out failed:", error);
      // Keep error toast
      showToast("Failed to sign out", "error");
    }
  }, []);

  const handleOpenAddModal = () => {
    // Check Free Plan Limit (Global)
    if (!user?.isPremium && globalSubscriptionCount >= 6) {
      setConfirmModal({
        isOpen: true,
        title: 'Limit Reached 🔒',
        message: `Free limit of 6 subscriptions reached across spaces. Upgrade to Premium for unlimited!`,
        type: 'info',
        confirmText: 'Upgrade to Unlimited',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setShowPremiumModal(true);
        }
      });
      return;
    }
    setEditingSubscription(null);
    setShowAddModal(true);
  };

  const renderContent = () => {
    if (workspacesLoading && !showOnboarding && !showAuth) {
      return <div className="absolute inset-0 flex items-center justify-center bg-gray-50"><div className="animate-pulse flex flex-col items-center"><div className="h-12 w-12 bg-indigo-200 rounded-full mb-4"></div><div className="h-4 w-32 bg-gray-200 rounded"></div></div></div>;
    }

    if (!user) return null;
    if (!activeWorkspace) return <div className="p-10 text-center opacity-60">Please select a workspace</div>;

    return (
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {currentTab === 'dashboard' && (
          isBusinessWorkspace
            ? <BusinessDashboard subscriptions={subscriptions} rates={rates} onManage={handleManage} currency={activeWorkspace.currency} onViewWaste={handleViewWaste} />
            : <PersonalDashboard
              user={user!}
              subscriptions={subscriptions}
              onManage={(sub) => {
                setEditingSubscription(sub);
                setShowAddModal(true);
              }}
              onSettings={() => setCurrentTab('settings')}
              rates={rates}
              currency={activeWorkspace?.currency || 'USD'}
              monthlyBudget={activeWorkspace?.monthlyBudget || 0}
              onAdd={() => setShowAddModal(true)}
              isPremium={isUserPremium(user!)}
              lockedIds={lockedIds}
            />
        )}

        {currentTab === 'subscriptions' && (
          <SubscriptionList
            user={user!}
            subscriptions={subscriptions}
            currency={activeWorkspace?.currency || 'USD'}
            onSelect={(sub) => {
              setEditingSubscription(sub);
              setShowAddModal(true);
            }}
            onSettings={() => setCurrentTab('settings')}
            rates={rates}
            categories={allCategories}
            onMarkAsUsed={handleMarkAsUsed}
            onMarkAsPaid={(sub) => setMarkAsPaidModal({ isOpen: true, subscription: sub })}
            onBulkDelete={handleBulkDelete}
            onBulkMarkUsed={handleBulkMarkUsed}
            monthlyBudget={activeWorkspace?.monthlyBudget}
            isPremium={isUserPremium(user!)}
            lockedIds={lockedIds}
            onLockedClick={() => {
              setConfirmModal({
                isOpen: true,
                title: "Subscription Locked 🔒",
                message: "This subscription exceeds your free plan limit (6 subs). Upgrade to Premium to unlock it!",
                type: 'info',
                confirmText: "Get Premium",
                cancelText: "Cancel",
                showCancel: true,
                onConfirm: () => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  setShowPremiumModal(true);
                }
              });
            }}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView user={user!} subscriptions={subscriptions} currency={activeWorkspace?.currency || 'USD'} onSettings={() => setCurrentTab('settings')} rates={rates} />
        )}

        {currentTab === 'insights' && (
          <Insights user={user!} subscriptions={subscriptions} rates={rates} currency={activeWorkspace?.currency || 'USD'} onSettings={() => setCurrentTab('settings')} />
        )}

        {currentTab === 'settings' && (
          <Settings
            user={user!}
            subscriptions={subscriptions}
            currency={activeWorkspace?.currency || 'USD'}
            monthlyBudget={activeWorkspace?.monthlyBudget || 0}
            isPremium={isUserPremium(user)}
            onUpgrade={() => handleUpgrade()}
            onManageSubscription={handleManageSubscription}
            onChangeCurrency={(curr, oldCurr, currentBudget, recommendedTimezone) => {
              if (activeWorkspace) {
                const oldCurrency = oldCurr || activeWorkspace?.currency;
                let newBudget = currentBudget || activeWorkspace?.monthlyBudget || 0;

                if (oldCurrency !== curr) {
                  newBudget = convertCurrency(newBudget, oldCurrency, curr, rates);
                }

                // Currencies that don't use decimal places in practice
                const noDecimalCurrencies = ['INR', 'JPY', 'KRW', 'IDR', 'VND', 'CLP'];
                const finalBudget = noDecimalCurrencies.includes(curr)
                  ? Math.round(newBudget)
                  : Math.round(newBudget * 100) / 100;

                const updates: any = {
                  currency: curr,
                  monthlyBudget: finalBudget,
                };

                // Only auto-update timezone if user hasn't manually set it
                // OR if a timezone was explicitly passed (manual update from settings)
                if (!activeWorkspace.timezone_set_manually && recommendedTimezone) {
                  updates.timezone = recommendedTimezone;
                }

                // If it's a direct timezone update (not currency change), save it and set flag
                if (curr === activeWorkspace.currency && recommendedTimezone && recommendedTimezone !== activeWorkspace.timezone) {
                  updates.timezone = recommendedTimezone;
                  updates.timezone_set_manually = true;
                }

                updateWorkspace(activeWorkspace.id, updates);
              }
            }}

            onUpdateBudget={(budget) => {
              if (activeWorkspace) {
                updateWorkspace(activeWorkspace.id, { monthlyBudget: budget });
              }
            }}
            rates={rates}
            categories={allCategories}
            onAddCategory={(name) => {
              const newCat = { id: name.toLowerCase().replace(/\s+/g, '-'), name, icon: '📦' };
              setCustomCategories(prev => {
                const updated = [...prev, newCat];
                localStorage.setItem('spendyx_categories', JSON.stringify(updated));
                return updated;
              });
            }}
            onClose={() => setCurrentTab('dashboard')}
            onUpdateProfile={handleUpdateProfile}
            onOpenPremiumModal={() => setShowPremiumModal(true)}
            onImport={async (subs) => {
              if (activeWorkspace) {
                // Strict Check for Import
                if (!isUserPremium(user)) {
                  const { count } = await supabase
                    .from('subscriptions')
                    .select('*', { count: 'exact', head: true })
                    .eq('userId', user.id);

                  if (((count || 0) + subs.length) > 6) {
                    showToast(`Cannot import ${subs.length} subs. Free limit of 6 reached.`, "error");
                    setShowPremiumModal(true);
                    return;
                  }
                }

                subs.forEach(async (sub) => {
                  await handleAddSubscription(sub);
                });
              }
            }}
            onDeleteWorkspace={handleDeleteWorkspace}
            onRestorePurchase={handleRestorePurchase}
            onSignOut={handleSignOut}
            onConvertAllSubscriptions={handleBulkCurrencyConvert}
          />
        )}
      </div>
    );
  };

  if (initializing && Capacitor.isNativePlatform()) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  // Show splash screen first on app launch (Native only)
  if (showSplash && Capacitor.isNativePlatform()) return <SplashScreen onComplete={() => setShowSplash(false)} duration={2500} />;

  if (showAuth) {
    // On Web, show Landing Page first if not dismissed
    if (!Capacitor.isNativePlatform() && showLanding) {
      return <LandingPage onGetStarted={() => setShowLanding(false)} />;
    }
    return <Auth onComplete={handleAuthComplete} />;
  }

  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div className="bg-white min-h-screen text-gray-800 font-sans w-full overflow-hidden relative">
      {currentTab === 'dashboard' && user && (
        <div className="bg-gray-50 px-4 pt-4 pb-2 flex justify-between items-center gap-3">
          <div className="flex-1 min-w-0">
            <WorkspaceSwitcher />
          </div>
          <button
            onClick={() => setCurrentTab('settings')}
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 active:scale-95 transition-transform"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs">
                {user?.name?.[0]}
              </div>
            )}
          </button>
        </div>
      )}

      <main>
        {renderContent()}
      </main>

      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onAdd={handleOpenAddModal}
      />

      <AnimatePresence>
        {showAddModal && (
          <AddSubscription
            initialData={editingSubscription}
            onClose={() => { setShowAddModal(false); setEditingSubscription(null); }}
            onSave={handleAddSubscription}
            onDelete={handleDeleteSubscription}
            onCancelSub={handleCancelSubscription}
            currency={activeWorkspace?.currency || 'USD'}
            categories={allCategories}
            onShowToast={showToast}
            rates={rates}
          />
        )}
      </AnimatePresence>

      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onUpgrade={handleUpgrade}
        onRestore={handleRestorePurchases}
        currency={activeWorkspace?.currency || 'USD'}
        rates={rates}
        user={user}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
      />

      <MarkAsPaidModal
        isOpen={markAsPaidModal.isOpen}
        onClose={() => setMarkAsPaidModal({ isOpen: false, subscription: null })}
        subscription={markAsPaidModal.subscription}
        onConfirm={handleMarkAsPaid}
      />

      <FeatureTour userId={user?.id} />
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
};



const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  if (currentPath === '/privacy-policy') return <LegalPage type="privacy" />;
  if (currentPath === '/terms') return <LegalPage type="terms" />;

  return (
    <WorkspaceProvider>
      <MainApp />
    </WorkspaceProvider>
  );
};

export default App;