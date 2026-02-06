-- =====================================================
-- DEBUG: Check why User B can't join the family
-- Run these queries in Supabase SQL Editor
-- =====================================================

-- 1. Find the family group by invite code
SELECT * FROM family_groups WHERE invite_code = 'FAM-66AX1A';

-- 2. See ALL members of that family (bypass RLS with service role)
SELECT 
    fm.id,
    fm.group_id,
    fm.user_id,
    fm.role,
    u.email,
    u.name
FROM family_members fm
LEFT JOIN auth.users au ON fm.user_id = au.id
LEFT JOIN public.users u ON fm.user_id = u.id
WHERE fm.group_id = (
    SELECT id FROM family_groups WHERE invite_code = 'FAM-66AX1A'
);

-- 3. If User B is ALREADY in members but shouldn't be, delete them:
-- (Replace 'USER_B_ID' with the actual user ID from step 2)
-- DELETE FROM family_members WHERE user_id = 'USER_B_ID';

-- 4. Check RLS policies currently active on family_members
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'family_members';
