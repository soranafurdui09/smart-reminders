create table if not exists public.user_google_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null default 'google_calendar',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_google_connections
  add constraint user_google_connections_user_id_fkey
  foreign key (user_id)
  references auth.users (id)
  on delete cascade;

create unique index if not exists user_google_connections_user_provider_idx
  on public.user_google_connections (user_id, provider);

alter table public.user_google_connections enable row level security;

create policy "Users can see their own google connections"
  on public.user_google_connections
  for select
  using (auth.uid() = user_id);

create policy "Users can upsert their own google connections"
  on public.user_google_connections
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own google connections"
  on public.user_google_connections
  for update
  using (auth.uid() = user_id);
