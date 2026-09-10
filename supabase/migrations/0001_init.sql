-- AI Recap — service plane schema (AI_RECAP_TECHNICAL_ARCHITECTURE.md §16).
-- NO user content at rest here: only identity, entitlements, usage, quota, transient jobs.
-- Every table is RLS-scoped to the authenticated user (auth.uid()).

-- ── profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  settings jsonb not null default '{}'::jsonb        -- non-sensitive prefs only
);
alter table public.profiles enable row level security;
create policy "profiles self read"   on public.profiles for select using (id = auth.uid());
create policy "profiles self write"  on public.profiles for insert with check (id = auth.uid());
create policy "profiles self update" on public.profiles for update using (id = auth.uid());

-- ── entitlements (source of truth; updated by RevenueCat webhook) ────────────
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  unlimited_active boolean not null default false,
  unlimited_expires_at timestamptz,
  byok_lifetime boolean not null default false,
  original_transaction_id text,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
create policy "entitlements self read" on public.entitlements for select using (user_id = auth.uid());
-- writes happen via service role in the RevenueCat webhook (bypasses RLS); no client write policy.

-- ── usage_events (unit economics; no transcript/audio content) ───────────────
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recap_client_id uuid,                              -- opaque; not joinable to content
  recording_seconds numeric not null default 0,
  transcription_seconds numeric not null default 0,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  model text,
  provider text,
  estimated_cost_micros bigint not null default 0,
  occurred_at timestamptz not null default now()
);
alter table public.usage_events enable row level security;
create policy "usage self read"  on public.usage_events for select using (user_id = auth.uid());
create policy "usage self write" on public.usage_events for insert with check (user_id = auth.uid());

-- ── daily_quota (Free-plan enforcement, anti-tamper) ─────────────────────────
create table if not exists public.daily_quota (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  recaps_started int not null default 0,
  primary key (user_id, day)
);
alter table public.daily_quota enable row level security;
create policy "quota self read" on public.daily_quota for select using (user_id = auth.uid());
-- increments go through a SECURITY DEFINER function / Edge Function; no direct client write policy.

-- ── processing_jobs (transient; payloads deleted after completion) ───────────
create table if not exists public.processing_jobs (
  id uuid primary key,                               -- client-supplied idempotency key
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,                                -- 'transcription' | 'summary'
  status text not null default 'queued',
  audio_object_path text,                            -- points into transient bucket; nulled on cleanup
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default now() + interval '24 hours'
);
alter table public.processing_jobs enable row level security;
create policy "jobs self read"  on public.processing_jobs for select using (user_id = auth.uid());
create policy "jobs self write" on public.processing_jobs for insert with check (user_id = auth.uid());
create policy "jobs self update" on public.processing_jobs for update using (user_id = auth.uid());

-- Auto-provision a profile + empty entitlements row on signup (incl. anonymous).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.entitlements (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
