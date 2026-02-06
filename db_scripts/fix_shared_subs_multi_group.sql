-- =====================================================
-- NUCLEAR FIX: Drop function with CASCADE to remove ALL dependencies
-- Then recreate everything cleanly
-- =====================================================

-- Step 1: Drop function with CASCADE (removes all dependent policies)
DROP FUNCTION IF EXISTS get_user_group_ids(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_group_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_my_family_group_id() CASCADE;

-- Step 2: Create the function fresh
CREATE FUNCTION get_user_group_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT group_id FROM family_members WHERE user_id = user_uuid;
$$;

-- Step 3: Recreate policy for shared_subscriptions
CREATE POLICY "ss_view_for_family"
ON shared_subscriptions
FOR SELECT
TO authenticated
USING (
    group_id IN (SELECT get_user_group_ids(auth.uid()))
);

-- Step 4: Ensure INSERT/UPDATE/DELETE policies exist for shared_subscriptions
DROP POLICY IF EXISTS "ss_insert" ON shared_subscriptions;
DROP POLICY IF EXISTS "ss_update" ON shared_subscriptions;
DROP POLICY IF EXISTS "ss_delete" ON shared_subscriptions;

CREATE POLICY "ss_insert"
ON shared_subscriptions FOR INSERT TO authenticated
WITH CHECK (shared_by = auth.uid());

CREATE POLICY "ss_update"
ON shared_subscriptions FOR UPDATE TO authenticated
USING (shared_by = auth.uid()) WITH CHECK (shared_by = auth.uid());

CREATE POLICY "ss_delete"
ON shared_subscriptions FOR DELETE TO authenticated
USING (shared_by = auth.uid());

-- Verify
SELECT tablename, policyname FROM pg_policies 
WHERE tablename = 'shared_subscriptions';
