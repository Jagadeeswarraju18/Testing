-- Create Family Groups Table
CREATE TABLE IF NOT EXISTS public.family_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT DEFAULT 'My Family',
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Family Members Table
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member', -- 'owner', 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- RLS Policies for Family Groups
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their group" ON public.family_groups
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Members can view their group" ON public.family_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE group_id = public.family_groups.id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can create group" ON public.family_groups
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update group" ON public.family_groups
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete group" ON public.family_groups
    FOR DELETE USING (auth.uid() = owner_id);


-- RLS Policies for Family Members
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View members of own group" ON public.family_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members as members
            WHERE members.group_id = public.family_members.group_id
            AND members.user_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.family_groups
            WHERE id = public.family_members.group_id
            AND owner_id = auth.uid()
        )
    );

-- Allow anyone to join if they have the code (logic handled in App, insertion requires permission)
-- We'll allow authenticated users to insert themselves
CREATE POLICY "Users can join a family" ON public.family_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only owners can remove members (except themselves leaving)
CREATE POLICY "Owners can remove members" ON public.family_members
    FOR DELETE USING (
        auth.uid() = user_id -- Leaving
        OR 
        EXISTS (
            SELECT 1 FROM public.family_groups
            WHERE id = public.family_members.group_id
            AND owner_id = auth.uid()
        )
    );
