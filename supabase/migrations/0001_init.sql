create extension if not exists "pgcrypto";

-- Enums
create type household_role as enum ('OWNER', 'MEMBER');
create type schedule_type as enum ('once', 'daily', 'weekly');
create type occurrence_status as enum ('open', 'done', 'snoozed');
create type notification_channel as enum ('email');
create type notification_status as enum ('sent', 'skipped', 'failed');

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null,
  role household_role not null default 'MEMBER',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

alter table household_members
  add constraint household_members_user_id_fkey
  foreign key (user_id) references profiles(user_id) on delete cascade;

create table if not exists household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  email text not null,
  role household_role not null default 'MEMBER',
  token_hash text not null unique,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  schedule_type schedule_type not null default 'once',
  due_at timestamptz,
  tz text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists reminder_occurrences (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references reminders(id) on delete cascade,
  occur_at timestamptz not null,
  status occurrence_status not null default 'open',
  done_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  reminder_occurrence_id uuid not null references reminder_occurrences(id) on delete cascade,
  channel notification_channel not null default 'email',
  sent_at timestamptz,
  status notification_status not null default 'sent',
  created_at timestamptz not null default now(),
  unique (reminder_occurrence_id, channel)
);

-- Indexes
create index if not exists household_members_user_id_idx on household_members(user_id);
create index if not exists household_invites_token_hash_idx on household_invites(token_hash);
create index if not exists reminder_occurrences_occur_at_idx on reminder_occurrences(occur_at);

-- Profiles trigger
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (user_id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'))
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable RLS
alter table profiles enable row level security;
alter table households enable row level security;
alter table household_members enable row level security;
alter table household_invites enable row level security;
alter table reminders enable row level security;
alter table reminder_occurrences enable row level security;
alter table notification_log enable row level security;

-- Profiles policies
create policy "Profiles are viewable by household members" on profiles
  for select using (
    user_id = auth.uid() or exists (
      select 1
      from household_members hm_self
      join household_members hm_other on hm_other.household_id = hm_self.household_id
      where hm_self.user_id = auth.uid()
        and hm_other.user_id = profiles.user_id
    )
  );

create policy "Profiles are updatable by owner" on profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Households policies
create policy "Households are viewable by members" on households
  for select using (
    owner_user_id = auth.uid() or exists (
      select 1 from household_members hm
      where hm.household_id = households.id
        and hm.user_id = auth.uid()
    )
  );

create policy "Households are insertable by owner" on households
  for insert with check (owner_user_id = auth.uid());

create policy "Households are updatable by owner" on households
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- Household members policies
create policy "Household members are viewable by members" on household_members
  for select using (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Household members insertable by owner" on household_members
  for insert with check (
    exists (
      select 1 from households h
      where h.id = household_members.household_id
        and h.owner_user_id = auth.uid()
    )
  );

-- Household invites policies
create policy "Household invites viewable by owner" on household_invites
  for select using (
    exists (
      select 1 from households h
      where h.id = household_invites.household_id
        and h.owner_user_id = auth.uid()
    )
  );

create policy "Household invites insertable by owner" on household_invites
  for insert with check (
    exists (
      select 1 from households h
      where h.id = household_invites.household_id
        and h.owner_user_id = auth.uid()
    )
  );

create policy "Household invites updatable by owner" on household_invites
  for update using (
    exists (
      select 1 from households h
      where h.id = household_invites.household_id
        and h.owner_user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from households h
      where h.id = household_invites.household_id
        and h.owner_user_id = auth.uid()
    )
  );

-- Reminders policies
create policy "Reminders are viewable by household members" on reminders
  for select using (
    exists (
      select 1 from household_members hm
      where hm.household_id = reminders.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Reminders insertable by household members" on reminders
  for insert with check (
    exists (
      select 1 from household_members hm
      where hm.household_id = reminders.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Reminders updatable by creator or owner" on reminders
  for update using (
    reminders.created_by = auth.uid() or exists (
      select 1 from households h
      where h.id = reminders.household_id
        and h.owner_user_id = auth.uid()
    )
  ) with check (
    reminders.created_by = auth.uid() or exists (
      select 1 from households h
      where h.id = reminders.household_id
        and h.owner_user_id = auth.uid()
    )
  );

create policy "Reminders deletable by creator or owner" on reminders
  for delete using (
    reminders.created_by = auth.uid() or exists (
      select 1 from households h
      where h.id = reminders.household_id
        and h.owner_user_id = auth.uid()
    )
  );

-- Reminder occurrences policies
create policy "Occurrences viewable by household members" on reminder_occurrences
  for select using (
    exists (
      select 1 from reminders r
      join household_members hm on hm.household_id = r.household_id
      where r.id = reminder_occurrences.reminder_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Occurrences updatable by household members" on reminder_occurrences
  for update using (
    exists (
      select 1 from reminders r
      join household_members hm on hm.household_id = r.household_id
      where r.id = reminder_occurrences.reminder_id
        and hm.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from reminders r
      join household_members hm on hm.household_id = r.household_id
      where r.id = reminder_occurrences.reminder_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Occurrences insertable by household members" on reminder_occurrences
  for insert with check (
    exists (
      select 1 from reminders r
      join household_members hm on hm.household_id = r.household_id
      where r.id = reminder_occurrences.reminder_id
        and hm.user_id = auth.uid()
    )
  );

-- Notification log policies
create policy "Notification log viewable by household members" on notification_log
  for select using (
    exists (
      select 1 from reminder_occurrences ro
      join reminders r on r.id = ro.reminder_id
      join household_members hm on hm.household_id = r.household_id
      where ro.id = notification_log.reminder_occurrence_id
        and hm.user_id = auth.uid()
    )
  );
