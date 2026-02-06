-- iOS Waitlist Table
-- This table stores emails of users who want to be notified when the iOS app launches

CREATE TABLE IF NOT EXISTS public.ios_waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ios_waitlist ENABLE ROW LEVEL SECURITY;

-- No read policy - users cannot see other emails
-- Only insert policy via service role (Edge Function)

-- Policy: Allow inserts only through service role (handled by Edge Function)
-- Users cannot directly insert or read from this table
CREATE POLICY "No public access" ON public.ios_waitlist
    FOR ALL
    USING (false);

-- Index for faster duplicate checks
CREATE INDEX IF NOT EXISTS idx_ios_waitlist_email ON public.ios_waitlist(email);
