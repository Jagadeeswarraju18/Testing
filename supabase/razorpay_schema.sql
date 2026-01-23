-- Create table for logging Razorpay webhook events (Audit Trail)
create table if not exists payment_events (
  id uuid default gen_random_uuid() primary key,
  provider text not null, -- 'razorpay'
  event_type text not null, -- 'subscription.charged', etc.
  payload jsonb,
  status text, -- 'received', 'processed', 'ignored', 'failed'
  created_at timestamptz default now()
);

-- Protect the table (RLS)
alter table payment_events enable row level security;

-- Only service role (Edge Functions) can insert/read
create policy "Service role full access"
  on payment_events
  using ( auth.role() = 'service_role' )
  with check ( auth.role() = 'service_role' );

-- Optional: Allow admins to read? (For now, strict)
