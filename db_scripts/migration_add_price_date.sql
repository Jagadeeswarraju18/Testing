-- Add previous_amount_date to track when price changed
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS previous_amount_date timestamptz DEFAULT now();

-- Backfill existing price changes to have "now" as date so they start their 30-day count from deployment
UPDATE public.subscriptions 
SET previous_amount_date = now() 
WHERE previous_amount IS NOT NULL AND previous_amount_date IS NULL;
