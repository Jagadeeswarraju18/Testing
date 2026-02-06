-- =====================================================
-- FIX: Shared Subscriptions Visibility
-- Allow ALL family members to view shared subscriptions
-- =====================================================

-- Step 1: Drop current restrictive policy
DROP POLICY IF EXISTS "ss_select" ON shared_subscriptions;
DROP POLICY IF EXISTS "shared_subs_read" ON shared_subscriptions;
DROP POLICY IF EXISTS "Family members can view shared subs" ON shared_subscriptions;

-- Step 2: Create a function to get user's group_id (for shared_subscriptions)
CREATE OR REPLACE FUNCTION get_user_group_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT group_id FROM family_members WHERE user_id = p_user_id LIMIT 1;
$$;

-- Step 3: Create new SELECT policy that allows ALL family members to view
-- Owner can view (they shared it)
-- Members can view (they're in the same group)
CREATE POLICY "ss_view_for_family"
ON shared_subscriptions
FOR SELECT
TO authenticated
USING (
    group_id = get_user_group_id(auth.uid())
);

-- Keep the other policies as-is (INSERT, UPDATE, DELETE for owner only)
-- If they don't exist, create them
DROP POLICY IF EXISTS "ss_insert" ON shared_subscriptions;
DROP POLICY IF EXISTS "ss_update" ON shared_subscriptions;
DROP POLICY IF EXISTS "ss_delete" ON shared_subscriptions;

CREATE POLICY "ss_insert"
ON shared_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (shared_by = auth.uid());

CREATE POLICY "ss_update"
ON shared_subscriptions
FOR UPDATE
TO authenticated
USING (shared_by = auth.uid())
WITH CHECK (shared_by = auth.uid());

CREATE POLICY "ss_delete"
ON shared_subscriptions
FOR DELETE
TO authenticated
USING (shared_by = auth.uid());

-- Verify
SELECT policyname FROM pg_policies WHERE tablename = 'shared_subscriptions';
