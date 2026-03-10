create table if not exists cortex_optimizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  account_id text not null,
  account_name text,
  action_type text not null,
  campaign_id text,
  campaign_name text,
  ad_id text,
  ad_name text,
  reasoning text,
  expected_impact text,
  metrics_before jsonb,
  metrics_after jsonb,
  status text default 'executed',
  created_at timestamptz default now()
);

alter table cortex_optimizations enable row level security;

create policy "users see own optimizations" on cortex_optimizations
  for all using (auth.uid() = user_id);
