-- =====================================================
-- SIMPLER FIX: Add sharer_name column to shared_subscriptions
-- This avoids needing to lookup users table at all
-- =====================================================

-- Add column if not exists
ALTER TABLE shared_subscriptions 
ADD COLUMN IF NOT EXISTS sharer_name TEXT;

-- Update existing records with the sharer's name
UPDATE shared_subscriptions ss
SET sharer_name = u.name
FROM users u
WHERE ss.shared_by = u.id
AND ss.sharer_name IS NULL;

-- Verify
SELECT id, sharer_name FROM shared_subscriptions LIMIT 5;
