-- Add missing columns for Custom Billing Cycles
alter table public.subscriptions 
add column if not exists "customBillingPeriod" integer default 1,
add column if not exists "customBillingUnit" text default 'month';
