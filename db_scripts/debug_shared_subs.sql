-- =====================================================
-- DEBUG: Check shared_subscriptions data
-- =====================================================

-- 1. Show all shared_subscriptions
SELECT 
    ss.id,
    ss.group_id,
    ss.subscription_id,
    ss.shared_by,
    fg.name as family_name
FROM shared_subscriptions ss
LEFT JOIN family_groups fg ON ss.group_id = fg.id;

-- 2. Show user's memberships (which groups they're in)
SELECT 
    fm.user_id,
    fm.group_id,
    fm.role,
    fg.name as family_name
FROM family_members fm
LEFT JOIN family_groups fg ON fm.group_id = fg.id
WHERE fm.user_id = 'adc6eccd-bb24-47b5-85cc-6bdc193d0a81'; -- Replace with actual user ID

-- 3. Check the function result
SELECT get_user_group_id('adc6eccd-bb24-47b5-85cc-6bdc193d0a81'); -- Replace with actual user ID
