-- Add 'sharedWith' column for Split the Bill feature
alter table public.subscriptions 
add column if not exists "sharedWith" integer default 0;
