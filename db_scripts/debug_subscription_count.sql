-- QUERY TO DEBUG SUBSCRIPTION COUNT
-- Replace 'YOUR_USER_ID' with the user's actual UUID if running manually, 
-- or use the dynamic query below in the Supabase Dashboard.

select 
  s.id, 
  s.name, 
  s.status, 
  w.name as workspace_name 
from subscriptions s
join workspaces w on s."workspaceId" = w.id
where 
  w."ownerId" = auth.uid() 
  and s.status = 'active';

-- This will show EXACTLY what the app is counting. 
-- If there are more than 4 rows, those are the "phantom" subscriptions.
