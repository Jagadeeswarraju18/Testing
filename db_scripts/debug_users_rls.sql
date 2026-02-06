-- =====================================================
-- DEBUG: Check current policies on users table
-- =====================================================

-- 1. Show current policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- 2. Check if the family_member can see the owner
-- Member user_id (from earlier): adc6eccd-bb24-47b5-85cc-6bdc193d0a81
-- Owner user_id (from earlier): 27576e2-bf61-4d2a-b772-2c84493bb386

-- Check if owner is in any of member's groups
SELECT 
    'Owner in member groups?' as check_type,
    EXISTS (
        SELECT 1 FROM family_members fm
        WHERE fm.user_id = '27576e2-bf61-4d2a-b772-2c84493bb386'
        AND fm.group_id IN (
            SELECT group_id FROM family_members 
            WHERE user_id = 'adc6eccd-bb24-47b5-85cc-6bdc193d0a81'
        )
    ) as result;
