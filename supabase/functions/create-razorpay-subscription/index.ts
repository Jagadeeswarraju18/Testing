import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // 1. Get User
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            throw new Error('Unauthorized');
        }

        // 2. Parse Body
        const { planType } = await req.json();

        // Production Plan IDs
        const PLANS = {
            monthly: 'plan_S6Qj7PYygTN31p',
            yearly: 'plan_S6RDBurzZ8pgvV'
        };

        const targetPlanId = PLANS[planType as keyof typeof PLANS];

        if (!targetPlanId) {
            throw new Error(`Invalid plan type: ${planType}`);
        }

        const KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
        const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');

        if (!KEY_ID || !KEY_SECRET) {
            console.error("Missing Razorpay Env Vars");
            throw new Error('Server configuration error: Missing Keys');
        }

        // 3. Create Subscription on Razorpay
        // Basic Auth with KeyID:KeySecret
        const auth = btoa(`${KEY_ID}:${KEY_SECRET}`);

        // Create a subscription
        // We start immediately.
        const response = await fetch('https://api.razorpay.com/v1/subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                plan_id: targetPlanId,
                total_count: planType === 'yearly' ? 10 : 120, // 10 Years duration for both
                quantity: 1,
                customer_notify: 1,
                notes: {
                    user_id: user.id,
                    source: 'pwa_web'
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Razorpay Error:", data);
            throw new Error(data.error?.description || 'Failed to create subscription order');
        }

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
