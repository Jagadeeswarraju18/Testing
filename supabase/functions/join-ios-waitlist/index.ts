import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { email } = await req.json();

        // Server-side email validation
        if (!email || typeof email !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Email is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const trimmedEmail = email.trim().toLowerCase();

        if (!emailRegex.test(trimmedEmail)) {
            return new Response(
                JSON.stringify({ error: 'Invalid email format' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Use service role key to bypass RLS
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Check if email already exists
        const { data: existing } = await supabaseClient
            .from('ios_waitlist')
            .select('id')
            .eq('email', trimmedEmail)
            .single();

        if (existing) {
            return new Response(
                JSON.stringify({ success: true, message: 'You\'re already on the waitlist!' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Insert new email
        const { error: insertError } = await supabaseClient
            .from('ios_waitlist')
            .insert({ email: trimmedEmail });

        if (insertError) {
            // Handle unique constraint violation gracefully
            if (insertError.code === '23505') {
                return new Response(
                    JSON.stringify({ success: true, message: 'You\'re already on the waitlist!' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            throw insertError;
        }

        return new Response(
            JSON.stringify({ success: true, message: 'You\'re on the list! We\'ll notify you when iOS app launches.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        // Don't log email in error messages for security
        console.error('Waitlist Error:', err.message);
        return new Response(
            JSON.stringify({ error: 'Something went wrong. Please try again.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
