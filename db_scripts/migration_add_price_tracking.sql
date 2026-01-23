-- Migration: Add previous_amount for price change tracking
-- Run this in Supabase SQL Editor

-- Phase 1: Add previous_amount to subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS "previous_amount" numeric;

COMMENT ON COLUMN public.subscriptions.previous_amount IS 'Stores the previous price when user updates amount, for price change detection';

-- Phase 2: Create price_changes table for crowdsourced alerts
CREATE TABLE IF NOT EXISTS public.price_changes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_id text NOT NULL,              -- Normalized provider name (lowercase, no-spaces)
    provider_name text NOT NULL,            -- Display name e.g. "Netflix"
    region text DEFAULT 'GLOBAL',           -- Currency code as region indicator
    old_amount numeric NOT NULL,
    new_amount numeric NOT NULL,
    currency text NOT NULL,
    reported_by uuid REFERENCES auth.users(id),
    reported_at timestamptz DEFAULT now(),
    verification_count integer DEFAULT 1,   -- How many users reported this
    last_verified_at timestamptz DEFAULT now(),
    notified_at timestamptz                 -- When alerts were sent (NULL = not yet notified)
);

-- Create unique index for smart merging (same provider + currency + similar amount range)
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_changes_provider_currency 
ON public.price_changes (provider_id, currency, new_amount);

-- RLS policies for price_changes
ALTER TABLE public.price_changes ENABLE ROW LEVEL SECURITY;

-- Anyone can view price changes (public data)
CREATE POLICY "Anyone can view price changes" 
ON public.price_changes FOR SELECT USING (true);

-- Authenticated users can insert new reports
CREATE POLICY "Authenticated users can insert" 
ON public.price_changes FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Only allow updates to verification_count (for merging)
CREATE POLICY "Allow verification count updates" 
ON public.price_changes FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Add comment for documentation
COMMENT ON TABLE public.price_changes IS 'Crowdsourced price change reports for alerting users when services increase prices';

-- RPC function to increment verification count (for when multiple users report same change)
CREATE OR REPLACE FUNCTION increment_price_verification(
    p_provider_id text,
    p_currency text,
    p_new_amount numeric
)
RETURNS void AS $$
BEGIN
    UPDATE public.price_changes
    SET 
        verification_count = verification_count + 1,
        last_verified_at = now()
    WHERE 
        provider_id = p_provider_id 
        AND currency = p_currency 
        AND new_amount >= p_new_amount * 0.95  -- Within 5% variance
        AND new_amount <= p_new_amount * 1.05;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
