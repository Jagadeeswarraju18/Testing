/**
 * Widget Service
 * 
 * Prepares data for native home screen widgets.
 * 
 * IMPORTANT: Home screen widgets require native code to render:
 * - iOS: SwiftUI + WidgetKit (in Xcode)
 * - Android: RemoteViews + AppWidgetProvider (in Android Studio)
 * 
 * This service provides the data that would be passed to native widgets
 * via capacitor-widget-bridge SharedPreferences/UserDefaults.
 * 
 * To fully implement widgets:
 * 1. Install: npm install capacitor-widget-bridge
 * 2. Create native widget in android/app/src/main/java/.../widget/
 * 3. Create native widget in ios/App/Widget Extension/
 * 4. Use this service to sync data
 */

import { Subscription, BillingCycle } from '../types';
import { formatCurrency, convertCurrency } from '../utils';

export interface WidgetData {
    totalMonthlySpend: number;
    totalMonthlySpendFormatted: string;
    subscriptionCount: number;
    nextRenewal: {
        name: string;
        daysLeft: number;
        amount: number;
        amountFormatted: string;
    } | null;
    upcomingThisWeek: number;
    currency: string;
    lastUpdated: string;
}

/**
 * Generate widget data from subscriptions
 */
export function generateWidgetData(
    subscriptions: Subscription[],
    currency: string,
    rates: Record<string, number> = {}
): WidgetData {
    const activeSubs = subscriptions.filter(s => s.status === 'active');
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Calculate total monthly spend
    let totalMonthlySpend = 0;
    activeSubs.forEach(sub => {
        let amount = sub.amount;

        // Currency conversion
        if (rates && sub.currency && sub.currency !== currency) {
            amount = convertCurrency(amount, sub.currency, currency, rates);
        }

        // Normalize to monthly
        switch (sub.billingCycle) {
            case BillingCycle.Weekly:
                amount *= 4.33;
                break;
            case BillingCycle.Annual:
                amount /= 12;
                break;
            case BillingCycle.Quarterly:
                amount /= 3;
                break;
            case BillingCycle.SemiAnnual:
                amount /= 6;
                break;
        }

        totalMonthlySpend += amount;
    });

    // Find next renewal
    let nextRenewal: WidgetData['nextRenewal'] = null;
    let minDays = Infinity;

    activeSubs.forEach(sub => {
        const renewalDate = new Date(sub.renewalDate);
        renewalDate.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft >= 0 && daysLeft < minDays) {
            minDays = daysLeft;
            let amount = sub.amount;
            if (rates && sub.currency && sub.currency !== currency) {
                amount = convertCurrency(amount, sub.currency, currency, rates);
            }
            nextRenewal = {
                name: sub.name,
                daysLeft,
                amount,
                amountFormatted: formatCurrency(amount, currency)
            };
        }
    });

    // Count renewals this week
    const upcomingThisWeek = activeSubs.filter(sub => {
        const renewalDate = new Date(sub.renewalDate);
        renewalDate.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysLeft >= 0 && daysLeft <= 7;
    }).length;

    return {
        totalMonthlySpend: Math.round(totalMonthlySpend * 100) / 100,
        totalMonthlySpendFormatted: formatCurrency(totalMonthlySpend, currency),
        subscriptionCount: activeSubs.length,
        nextRenewal,
        upcomingThisWeek,
        currency,
        lastUpdated: new Date().toISOString()
    };
}

/**
 * Sync widget data to native layer
 * Requires capacitor-widget-bridge plugin installed
 */
export async function syncWidgetData(data: WidgetData): Promise<boolean> {
    try {
        // Check if running in Capacitor native environment
        const { Capacitor } = await import('@capacitor/core');

        if (!Capacitor.isNativePlatform()) {
            console.log('[WidgetService] Not running on native platform, skipping widget sync');
            return false;
        }

        // Try to import widget bridge (will fail if not installed)
        try {
            // @ts-ignore
            const { WidgetBridge } = await import('capacitor-widget-bridge');

            // Store data for widget to read
            await WidgetBridge.setItem({
                group: 'group.com.subtracker.app',
                key: 'widget_data',
                value: JSON.stringify(data)
            });

            // Trigger widget reload
            await WidgetBridge.reloadAllTimelines();

            console.log('[WidgetService] Widget data synced successfully');
            return true;
        } catch (e) {
            console.log('[WidgetService] capacitor-widget-bridge not installed - widgets not available');
            return false;
        }
    } catch (e) {
        console.error('[WidgetService] Error syncing widget data:', e);
        return false;
    }
}
