import { Subscription, SubscriptionStatus, BillingCycle } from '../types';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils';

// Check if running on native platform
const isNative = Capacitor.isNativePlatform();

/**
 * Initialize push notifications for native platforms
 */
export const initPushNotifications = async () => {
    if (!isNative) {
        console.log('Push notifications only work on native platforms');
        return false;
    }

    // Respect user preference ("false" means disabled)
    // Default is assumed TRUE if null (opt-out)
    const wantsNotifications = localStorage.getItem('spendyx_notifications') !== 'false';
    if (!wantsNotifications) {
        console.log('Push notifications disabled by user preference');
        return false;
    }

    try {
        // Request permission for local notifications
        const localPermStatus = await LocalNotifications.requestPermissions();
        if (localPermStatus.display !== 'granted') {
            console.log('Local notification permission not granted');
        }

        // Request permission for push notifications
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            console.log('Push notification permission NOT granted: ' + permStatus.receive);
            return false;
        }

        console.log('Push notification permission GRANTED');

        // Register with FCM
        await PushNotifications.register();

        // Listen for registration success
        PushNotifications.addListener('registration', async (token: Token) => {
            console.log('FCM Token:', token.value);
            await saveFCMToken(token.value);
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Push registration error:', error);
        });

        // Listen for incoming notifications (foreground)
        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
            console.log('Push notification received:', notification);
        });

        // Listen for notification taps
        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
            console.log('Push notification action:', action);
        });

        return true;
    } catch (error) {
        console.error('Error initializing push notifications:', error);
        return false;
    }
};

/**
 * Save FCM token to Supabase
 */
export const saveFCMToken = async (token: string) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('fcm_tokens')
            .upsert({
                user_id: user.id,
                token: token,
                device_info: `${Capacitor.getPlatform()} - ${new Date().toISOString()}`,
                updated_at: new Date().toISOString()
            }, { onConflict: 'token' });

        if (error) console.error('Error saving FCM token:', error);
    } catch (error) {
        console.error('Error in saveFCMToken:', error);
    }
};

/**
 * Schedule local reminders for subscriptions
 * NOTE: Disabled because server-side push notifications (via cron + Edge Function)
 * are now handling all reminders. Keeping local scheduling would cause duplicates.
 * To re-enable local notifications as fallback, remove the early return below.
 */
export const scheduleSubscriptionReminders = async (subscriptions: Subscription[]) => {
    // Server-side notifications are now primary - skip local scheduling to prevent duplicates
    console.log('[Notifications] Local scheduling disabled - using server-side push notifications');
    return;

    try {
        // Cancel all existing scheduled notifications first
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel({
                notifications: pending.notifications.map(n => ({ id: n.id }))
            });
        }

        const notifications: ScheduleOptions['notifications'] = [];
        let notificationId = 1;

        // Use actual current time for comparison, not midnight
        const now = new Date();
        console.log(`[Notifications] Scheduling at ${now.toISOString()}`);

        subscriptions.forEach(sub => {
            if (sub.status !== SubscriptionStatus.Active) return;

            // Parse Custom Time (Default 9:00 AM)
            const [hours, minutes] = (sub.notificationTime || "09:00").split(':').map(Number);

            const renewalDate = new Date(sub.renewalDate);
            renewalDate.setHours(hours, minutes, 0, 0);

            const reminderDays = sub.reminderDays || [3];

            reminderDays.forEach(daysBefore => {
                const baseDate = new Date(renewalDate);
                baseDate.setDate(baseDate.getDate() - daysBefore);

                // Determine Repetitions based on Frequency
                // 1h = 5 times, 3h = 3 times, 5h = 2 times, 24h = once (handled by days loop), once = 1
                const freq = sub.notificationFrequency || 'once';
                let validRepeats = 1;
                let intervalHours = 0;

                if (freq === '1h') { validRepeats = 5; intervalHours = 1; }
                else if (freq === '3h') { validRepeats = 3; intervalHours = 3; }
                else if (freq === '5h') { validRepeats = 2; intervalHours = 5; }

                for (let i = 0; i < validRepeats; i++) {
                    const scheduleTime = new Date(baseDate);
                    scheduleTime.setHours(scheduleTime.getHours() + (i * intervalHours));

                    // Only schedule future reminders (compare against NOW, not midnight)
                    if (scheduleTime > now) {
                        const isNag = i > 0;
                        console.log(`[Notifications] Scheduling ${sub.name} reminder at ${scheduleTime.toISOString()} (repeat ${i + 1}/${validRepeats})`);

                        // Human-readable day text
                        const dayText = daysBefore === 0 ? 'today' : daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;



                        notifications.push({
                            id: notificationId++,
                            title: `⏰ ${sub.name} renews ${dayText}`,
                            body: `${formatCurrency(sub.amount, sub.currency)} will be charged automatically.\nCancel or review if you're not using it.`,
                            schedule: { at: scheduleTime },
                            sound: 'default',
                            smallIcon: 'ic_notification',
                            largeIcon: 'ic_launcher',
                        });
                    } else {
                        console.log(`[Notifications] Skipped past notification for ${sub.name} at ${scheduleTime.toISOString()}`);
                    }
                }
            });

            // Actual Renewal Day (Initial single notification)
            if (renewalDate >= now) {
                notifications.push({
                    id: notificationId++,
                    title: `💸 ${sub.name} Payment Due`,
                    body: `${formatCurrency(sub.amount, sub.currency)} will be charged today.\nReview your subscription now.`,
                    schedule: { at: renewalDate },
                    sound: 'default',
                    smallIcon: 'ic_notification',
                    largeIcon: 'ic_launcher',
                });
            }
        });

        if (notifications.length > 0) {
            await LocalNotifications.schedule({ notifications });
            console.log(`Scheduled ${notifications.length} reminder notifications`);
        }
    } catch (error) {
        console.error('Error scheduling reminders:', error);
    }
};

/**
 * Web Notification Permission (for browser/PWA)
 */
export const requestNotificationPermission = async () => {
    if (isNative) {
        return initPushNotifications();
    }

    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return false;
};

/**
 * Check current permission status without requesting
 */
export const getPermissionStatus = async () => {
    if (isNative) {
        try {
            const status = await PushNotifications.checkPermissions();
            return status.receive === 'granted';
        } catch (e) {
            console.error("Error checking native perm", e);
            return false;
        }
    }

    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
};

/**
 * Cancel all notifications (Native & Logic)
 */
export const cancelAllNotifications = async () => {
    if (isNative) {
        try {
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel({
                    notifications: pending.notifications.map(n => ({ id: n.id }))
                });
            }
        } catch (error) {
            console.error('Error canceling notifications:', error);
        }
    }
};

/**
 * Trigger a test notification (5 seconds delay)
 */
export const sendTestNotification = async () => {
    console.log("Scheduling test notification...");
    if (!isNative) {
        if ('Notification' in window && Notification.permission === 'granted') {
            setTimeout(() => {
                new Notification("Test Notification", { body: "If you see this, it works! 🎉" });
            }, 5000);
        }
        return;
    }

    try {
        await LocalNotifications.schedule({
            notifications: [{
                title: 'Test Notification 🔔',
                body: 'Success! Notifications are working perfectly on Spendyx. 🎉',
                id: 99999,
                schedule: { at: new Date(Date.now() + 5000) }, // 5s delay
                sound: 'default',
                smallIcon: 'ic_notification',
                largeIcon: 'ic_launcher',
            }]
        });
        console.log("Test notification scheduled.");
        return true;
    } catch (error) {
        console.error("Test notification failed:", error);
        return false;
    }
};

/**
 * Check for reminders (Web only)
 */
export const checkReminders = (subscriptions: Subscription[]) => {
    const isEnabled = localStorage.getItem('spendyx_notifications') !== 'false';
    if (!isEnabled) {
        if (isNative) cancelAllNotifications(); // Ensure clean slate on native
        return;
    }

    if (isNative) {
        // On native, schedule local notifications instead
        scheduleSubscriptionReminders(subscriptions);
        return;
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    subscriptions.forEach(sub => {
        if (sub.status !== SubscriptionStatus.Active) return;

        const renewalDate = new Date(sub.renewalDate);
        renewalDate.setHours(0, 0, 0, 0);

        const diffTime = renewalDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const reminderDays = sub.reminderDays || [3];

        if (reminderDays.includes(diffDays)) {
            new Notification(`Upcoming Renewal: ${sub.name}`, {
                body: `Your ${sub.name} subscription renews in ${diffDays} days. Amount: ${sub.currency} ${sub.amount}`,
                icon: sub.logoUrl || '/vite.svg'
            });
        } else if (diffDays === 0) {
            new Notification(`Payment Due Today: ${sub.name}`, {
                body: `Your ${sub.name} subscription renews today! Amount: ${sub.currency} ${sub.amount}`,
                icon: sub.logoUrl || '/vite.svg'
            });
        }
    });
};
