// Supabase Edge Function: send-reminders
// Supports user-configured notification time and frequency
// Deploy: supabase functions deploy send-reminders

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_SERVICE_ACCOUNT = JSON.parse(
    Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}"
);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
    try {
        const url = new URL(req.url);
        const secret = url.searchParams.get("secret");

        // Allow GET requests if the secret matches
        if (req.method === "GET") {
            if (secret !== "spendyx_secure_cron_2026") {
                return new Response(JSON.stringify({ error: "Unauthorized" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                });
            }
        } else if (req.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }
        console.log("Starting reminder check...");

        const accessToken = await getFirebaseAccessToken();
        if (!accessToken) {
            return new Response(JSON.stringify({ error: "Failed to get Firebase token" }), { status: 500 });
        }

        // Get current UTC time
        const now = new Date();
        console.log(`Current UTC time: ${now.toISOString()}`);

        // Get all active subscriptions with notification settings and timezone
        const { data: subscriptions, error: subError } = await supabase
            .from("subscriptions")
            .select(`
                id, name, amount, currency, "renewalDate", "reminderDays",
                notification_time, notification_frequency,
                "workspaceId",
                workspaces!inner("ownerId", timezone)
            `)
            .eq("status", "active");

        if (subError) {
            console.error("Error fetching subscriptions:", subError);
            return new Response(JSON.stringify({ error: subError.message }), { status: 500 });
        }

        console.log(`Found ${subscriptions?.length || 0} active subscriptions`);

        const notificationsToSend: { userId: string; title: string; body: string }[] = [];

        for (const sub of subscriptions || []) {
            // Get user's timezone from workspace (default to IST)
            const userTimezone = (sub as any).workspaces?.timezone || 'Asia/Kolkata';
            const { hour: currentHour, minute: currentMinute, today } = getTimeInTimezone(now, userTimezone);

            const renewalDate = new Date(sub.renewalDate);
            renewalDate.setUTCHours(0, 0, 0, 0);

            const diffTime = renewalDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const reminderDays = sub.reminderDays || [3];
            const ownerId = (sub as any).workspaces?.ownerId;

            if (!ownerId) continue;

            // Check if this is a reminder day (including day 0 = due today)
            const isReminderDay = reminderDays.includes(diffDays) || diffDays === 0;
            if (!isReminderDay) continue;

            // Check if current hour matches notification schedule
            const notificationTime = sub.notification_time || "09:00";
            const notificationFrequency = sub.notification_frequency || "once";
            const [configuredHourStr, configuredMinuteStr] = notificationTime.split(":");
            const configuredHour = parseInt(configuredHourStr, 10);
            const configuredMinute = parseInt(configuredMinuteStr || "0", 10);

            const shouldSendNow = shouldSendNotificationNow(
                currentHour,
                currentMinute,
                configuredHour,
                configuredMinute,
                notificationFrequency
            );

            if (!shouldSendNow) {
                console.log(`Skipping ${sub.name}: Time ${currentHour}:${currentMinute} doesn't match frequency ${notificationFrequency} (configured: ${configuredHour}:${configuredMinute})`);
                continue;
            }

            console.log(`Queuing notification for ${sub.name} (${diffDays} days, freq: ${notificationFrequency})`);

            if (diffDays === 0) {
                notificationsToSend.push({
                    userId: ownerId,
                    title: `💸 ${sub.name} Payment Due Today`,
                    body: `${sub.currency} ${sub.amount} will be charged today.\nReview your subscription now.`,
                });
            } else {
                const dayText = diffDays === 1 ? "tomorrow" : `in ${diffDays} days`;
                notificationsToSend.push({
                    userId: ownerId,
                    title: `⏰ ${sub.name} renews ${dayText}`,
                    body: `${sub.currency} ${sub.amount} will be charged automatically.\nCancel or review if you're not using it.`,
                });
            }
        }

        console.log(`Sending ${notificationsToSend.length} notifications`);

        // Group by user
        const userNotifications = new Map<string, typeof notificationsToSend>();
        for (const notif of notificationsToSend) {
            const existing = userNotifications.get(notif.userId) || [];
            existing.push(notif);
            userNotifications.set(notif.userId, existing);
        }

        let successCount = 0;
        let failCount = 0;

        for (const [userId, notifications] of userNotifications) {
            const { data: tokens } = await supabase
                .from("fcm_tokens")
                .select("token")
                .eq("user_id", userId);

            if (!tokens?.length) continue;

            for (const { token } of tokens) {
                for (const notif of notifications) {
                    const success = await sendFCMv1Notification(
                        accessToken,
                        token,
                        notif.title,
                        notif.body
                    );
                    if (success) successCount++;
                    else failCount++;
                }
            }
        }

        return new Response(
            JSON.stringify({ sent: successCount, failed: failCount, utcHour: now.getUTCHours() }),
            { headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Function error:", error);
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
    }
});

// Get current time in a specific timezone
// Returns hour (0-23), minute (0-59), and today's date at midnight in that timezone
function getTimeInTimezone(utcDate: Date, timezone: string): { hour: number; minute: number; today: Date } {
    try {
        // Use Intl.DateTimeFormat to get the hour and minute in the target timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: 'numeric',
            hour12: false,
        });

        const parts = formatter.formatToParts(utcDate);
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

        // Get today's date in the target timezone
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });

        const dateParts = dateFormatter.formatToParts(utcDate);
        const year = parseInt(dateParts.find(p => p.type === 'year')?.value || '2026', 10);
        const month = parseInt(dateParts.find(p => p.type === 'month')?.value || '1', 10) - 1;
        const day = parseInt(dateParts.find(p => p.type === 'day')?.value || '1', 10);

        const today = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

        console.log(`Timezone ${timezone}: ${hour}:${minute}, today: ${today.toISOString()}`);

        return { hour, minute, today };
    } catch (error) {
        console.error(`Error parsing timezone ${timezone}, falling back to IST:`, error);
        // Fallback to IST (UTC+5:30)
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(utcDate.getTime() + istOffset);
        const today = new Date(istNow);
        today.setUTCHours(0, 0, 0, 0);
        return {
            hour: istNow.getUTCHours(),
            minute: istNow.getUTCMinutes(),
            today
        };
    }
}

// Determine if we should send a notification based on user's configured time and frequency
// Logic: Calculate if current time falls within a valid notification window
// Windows are: configured time, configured time + frequencyHours, configured time + 2*frequencyHours, etc.
// Each window is 15 minutes wide (to match cron interval)
function shouldSendNotificationNow(
    currentHour: number,
    currentMinute: number,
    configuredHour: number,
    configuredMinute: number,
    frequency: string
): boolean {
    // Only send between 7 AM and 11:55 PM
    if (currentHour < 7 || currentHour > 23) return false;

    // Convert times to minutes since midnight for easier calculation
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const configuredTimeMinutes = configuredHour * 60 + configuredMinute;

    // If current time is before configured time, don't send
    if (currentTimeMinutes < configuredTimeMinutes) return false;

    // Calculate minutes since configured time
    const minutesSinceConfigured = currentTimeMinutes - configuredTimeMinutes;

    // Get frequency interval in minutes
    let frequencyMinutes: number;
    switch (frequency) {
        case "1h":
            frequencyMinutes = 60;
            break;
        case "3h":
            frequencyMinutes = 180;
            break;
        case "5h":
            frequencyMinutes = 300;
            break;
        case "once":
        case "daily":
        default:
            frequencyMinutes = 24 * 60; // Only once per day
            break;
    }

    // Calculate which interval we're in (0 = first window, 1 = second window, etc.)
    const intervalIndex = Math.floor(minutesSinceConfigured / frequencyMinutes);

    // Calculate the start of the current interval
    const intervalStartMinutes = configuredTimeMinutes + (intervalIndex * frequencyMinutes);

    // Check if we're within the first 15 minutes of this interval
    // (this ensures we only send once per interval, on the first cron run)
    const minutesIntoInterval = currentTimeMinutes - intervalStartMinutes;

    // Only send if we're within 0-14 minutes of the interval start
    if (minutesIntoInterval >= 0 && minutesIntoInterval < 15) {
        console.log(`✓ Sending: Current ${currentHour}:${currentMinute}, Interval ${intervalIndex}, ${minutesIntoInterval} min into interval`);
        return true;
    }

    return false;
}

// Get OAuth2 access token for FCM v1 API
async function getFirebaseAccessToken(): Promise<string | null> {
    try {
        const now = Math.floor(Date.now() / 1000);
        const jwt = await createJWT({
            iss: FIREBASE_SERVICE_ACCOUNT.client_email,
            sub: FIREBASE_SERVICE_ACCOUNT.client_email,
            aud: "https://oauth2.googleapis.com/token",
            iat: now,
            exp: now + 3600,
            scope: "https://www.googleapis.com/auth/firebase.messaging",
        }, FIREBASE_SERVICE_ACCOUNT.private_key);

        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
        });

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Error getting access token:", error);
        return null;
    }
}

// Create JWT for service account auth
async function createJWT(payload: Record<string, any>, privateKey: string): Promise<string> {
    const encoder = new TextEncoder();

    const header = { alg: "RS256", typ: "JWT" };
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

    const message = `${headerB64}.${payloadB64}`;

    const pemContent = privateKey.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
    const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));

    const key = await crypto.subtle.importKey(
        "pkcs8",
        binaryKey,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(message));
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

    return `${message}.${signatureB64}`;
}

// Send notification via FCM v1 API
async function sendFCMv1Notification(
    accessToken: string,
    fcmToken: string,
    title: string,
    body: string
): Promise<boolean> {
    try {
        const projectId = FIREBASE_SERVICE_ACCOUNT.project_id;

        const response = await fetch(
            `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    message: {
                        token: fcmToken,
                        notification: { title, body },
                        android: {
                            priority: "high",
                            notification: {
                                sound: "default"
                            },
                        },
                    },
                }),
            }
        );

        const result = await response.json();
        console.log("FCM Response:", result);
        return response.ok;
    } catch (error) {
        console.error("FCM Error:", error);
        return false;
    }
}
