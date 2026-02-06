-- =====================================================
-- SIMPLEST POSSIBLE FIX
-- Just allow users to see their OWN record, nothing else
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- =====================================================

-- 1. Drop ALL existing policies
DROP POLICY IF EXISTS "View Family Members" ON family_members;
DROP POLICY IF EXISTS "View Family Members Fixed" ON family_members;
DROP POLICY IF EXISTS "View members of own group" ON family_members;
DROP POLICY IF EXISTS "Join Family" ON family_members;
DROP POLICY IF EXISTS "Users can join a family" ON family_members;
DROP POLICY IF EXISTS "Owners can remove members" ON family_members;
DROP POLICY IF EXISTS "family_members_select_policy" ON family_members;
DROP POLICY IF EXISTS "family_members_insert_policy" ON family_members;
DROP POLICY IF EXISTS "family_members_delete_policy" ON family_members;
DROP POLICY IF EXISTS "family_members_select" ON family_members;
DROP POLICY IF EXISTS "family_members_insert" ON family_members;
DROP POLICY IF EXISTS "family_members_delete" ON family_members;

-- 2. SIMPLEST SELECT POLICY - just check user_id directly, no subqueries
CREATE POLICY "read_own_membership"
ON family_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. INSERT POLICY
CREATE POLICY "insert_own_membership"
ON family_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. DELETE POLICY  
CREATE POLICY "delete_own_membership"
ON family_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 5. Verify - should show 3 policies
SELECT policyname FROM pg_policies WHERE tablename = 'family_members';
