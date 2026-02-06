-- Add transaction_reference column to premium_purchases table
ALTER TABLE public.premium_purchases 
ADD COLUMN IF NOT EXISTS transaction_reference TEXT;

-- Verify
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'premium_purchases' 
AND column_name = 'transaction_reference';
