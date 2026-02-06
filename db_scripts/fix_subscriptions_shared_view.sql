-- =====================================================
-- FIX: Allow family members to view subscription details
-- for subscriptions that have been shared with them
-- =====================================================

-- Add a SELECT policy to subscriptions table
-- Allow reading if the subscription is shared with the user's family group
CREATE POLICY "view_shared_subscriptions"
ON subscriptions
FOR SELECT
TO authenticated
USING (
    -- User can always read their own subscriptions
    "userId" = auth.uid()
    OR
    -- User can read subscriptions that are shared with their family
    id IN (
        SELECT subscription_id 
        FROM shared_subscriptions 
        WHERE group_id IN (SELECT get_user_group_ids(auth.uid()))
    )
);

-- Verify
SELECT policyname FROM pg_policies WHERE tablename = 'subscriptions';
