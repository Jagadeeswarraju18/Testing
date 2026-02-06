-- =====================================================
-- SIMPLEST RLS FIX - Drop dependencies first
-- =====================================================

-- Step 1: Drop policies that use the function FIRST
DROP POLICY IF EXISTS "family_members_read" ON family_members;
DROP POLICY IF EXISTS "shared_subs_read" ON shared_subscriptions;

-- Step 2: Now drop the function (should work now)
DROP FUNCTION IF EXISTS get_my_family_group_id();

-- Step 3: Drop all other family_members policies
DROP POLICY IF EXISTS "family_members_insert" ON family_members;
DROP POLICY IF EXISTS "family_members_delete" ON family_members;
DROP POLICY IF EXISTS "read_own_membership" ON family_members;
DROP POLICY IF EXISTS "insert_own_membership" ON family_members;
DROP POLICY IF EXISTS "delete_own_membership" ON family_members;
DROP POLICY IF EXISTS "members_select" ON family_members;
DROP POLICY IF EXISTS "members_insert" ON family_members;
DROP POLICY IF EXISTS "members_delete" ON family_members;

-- Step 4: Drop shared_subscriptions policies
DROP POLICY IF EXISTS "shared_subs_insert" ON shared_subscriptions;
DROP POLICY IF EXISTS "shared_subs_update" ON shared_subscriptions;
DROP POLICY IF EXISTS "shared_subs_delete" ON shared_subscriptions;

-- Step 5: Create SIMPLE family_members policies
CREATE POLICY "fm_select"
ON family_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "fm_insert"
ON family_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "fm_delete"
ON family_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Step 6: Create SIMPLE shared_subscriptions policies
CREATE POLICY "ss_select"
ON shared_subscriptions
FOR SELECT
TO authenticated
USING (shared_by = auth.uid());

CREATE POLICY "ss_insert"
ON shared_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (shared_by = auth.uid());

CREATE POLICY "ss_update"
ON shared_subscriptions
FOR UPDATE
TO authenticated
USING (shared_by = auth.uid());

CREATE POLICY "ss_delete"
ON shared_subscriptions
FOR DELETE
TO authenticated
USING (shared_by = auth.uid());

-- Verify
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('family_members', 'shared_subscriptions')
ORDER BY tablename, policyname;
