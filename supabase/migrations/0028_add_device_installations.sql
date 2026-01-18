create table if not exists public.device_installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  device_id text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, platform, device_id)
);

create index if not exists device_installations_user_platform_seen_idx
  on public.device_installations(user_id, platform, last_seen_at desc);

alter table public.device_installations enable row level security;

create policy "Device installations viewable by owner" on public.device_installations
  for select using (auth.uid() = user_id);

create policy "Device installations insertable by owner" on public.device_installations
  for insert with check (auth.uid() = user_id);

create policy "Device installations updatable by owner" on public.device_installations
  for update using (auth.uid() = user_id);

alter table public.push_subscriptions
  add column if not exists is_disabled boolean not null default false,
  add column if not exists disabled_reason text;
