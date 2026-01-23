-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Tables
-- Note: We use quoted identifiers (e.g. "camelCase") to match your TypeScript interfaces exactly.
-- This prevents the need for massive frontend refactoring.

-- Workspaces Table
create table public.workspaces (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text check (type in ('personal', 'business')) not null default 'personal',
  "ownerId" uuid references auth.users(id) not null,
  currency text default 'USD',
  "monthlyBudget" numeric default 0,
  "isDefault" boolean default false,
  "createdAt" timestamptz default now()
);

-- Users/Profiles Table (Public profile info)
create table public.users (
  id uuid references auth.users(id) primary key,
  name text,
  email text,
  avatar text,
  "defaultCurrency" text
);

-- Subscriptions Table
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  "workspaceId" uuid references public.workspaces(id), -- Nullable initially if migration is partial, but ideally required
  name text not null,
  category text,
  amount numeric not null,
  currency text,
  "billingCycle" text,
  status text,
  "createdAt" timestamptz default now(),
  "startDate" date,
  "renewalDate" date not null,
  "lastUsedDate" date,
  "cancelUrl" text,
  "contractEndDate" date,
  department text,
  "ownerUserId" uuid references auth.users(id),
  "seatsTotal" integer,
  "seatsAssigned" integer,
  "providerId" text,
  "logoUrl" text,
  "autoRenew" boolean default true,
  tags text[],
  "paymentMethod" text,
  "reminderDays" integer[],
  notes text,
  "userId" uuid references auth.users(id) -- Legacy/Direct ownership fallback
);

-- 2. Enable Row Level Security (RLS)
alter table public.workspaces enable row level security;
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;

-- 3. Create Basic Policies
-- These policies assume a simple "User owns their data" model.

-- Users policies
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Workspaces policies
create policy "Users can view own workspaces" on public.workspaces for select using (auth.uid() = "ownerId");
create policy "Users can insert own workspaces" on public.workspaces for insert with check (auth.uid() = "ownerId");
create policy "Users can update own workspaces" on public.workspaces for update using (auth.uid() = "ownerId");

-- Subscriptions policies
-- Allow access if the user owns the workspace OR is the direct owner (schema flexibility)
create policy "Users can view own subscriptions" on public.subscriptions for select using (
  auth.uid() = "userId" OR
  exists (select 1 from public.workspaces where id = subscriptions."workspaceId" and "ownerId" = auth.uid())
);

create policy "Users can insert own subscriptions" on public.subscriptions for insert with check (
  auth.uid() = "userId" OR
  exists (select 1 from public.workspaces where id = subscriptions."workspaceId" and "ownerId" = auth.uid())
);

create policy "Users can update own subscriptions" on public.subscriptions for update using (
  auth.uid() = "userId" OR
  exists (select 1 from public.workspaces where id = subscriptions."workspaceId" and "ownerId" = auth.uid())
);

create policy "Users can delete own subscriptions" on public.subscriptions for delete using (
  auth.uid() = "userId" OR
  exists (select 1 from public.workspaces where id = subscriptions."workspaceId" and "ownerId" = auth.uid())
);
