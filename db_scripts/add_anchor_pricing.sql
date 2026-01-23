-- Add Anchor Pricing columns to prevent currency drift
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS original_amount numeric,
ADD COLUMN IF NOT EXISTS original_currency text;

-- Backfill existing data
-- Set anchor to current values for all existing subscriptions
UPDATE subscriptions 
SET 
  original_amount = amount,
  original_currency = currency
WHERE original_amount IS NULL;

-- Comment
COMMENT ON COLUMN subscriptions.original_amount IS 'The amount entered by the user in the original currency.';
COMMENT ON COLUMN subscriptions.original_currency IS 'The currency in which the user originally entered the amount.';
