// Supabase Edge Function: price-alerts
// Sends push notifications to users when crowdsourced price increases are verified
// Run this daily via cron-job.org

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_SERVICE_ACCOUNT = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}");

// Minimum number of users who must confirm a price change before alerting
// Minimum number of users who must confirm a price change before alerting
const MIN_VERIFICATION_COUNT = 5;

serve(async (req: Request) => {
    // Allow GET requests with secret for cron job
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    if (req.method === "GET" && secret !== "spendyx_secure_cron_2026") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Fetch Exchange Rates once
        let rates: Record<string, number> | null = null;
        try {
             // Using open exchangerate URL or similar
             const ratesRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
             if (ratesRes.ok) {
                const data = await ratesRes.json();
                rates = data.rates;
             }
        } catch (e) {
            console.error("Failed to fetch rates:", e);
        }

        // Get Firebase access token
        const accessToken = await getFirebaseAccessToken();
        if (!accessToken) {
            return new Response(JSON.stringify({ error: "Failed to get Firebase token" }), { status: 500 });
        }

        // Get verified price changes that haven't been notified yet
        const { data: priceChanges, error: pcError } = await supabase
            .from("price_changes")
            .select("*")
            .gte("verification_count", MIN_VERIFICATION_COUNT)
            .is("notified_at", null)
            .order("verification_count", { ascending: false });

        if (pcError) {
            console.error("Error fetching price changes:", pcError);
            return new Response(JSON.stringify({ error: pcError.message }), { status: 500 });
        }

        console.log(`Found ${priceChanges?.length || 0} verified price changes to notify`);

        let successCount = 0;
        let failCount = 0;
        const notifiedChangeIds: string[] = [];

        for (const change of priceChanges || []) {
            // Find all users who have subscriptions matching this provider
            const { data: subscriptions, error: subError } = await supabase
                .from("subscriptions")
                .select(`
                    id, name, amount, currency,
                    "workspaceId",
                    workspaces!inner("ownerId", currency, timezone)
                `)
                .eq("status", "active")
                .ilike("name", `%${change.provider_name}%`);

            if (subError || !subscriptions) {
                console.error(`Error finding subscriptions for ${change.provider_name}:`, subError);
                continue;
            }

            console.log(`Found ${subscriptions.length} subscriptions matching ${change.provider_name}`);

            // Get unique user IDs and their currencies/timezones
            const userInfoMap = new Map<string, { currency: string; timezone: string }>();
            for (const sub of subscriptions) {
                const ownerId = (sub as any).workspaces?.ownerId;
                const userCurrency = (sub as any).workspaces?.currency || sub.currency;
                const timezone = (sub as any).workspaces?.timezone || "Asia/Kolkata";

                if (ownerId && !userInfoMap.has(ownerId)) {
                    userInfoMap.set(ownerId, { currency: userCurrency, timezone });
                }
            }

            // Send notifications to each affected user
            for (const [userId, userInfo] of userInfoMap) {
                // Check if it's an appropriate time in user's timezone (7 AM - 10 PM)
                const { hour } = getTimeInTimezone(new Date(), userInfo.timezone);
                if (hour < 7 || hour > 22) {
                    console.log(`Skipping user ${userId}: Outside notification hours (${hour}:00 in ${userInfo.timezone})`);
                    continue;
                }

                // Get user's FCM tokens
                const { data: tokens } = await supabase
                    .from("fcm_tokens")
                    .select("token")
                    .eq("user_id", userId);

                if (!tokens || tokens.length === 0) continue;

                // Format amounts with user's currency
                let finalOldAmount = change.old_amount;
                let finalNewAmount = change.new_amount;
                let finalCurrency = change.currency;

                // Convert if rates available AND currencies differ
                if (rates && userInfo.currency && userInfo.currency !== change.currency) {
                     const fromRate = rates[change.currency];
                     const toRate = rates[userInfo.currency];
                     if (fromRate && toRate) {
                         // Convert
                         finalOldAmount = (change.old_amount / fromRate) * toRate;
                         finalNewAmount = (change.new_amount / fromRate) * toRate;
                         finalCurrency = userInfo.currency;
                     }
                }

                const currencySymbol = getCurrencySymbol(finalCurrency);
                const oldAmountStr = formatAmount(finalOldAmount, finalCurrency);
                const newAmountStr = formatAmount(finalNewAmount, finalCurrency);

                const title = `ℹ️ Subscription price update`;
                const body = `${change.provider_name} may have updated its price from ${currencySymbol}${oldAmountStr} to ${currencySymbol}${newAmountStr}. Confirmed by ${change.verification_count} users.`;

                // Send to all user's devices
                for (const { token } of tokens) {
                    const success = await sendFCMv1Notification(accessToken, token, title, body);
                    if (success) successCount++;
                    else failCount++;
                }
            }

            // Mark this price change as notified
            notifiedChangeIds.push(change.id);
        }

        // Update notified_at for all processed price changes
        if (notifiedChangeIds.length > 0) {
            await supabase
                .from("price_changes")
                .update({ notified_at: new Date().toISOString() })
                .in("id", notifiedChangeIds);
        }

        return new Response(
            JSON.stringify({
                sent: successCount,
                failed: failCount,
                priceChangesProcessed: notifiedChangeIds.length
            }),
            { headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Function error:", error);
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
    }
});

// Get current time in a specific timezone
function getTimeInTimezone(utcDate: Date, timezone: string): { hour: number; minute: number } {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: 'numeric',
            hour12: false,
        });

        const parts = formatter.formatToParts(utcDate);
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

        return { hour, minute };
    } catch {
        // Fallback to IST
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(utcDate.getTime() + istOffset);
        return {
            hour: istNow.getUTCHours(),
            minute: istNow.getUTCMinutes()
        };
    }
}

// Get currency symbol
function getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
        'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
        'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'CNY': '¥', 'HKD': 'HK$',
        'SGD': 'S$', 'KRW': '₩', 'MXN': 'MX$', 'BRL': 'R$', 'RUB': '₽',
        'ZAR': 'R', 'AED': 'د.إ', 'SAR': '﷼', 'NZD': 'NZ$', 'THB': '฿'
    };
    return symbols[currency] || currency;
}

// Format amount (no decimals for INR, JPY, KRW)
function formatAmount(amount: number, currency: string): string {
    const noDecimalCurrencies = ['INR', 'JPY', 'KRW', 'IDR', 'VND'];
    if (noDecimalCurrencies.includes(currency)) {
        return Math.round(amount).toString();
    }
    return amount.toFixed(2);
}

// Get OAuth2 access token for FCM v1 API
async function getFirebaseAccessToken(): Promise<string | null> {
    try {
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: FIREBASE_SERVICE_ACCOUNT.client_email,
            sub: FIREBASE_SERVICE_ACCOUNT.client_email,
            aud: "https://oauth2.googleapis.com/token",
            iat: now,
            exp: now + 3600,
            scope: "https://www.googleapis.com/auth/firebase.messaging",
        };

        const jwt = await createJWT(payload, FIREBASE_SERVICE_ACCOUNT.private_key);

        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
        });

        const data = await response.json();
        return data.access_token || null;
    } catch (error) {
        console.error("Firebase auth error:", error);
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
