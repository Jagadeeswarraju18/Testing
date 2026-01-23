import { Purchases, LOG_LEVEL, PurchasesPackage, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';
import { Capacitor } from '@capacitor/core';

// RevenueCat API Keys - Prioritize user provided key
const REVENUECAT_API_KEY = 'goog_MSwRNhDvkgswYTqxVWipuuEbWit';

// Entitlement ID - Must match what you configure in RevenueCat Dashboard
const PREMIUM_ENTITLEMENT_ID = 'Spendyx Pro';

// Production-safe logging
const isDev = import.meta.env.DEV;
const log = (message: string, ...args: any[]) => {
    if (isDev) console.log(message, ...args);
};

/**
 * Initialize RevenueCat SDK - Call this on app startup
 */
export const initializePurchases = async (userId?: string): Promise<boolean> => {
    try {
        const platform = Capacitor.getPlatform();

        // Only initialize on native platforms
        if (platform === 'web') {
            log('RevenueCat: Web platform detected, skipping initialization');
            return false;
        }

        if (!REVENUECAT_API_KEY) {
            console.warn('RevenueCat: API key not configured');
            return false;
        }

        // Only enable debug logging in development
        await Purchases.setLogLevel({ level: isDev ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR });

        if (userId) {
            await Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: userId });
        } else {
            await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        }

        log('RevenueCat: Initialized successfully');
        return true;
    } catch (error) {
        console.error('RevenueCat: Initialization failed', error);
        return false;
    }
};

/**
 * Check if user has active Premium entitlement
 * Call this on every app launch!
 */
export const checkPremiumStatus = async (): Promise<{ isPremium: boolean; expirationDate: string | null }> => {
    try {
        const platform = Capacitor.getPlatform();
        if (platform === 'web') {
            log('RevenueCat: Web platform, returning false for premium');
            return { isPremium: false, expirationDate: null };
        }

        const { customerInfo } = await Purchases.getCustomerInfo();
        const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
        const isPremium = entitlement !== undefined;
        // entitlement.expirationDate is null for lifetime, ISO string otherwise
        const expirationDate = entitlement?.expirationDate || null;

        log('RevenueCat: Premium status =', isPremium, 'Expires =', expirationDate);
        return { isPremium, expirationDate };
    } catch (error) {
        console.error('RevenueCat: Failed to check premium status', error);
        return { isPremium: false, expirationDate: null };
    }
};

/**
 * Get available purchase packages (offerings)
 */
export const getOfferings = async (): Promise<PurchasesPackage[]> => {
    try {
        const platform = Capacitor.getPlatform();
        if (platform === 'web') {
            return [];
        }

        const offerings = await Purchases.getOfferings();

        if (offerings?.current && offerings.current.availablePackages.length > 0) {
            return offerings.current.availablePackages;
        }

        return [];
    } catch (error) {
        console.error('RevenueCat: Failed to get offerings', error);
        return [];
    }
};

/**
 * Purchase a package - Returns true if successful
 */
export const purchasePackage = async (pkg: PurchasesPackage): Promise<{ success: boolean; customerInfo?: CustomerInfo }> => {
    try {
        const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });

        const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

        return { success: isPremium, customerInfo };
    } catch (error: any) {
        // User cancelled is not an error
        if (error.userCancelled) {
            log('RevenueCat: User cancelled purchase');
            return { success: false };
        }

        console.error('RevenueCat: Purchase failed', error);
        throw error;
    }
};

/**
 * Restore previous purchases - For "Restore Purchases" button
 */
export const restorePurchases = async (): Promise<boolean> => {
    try {
        const platform = Capacitor.getPlatform();
        if (platform === 'web') {
            return false;
        }

        const { customerInfo } = await Purchases.restorePurchases();
        const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

        log('RevenueCat: Restore completed, Premium =', isPremium);
        return isPremium;
    } catch (error) {
        console.error('RevenueCat: Restore failed', error);
        return false;
    }
};

/**
 * Present the RevenueCat Paywall
 * Returns true if the user purchased or restored, false otherwise
 */
export const presentPaywall = async (): Promise<boolean> => {
    try {
        const platform = Capacitor.getPlatform();
        if (platform === 'web') {
            console.warn("Paywall not available on web");
            alert("Purchases are not available in web browser. Please use the Android app.");
            return false;
        }

        console.log('[RevenueCat] Presenting paywall...');
        const result = await RevenueCatUI.presentPaywall();
        console.log('[RevenueCat] Paywall result:', result);

        // Check status after close to be sure
        const { isPremium } = await checkPremiumStatus();
        return isPremium;
    } catch (error: any) {
        console.error("[RevenueCat] Error presenting paywall:", error);
        // Show the error to the user so we can debug
        const errorMessage = error?.message || error?.code || JSON.stringify(error);
        alert(`Payment Error: ${errorMessage}\n\nThis usually means RevenueCat is not fully configured. Please check the RevenueCat dashboard.`);
        return false;
    }
};

/**
 * Present the RevenueCat Customer Center
 */
export const presentCustomerCenter = async (): Promise<void> => {
    try {
        const platform = Capacitor.getPlatform();
        if (platform === 'web') {
            console.warn("Customer Center not available on web");
            return;
        }
        await RevenueCatUI.presentCustomerCenter();
    } catch (error) {
        console.error("Error presenting Customer Center:", error);
    }
};

/**
 * Add a listener for customer info changes (real-time premium status updates)
 * This fires whenever entitlements change, e.g., after successful purchase
 */
export const addCustomerInfoUpdateListener = async (
    onUpdate: (info: { isPremium: boolean; expirationDate: string | null }) => void
): Promise<() => void> => {
    const platform = Capacitor.getPlatform();
    if (platform === 'web') {
        return () => { }; // No-op cleanup for web
    }

    try {
        const listener: any = await Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
            const entitlement = info.entitlements.active[PREMIUM_ENTITLEMENT_ID];
            const isPremium = entitlement !== undefined;
            const expirationDate = entitlement?.expirationDate || null;

            log('RevenueCat: Customer info updated, Premium =', isPremium);
            onUpdate({ isPremium, expirationDate });
        });

        // Return cleanup function
        return () => {
            if (listener && typeof listener.remove === 'function') {
                listener.remove();
            }
        };
    } catch (error) {
        console.error('RevenueCat: Failed to add listener', error);
        return () => { };
    }
};

