-- Create table for Premium Upgrade History
CREATE TABLE IF NOT EXISTS public.premium_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    plan_type TEXT NOT NULL, -- 'monthly', 'yearly', 'lifetime'
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,
    status TEXT DEFAULT 'active', -- 'active', 'expired'
    provider TEXT DEFAULT 'mock', -- 'mock', 'revenuecat', 'stripe'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.premium_purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own history
CREATE POLICY "Users can view own purchases" ON public.premium_purchases
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can record their own purchase (required for client-side mock upgrade)
CREATE POLICY "Users can insert own purchases" ON public.premium_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);
