-- =====================================================
-- FIX: Allow family members to view each other's user info
-- =====================================================

-- Add a SELECT policy to users table
-- Allow reading if the user is in the same family group
CREATE POLICY "view_family_member_info"
ON users
FOR SELECT
TO authenticated
USING (
    -- Always can read own profile
    id = auth.uid()
    OR
    -- Can read other users who are in the same family group as you
    id IN (
        SELECT fm.user_id 
        FROM family_members fm
        WHERE fm.group_id IN (SELECT get_user_group_ids(auth.uid()))
    )
);

-- Verify
SELECT policyname FROM pg_policies WHERE tablename = 'users';
