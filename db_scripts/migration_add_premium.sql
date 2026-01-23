-- Add Premium columns to users table
ALTER TABLE public.users 
ADD COLUMN "isPremium" boolean DEFAULT false;

ALTER TABLE public.users 
ADD COLUMN "premiumExpiryDate" timestamptz;

-- Add index for faster analytics queries
CREATE INDEX idx_users_is_premium ON public.users("isPremium");
