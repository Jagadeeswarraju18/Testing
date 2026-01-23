// Supabase Edge Function: generate-insights
// Secure backend for AI-powered subscription insights
// API key stays server-side, never exposed to client
// Deploy: supabase functions deploy generate-insights

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Verify user is authenticated
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Parse request body
        const { subscriptions, currency } = await req.json();

        if (!subscriptions || !Array.isArray(subscriptions)) {
            return new Response(JSON.stringify({ error: "Invalid request" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // If no API key configured, return rule-based insights
        if (!GEMINI_API_KEY) {
            const insights = generateRuleBasedInsights(subscriptions, currency);
            return new Response(JSON.stringify({ insights }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Call Gemini API
        const insights = await callGeminiAPI(subscriptions, currency);
        return new Response(JSON.stringify({ insights }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Function error:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

// Rule-based insights (fallback when no AI key)
function generateRuleBasedInsights(subscriptions: any[], currency: string) {
    const insights: { id: string; type: string; message: string; severity: string }[] = [];

    // Check for duplicate categories
    const categoryCount: Record<string, string[]> = {};
    subscriptions.forEach(sub => {
        const cat = sub.category || "Other";
        if (!categoryCount[cat]) categoryCount[cat] = [];
        categoryCount[cat].push(sub.name);
    });

    Object.entries(categoryCount).forEach(([category, names]) => {
        if (names.length > 1) {
            insights.push({
                id: `dup-${category}`,
                type: "rule_based",
                message: `You have ${names.length} subscriptions in "${category}": ${names.join(", ")}. Consider if you need all of them.`,
                severity: "medium",
            });
        }
    });

    // Check for expensive subscriptions
    const totalMonthly = subscriptions
        .filter(s => s.billingCycle === "monthly")
        .reduce((sum, s) => sum + (s.amount || 0), 0);

    if (totalMonthly > 100) {
        insights.push({
            id: "high-spend",
            type: "rule_based",
            message: `Your monthly subscriptions total ${currency} ${totalMonthly.toFixed(2)}. Consider switching some to annual plans for savings.`,
            severity: "high",
        });
    }

    // Check for unused subscriptions
    const now = new Date();
    subscriptions.forEach(sub => {
        if (sub.lastUsedDate) {
            const lastUsed = new Date(sub.lastUsedDate);
            const daysSinceUse = Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceUse > 30) {
                insights.push({
                    id: `unused-${sub.id}`,
                    type: "rule_based",
                    message: `You haven't used ${sub.name} in ${daysSinceUse} days. Consider canceling if not needed.`,
                    severity: "high",
                });
            }
        }
    });

    // Max 3 insights
    return insights.slice(0, 3);
}

// Call Gemini API for AI insights
async function callGeminiAPI(subscriptions: any[], currency: string) {
    const prompt = `
Analyze this list of subscriptions and provide 3 brief, actionable tips to save money.
Focus on: identifying overlapping services, suggesting annual plans, or flagging unused services.

Currency: ${currency}
Subscriptions: ${JSON.stringify(subscriptions.map(s => ({
        name: s.name,
        amount: s.amount,
        cycle: s.billingCycle,
        category: s.category,
        lastUsed: s.lastUsedDate
    })))}

Format as JSON array: [{"message": "tip", "severity": "high|medium|low"}]
    `.trim();

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" },
                }),
            }
        );

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return generateRuleBasedInsights(subscriptions, currency);
        }

        const rawInsights = JSON.parse(text);
        return rawInsights.slice(0, 3).map((insight: any, index: number) => ({
            id: `ai-${Date.now()}-${index}`,
            type: "gemini_ai",
            message: insight.message,
            severity: insight.severity,
        }));
    } catch (error) {
        console.error("Gemini API error:", error);
        return generateRuleBasedInsights(subscriptions, currency);
    }
}
