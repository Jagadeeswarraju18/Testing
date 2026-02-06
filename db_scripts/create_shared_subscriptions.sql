-- =====================================================
-- Family Sharing V2: Shared Subscriptions Table
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create the shared_subscriptions table
CREATE TABLE IF NOT EXISTS shared_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    used_by TEXT[] DEFAULT '{}', -- Array of user_ids who use this subscription
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate sharing of same subscription to same group
    UNIQUE(group_id, subscription_id)
);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shared_subscriptions_group_id ON shared_subscriptions(group_id);
CREATE INDEX IF NOT EXISTS idx_shared_subscriptions_subscription_id ON shared_subscriptions(subscription_id);

-- 3. Enable Row Level Security
ALTER TABLE shared_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Policy: Members of a family can VIEW shared subscriptions
DROP POLICY IF EXISTS "Family members can view shared subs" ON shared_subscriptions;
CREATE POLICY "Family members can view shared subs"
ON shared_subscriptions
FOR SELECT
TO authenticated
USING (
    group_id IN (
        SELECT group_id FROM family_members WHERE user_id = auth.uid()
    )
);

-- Policy: Only the sharer (owner) can INSERT
DROP POLICY IF EXISTS "Owner can share subscriptions" ON shared_subscriptions;
CREATE POLICY "Owner can share subscriptions"
ON shared_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
    shared_by = auth.uid()
);

-- Policy: Only the sharer (owner) can UPDATE (e.g., change used_by)
DROP POLICY IF EXISTS "Owner can update shared subscriptions" ON shared_subscriptions;
CREATE POLICY "Owner can update shared subscriptions"
ON shared_subscriptions
FOR UPDATE
TO authenticated
USING (shared_by = auth.uid())
WITH CHECK (shared_by = auth.uid());

-- Policy: Only the sharer (owner) can DELETE
DROP POLICY IF EXISTS "Owner can delete shared subscriptions" ON shared_subscriptions;
CREATE POLICY "Owner can delete shared subscriptions"
ON shared_subscriptions
FOR DELETE
TO authenticated
USING (shared_by = auth.uid());

-- =====================================================
-- VERIFICATION: Run these queries after migration
-- =====================================================
-- SELECT * FROM shared_subscriptions LIMIT 5;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'shared_subscriptions';
