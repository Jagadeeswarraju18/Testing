-- =====================================================
-- Payment Mode System Migration
-- Adds auto-renew vs manual-pay support
-- =====================================================

-- Step 1: Add new columns
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS "paymentMode" TEXT DEFAULT 'auto_renew' CHECK ("paymentMode" IN ('auto_renew', 'manual_pay'));

-- Track when we last auto-advanced (prevents multiple jumps)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS "lastAutoRenewed" TIMESTAMPTZ;

-- Track manual payment confirmations
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS "lastPaidDate" TIMESTAMPTZ;

-- Step 2: Smart Migration - Default everything to auto_renew
UPDATE subscriptions 
SET "paymentMode" = 'auto_renew' 
WHERE "paymentMode" IS NULL;

-- Step 3: Verify (just show basic columns)
SELECT id, name, "paymentMode", "lastAutoRenewed"
FROM subscriptions 
LIMIT 5;
