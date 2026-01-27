create table if not exists public.fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null default 'android',
  device_id text null,
  is_disabled boolean not null default false,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

create index if not exists fcm_tokens_user_disabled_idx
  on public.fcm_tokens(user_id, is_disabled);

create index if not exists fcm_tokens_last_seen_idx
  on public.fcm_tokens(last_seen_at);

alter table public.fcm_tokens enable row level security;

create policy "FCM tokens viewable by owner" on public.fcm_tokens
  for select
  using (user_id = auth.uid());

create policy "FCM tokens insertable by owner" on public.fcm_tokens
  for insert
  with check (user_id = auth.uid());

create policy "FCM tokens updatable by owner" on public.fcm_tokens
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
