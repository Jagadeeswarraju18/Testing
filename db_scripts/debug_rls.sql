-- =====================================================
-- DEBUG: Test what's happening with RLS
-- Run these ONE BY ONE and share results
-- =====================================================

-- 1. First, check current policies on family_members
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'family_members';

-- 2. Check if RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'family_members';

-- 3. Show all family_members data (as superuser, bypasses RLS)
SELECT * FROM family_members;

-- 4. Check if the user exists in family_members
-- Replace the UUID with User B's actual user_id
SELECT * FROM family_members 
WHERE user_id = 'adc6eccd-bb24-47b5-85cc-6bdc193d0a81';

-- 5. NUCLEAR OPTION: Disable RLS temporarily to test
-- ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;
-- Then re-enable after:
-- ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
