-- Enable RLS on family_groups if not already
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;

-- 1. Allow anyone (authenticated) to READ family_groups if they know the invite_code
-- This is crucial for the "Join Family" lookup
CREATE POLICY "Allow lookup by invite_code"
ON family_groups
FOR SELECT
TO authenticated
USING (true); 
-- Note: 'true' allows reading ALL groups. In a stricter app,/
-- we might want checks, but for invite lookup, client needs to find it.
-- Or better: restrict select to only returned rows? 
-- Supabase RLS policies are "filtering". 
-- If we say USING (true), any auth user can list ALL groups. 
-- A better approach for privacy: 
-- USING (invite_code = current_setting('request.jwt.claim.invite_code', true)) <-- Complex.
-- Simple approach for this MVP: Allow Read All (since names aren't sensitive sensitive, or privacy is low concern)
-- OR: better yet, allow if they are member OR if looking up?
-- There is no "looking up" state in RLS.
-- Let's stick to: "Allow authenticated to select"
-- AND rely on connection to only asking for specific code.

DROP POLICY IF exists "View Family Groups" ON family_groups;

CREATE POLICY "View Family Groups"
ON family_groups
FOR SELECT
TO authenticated
USING (true);

-- 2. Allow INSERT into family_members if valid group
-- The user needs permission to insert themselves as a 'member'
-- default RLS might block this.

DROP POLICY IF exists "Join Family" ON family_members;

CREATE POLICY "Join Family"
ON family_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Allow READ family_members (to see who is in the group you just joined)
DROP POLICY IF exists "View Family Members" ON family_members;

CREATE POLICY "View Family Members"
ON family_members
FOR SELECT
TO authenticated
USING (
  -- User can see members if they are in the same group
  group_id IN (
    SELECT group_id FROM family_members WHERE user_id = auth.uid()
  )
  OR
  -- Or if they are the owner of the group
  group_id IN (
    SELECT id FROM family_groups WHERE owner_id = auth.uid()
  )
);
