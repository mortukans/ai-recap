-- AI Recap — anonymous diagnostics (crash/error reports). NO user content:
-- only app version, device model, error name/message/stack and a short route breadcrumb.
-- Written exclusively by the `log-error` Edge Function via the service role; not client-readable.

create table if not exists public.error_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,  -- anonymous account, or null if none yet
  app_version text,
  build_number text,
  platform text,
  os_version text,
  device_model text,
  fatal boolean not null default false,      -- true: uncaught/global handler · false: handled/boundary
  name text,
  message text,
  stack text,
  context text,                              -- short breadcrumb (route), never recording content
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.error_events enable row level security;
-- No client policies at all: only the service role (in the Edge Function) inserts; nobody selects.

create index if not exists error_events_occurred_idx on public.error_events (occurred_at desc);

-- Housekeeping: drop diagnostics older than 90 days (call from a scheduled task or manually).
create or replace function public.prune_error_events()
returns void language sql security definer set search_path = public as $$
  delete from public.error_events where occurred_at < now() - interval '90 days';
$$;
