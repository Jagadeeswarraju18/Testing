// Supabase Edge Function: check-price-alerts
// Runs weekly to find verified price changes and notify affected users
// Deploy: supabase functions deploy check-price-alerts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_SERVICE_ACCOUNT = JSON.parse(
    Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}"
);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Minimum verifications required before alerting other users
const MIN_VERIFICATION_COUNT = 3;
// Price variance threshold for matching (5%)
const PRICE_VARIANCE = 0.05;
// Only consider reports from last 30 days
const DAYS_WINDOW = 30;

serve(async (req) => {
    try {
        const url = new URL(req.url);
        const secret = url.searchParams.get("secret");

        // Auth check
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

        console.log("Starting price alert check...");

        // Get verified price changes (3+ users reported within 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DAYS_WINDOW);

        const { data: verifiedChanges, error: changesError } = await supabase
            .from("price_changes")
            .select("*")
            .gte("verification_count", MIN_VERIFICATION_COUNT)
            .gte("last_verified_at", thirtyDaysAgo.toISOString());

        if (changesError) {
            console.error("Error fetching price changes:", changesError);
            return new Response(JSON.stringify({ error: changesError.message }), { status: 500 });
        }

        console.log(`Found ${verifiedChanges?.length || 0} verified price changes`);

        if (!verifiedChanges?.length) {
            return new Response(JSON.stringify({
                message: "No verified price changes to alert",
                checked: 0
            }), { headers: { "Content-Type": "application/json" } });
        }

        // Get Firebase access token for notifications
        const accessToken = await getFirebaseAccessToken();
        if (!accessToken) {
            return new Response(JSON.stringify({ error: "Failed to get Firebase token" }), { status: 500 });
        }

        let alertsSent = 0;
        let usersNotified = 0;

        // For each verified price change, find users with matching subscriptions
        for (const change of verifiedChanges) {
            // Find subscriptions that match this provider but have OLD price
            // Use fuzzy matching: provider_id contains or name matches
            const { data: affectedSubs, error: subError } = await supabase
                .from("subscriptions")
                .select(`
                    id, name, amount, currency, "workspaceId",
                    workspaces!inner("ownerId")
                `)
                .eq("status", "active")
                .eq("currency", change.currency)
                .ilike("name", `%${change.provider_name}%`);

            if (subError) {
                console.error(`Error finding affected subs for ${change.provider_name}:`, subError);
                continue;
            }

            // Filter to those still on old price (within 5% variance)
            const usersToAlert = affectedSubs?.filter(sub => {
                const priceDiff = Math.abs(sub.amount - change.old_amount) / change.old_amount;
                return priceDiff <= PRICE_VARIANCE && sub.amount < change.new_amount;
            }) || [];

            if (usersToAlert.length === 0) continue;

            console.log(`${change.provider_name}: Found ${usersToAlert.length} users on old price`);

            // Get unique user IDs
            const userIds = [...new Set(usersToAlert.map(s => (s as any).workspaces?.ownerId).filter(Boolean))];

            for (const userId of userIds) {
                // Get FCM tokens for this user
                const { data: tokens } = await supabase
                    .from("fcm_tokens")
                    .select("token")
                    .eq("user_id", userId);

                if (!tokens?.length) continue;

                const percentIncrease = Math.round(((change.new_amount - change.old_amount) / change.old_amount) * 100);

                for (const { token } of tokens) {
                    const success = await sendFCMv1Notification(
                        accessToken,
                        token,
                        `💰 ${change.provider_name} price update`,
                        `${change.provider_name} may have increased to ${change.currency} ${change.new_amount} (+${percentIncrease}%). Check your subscription.`
                    );
                    if (success) alertsSent++;
                }
                usersNotified++;
            }
        }

        return new Response(
            JSON.stringify({
                verified_changes: verifiedChanges.length,
                users_notified: usersNotified,
                alerts_sent: alertsSent
            }),
            { headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Function error:", error);
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
    }
});

// Get OAuth2 access token for FCM v1 API (same as send-reminders)
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
                                sound: "default",
                                icon: "ic_notification"
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
