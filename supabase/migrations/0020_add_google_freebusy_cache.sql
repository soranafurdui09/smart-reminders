alter table public.user_google_connections
  add column if not exists freebusy_cache_json jsonb,
  add column if not exists freebusy_cache_time_min timestamptz,
  add column if not exists freebusy_cache_time_max timestamptz,
  add column if not exists freebusy_cache_fetched_at timestamptz;

alter table public.profiles
  add column if not exists time_zone text default 'UTC';

update public.profiles
  set time_zone = 'UTC'
  where time_zone is null;
