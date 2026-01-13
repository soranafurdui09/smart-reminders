-- Extend household roles with VIEWER and add accountability/assignments.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'household_role'
      AND e.enumlabel = 'VIEWER'
  ) THEN
    ALTER TYPE household_role ADD VALUE 'VIEWER';
  END IF;
END $$;

alter table reminder_occurrences
  add column if not exists performed_by uuid references auth.users(id),
  add column if not exists performed_at timestamptz;

create table if not exists reminder_assignments (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references reminders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (reminder_id, user_id)
);

alter table reminder_assignments enable row level security;

-- Household members policies (roles management by owner).
DROP POLICY IF EXISTS "Household members insertable by owner" ON household_members;
DROP POLICY IF EXISTS "Household members updatable by owner" ON household_members;
DROP POLICY IF EXISTS "Household members deletable by owner" ON household_members;

create policy "Household members insertable by owner" on household_members
  for insert with check (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'OWNER'
    )
  );

create policy "Household members updatable by owner" on household_members
  for update using (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'OWNER'
    )
  ) with check (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'OWNER'
    )
  );

create policy "Household members deletable by owner" on household_members
  for delete using (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'OWNER'
    )
  );

-- Household invites policies (owner role based).
DROP POLICY IF EXISTS "Household invites viewable by owner" ON household_invites;
DROP POLICY IF EXISTS "Household invites insertable by owner" ON household_invites;
DROP POLICY IF EXISTS "Household invites updatable by owner" ON household_invites;

create policy "Household invites viewable by owner" on household_invites
  for select using (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_invites.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'OWNER'
    )
  );

create policy "Household invites insertable by owner" on household_invites
  for insert with check (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_invites.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'OWNER'
    )
  );

create policy "Household invites updatable by owner" on household_invites
  for update using (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_invites.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'OWNER'
    )
  ) with check (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_invites.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'OWNER'
    )
  );

-- Reminder assignments policies
create policy "Reminder assignments viewable by household members" on reminder_assignments
  for select using (
    exists (
      select 1
      from reminders r
      join household_members hm on hm.household_id = r.household_id
      where r.id = reminder_assignments.reminder_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Reminder assignments insertable by owner or member" on reminder_assignments
  for insert with check (
    exists (
      select 1
      from reminders r
      join household_members hm on hm.household_id = r.household_id
      where r.id = reminder_assignments.reminder_id
        and hm.user_id = auth.uid()
        and hm.role in ('OWNER', 'MEMBER')
    )
  );

create policy "Reminder assignments updatable by owner or member" on reminder_assignments
  for update using (
    exists (
      select 1
      from reminders r
      join household_members hm on hm.household_id = r.household_id
      where r.id = reminder_assignments.reminder_id
        and hm.user_id = auth.uid()
        and hm.role in ('OWNER', 'MEMBER')
    )
  ) with check (
    exists (
      select 1
      from reminders r
      join household_members hm on hm.household_id = r.household_id
      where r.id = reminder_assignments.reminder_id
        and hm.user_id = auth.uid()
        and hm.role in ('OWNER', 'MEMBER')
    )
  );

create policy "Reminder assignments deletable by owner or member" on reminder_assignments
  for delete using (
    exists (
      select 1
      from reminders r
      join household_members hm on hm.household_id = r.household_id
      where r.id = reminder_assignments.reminder_id
        and hm.user_id = auth.uid()
        and hm.role in ('OWNER', 'MEMBER')
    )
  );

-- Update reminder policies to block viewer writes.
DROP POLICY IF EXISTS "Reminders insertable by household members" ON reminders;
DROP POLICY IF EXISTS "Reminders updatable by creator or owner" ON reminders;
DROP POLICY IF EXISTS "Reminders deletable by creator or owner" ON reminders;

create policy "Reminders insertable by owner or member" on reminders
  for insert with check (
    exists (
      select 1
      from household_members hm
      where hm.household_id = reminders.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('OWNER', 'MEMBER')
    )
  );

create policy "Reminders updatable by creator or owner" on reminders
  for update using (
    reminders.created_by = auth.uid() or exists (
      select 1 from household_members hm
      where hm.household_id = reminders.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'OWNER'
    )
  ) with check (
    reminders.created_by = auth.uid() or exists (
      select 1 from household_members hm
      where hm.household_id = reminders.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'OWNER'
    )
  );

create policy "Reminders deletable by creator or owner" on reminders
  for delete using (
    reminders.created_by = auth.uid() or exists (
      select 1 from household_members hm
      where hm.household_id = reminders.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'OWNER'
    )
  );

-- Update occurrences policies to block viewer writes.
DROP POLICY IF EXISTS "Occurrences updatable by household members" ON reminder_occurrences;
DROP POLICY IF EXISTS "Occurrences insertable by household members" ON reminder_occurrences;

create policy "Occurrences updatable by owner or member" on reminder_occurrences
  for update using (
    exists (
      select 1
      from reminders r
      join household_members hm on hm.household_id = r.household_id
      where r.id = reminder_occurrences.reminder_id
        and hm.user_id = auth.uid()
        and hm.role in ('OWNER', 'MEMBER')
    )
  ) with check (
    exists (
      select 1
      from reminders r
      join household_members hm on hm.household_id = r.household_id
      where r.id = reminder_occurrences.reminder_id
        and hm.user_id = auth.uid()
        and hm.role in ('OWNER', 'MEMBER')
    )
  );

create policy "Occurrences insertable by owner or member" on reminder_occurrences
  for insert with check (
    exists (
      select 1
      from reminders r
      join household_members hm on hm.household_id = r.household_id
      where r.id = reminder_occurrences.reminder_id
        and hm.user_id = auth.uid()
        and hm.role in ('OWNER', 'MEMBER')
    )
  );
