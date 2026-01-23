-- Add missing DELETE policy for workspaces
-- This was missing from the original schema, causing workspace deletion to silently fail

-- Add delete policy for workspaces
CREATE POLICY "Users can delete own workspaces" 
ON public.workspaces 
FOR DELETE 
USING (auth.uid() = "ownerId");
