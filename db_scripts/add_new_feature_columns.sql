-- Add new columns for Price Increase Alerts and Family Sharing features
-- Run this in your Supabase SQL Editor

-- 1. Add previousAmount column for price change tracking
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS "previousAmount" DECIMAL(10, 2) DEFAULT NULL;

-- 2. Add sharedMembers column for family/group sharing (array of names)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS "sharedMembers" TEXT[] DEFAULT '{}';

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND column_name IN ('previousAmount', 'sharedMembers');
