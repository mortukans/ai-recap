-- AI Recap — Free-plan quota consumption + entitlement helpers (MVP tasks M5-2 / M5-3).

-- Atomically count a recap start for today (UTC) against the Free daily cap.
-- Returns the number of recaps started today AFTER this call, or -1 when the cap is already reached
-- (nothing is incremented in that case). Unlimited users pass max_per_day = NULL and always succeed.
create or replace function public.consume_daily_quota(max_per_day int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  started int;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.daily_quota (user_id, day, recaps_started)
  values (uid, today, 0)
  on conflict (user_id, day) do nothing;

  select recaps_started into started
  from public.daily_quota
  where user_id = uid and day = today
  for update;

  if max_per_day is not null and started >= max_per_day then
    return -1;
  end if;

  update public.daily_quota
  set recaps_started = recaps_started + 1
  where user_id = uid and day = today;

  return started + 1;
end;
$$;

revoke all on function public.consume_daily_quota(int) from public;
grant execute on function public.consume_daily_quota(int) to authenticated;

-- Fast lookup for the webhook: RevenueCat app_user_id == Supabase auth user id (we log in with it).
create index if not exists entitlements_updated_at_idx on public.entitlements (updated_at);
