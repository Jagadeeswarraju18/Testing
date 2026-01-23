-- Add ownerName column to subscriptions table
alter table public.subscriptions 
add column if not exists "ownerName" text;
