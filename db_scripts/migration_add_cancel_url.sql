-- Add 'cancelUrl' column customization
alter table public.subscriptions 
add column if not exists "cancelUrl" text;
