-- FCM Token Storage for Push Notifications
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    token text not null unique,
    device_info text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own tokens
CREATE POLICY "Users can insert own tokens" ON public.fcm_tokens
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tokens" ON public.fcm_tokens
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON public.fcm_tokens
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON public.fcm_tokens
FOR DELETE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.fcm_tokens(user_id);
