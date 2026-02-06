-- =====================================================
-- COMPREHENSIVE RLS FIX for Family Sharing
-- Fixes: Members visibility, Shared subscriptions visibility
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Fix family_members RLS (allow seeing group members)
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "read_own_membership" ON family_members;
DROP POLICY IF EXISTS "insert_own_membership" ON family_members;
DROP POLICY IF EXISTS "delete_own_membership" ON family_members;
DROP POLICY IF EXISTS "View Family Members" ON family_members;
DROP POLICY IF EXISTS "View Family Members Fixed" ON family_members;
DROP POLICY IF EXISTS "View members of own group" ON family_members;
DROP POLICY IF EXISTS "family_members_select" ON family_members;

-- Create a security definer function to get user's group_id (bypasses RLS)
CREATE OR REPLACE FUNCTION get_my_family_group_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT group_id FROM family_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- SELECT policy: See own record + all members in same group
CREATE POLICY "family_members_read"
ON family_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR 
  group_id = get_my_family_group_id()
);

-- INSERT policy
CREATE POLICY "family_members_insert"
ON family_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- DELETE policy
CREATE POLICY "family_members_delete"
ON family_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- STEP 2: Fix shared_subscriptions RLS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Family members can view shared subs" ON shared_subscriptions;
DROP POLICY IF EXISTS "Owner can share subscriptions" ON shared_subscriptions;
DROP POLICY IF EXISTS "Owner can update shared subscriptions" ON shared_subscriptions;
DROP POLICY IF EXISTS "Owner can delete shared subscriptions" ON shared_subscriptions;

-- SELECT policy: All family members can view shared subs in their group
CREATE POLICY "shared_subs_read"
ON shared_subscriptions
FOR SELECT
TO authenticated
USING (
  group_id = get_my_family_group_id()
);

-- INSERT policy: Only owner can share
CREATE POLICY "shared_subs_insert"
ON shared_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (shared_by = auth.uid());

-- UPDATE policy: Only sharer can update
CREATE POLICY "shared_subs_update"
ON shared_subscriptions
FOR UPDATE
TO authenticated
USING (shared_by = auth.uid())
WITH CHECK (shared_by = auth.uid());

-- DELETE policy: Only sharer can delete
CREATE POLICY "shared_subs_delete"
ON shared_subscriptions
FOR DELETE
TO authenticated
USING (shared_by = auth.uid());

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('family_members', 'shared_subscriptions')
ORDER BY tablename, policyname;
