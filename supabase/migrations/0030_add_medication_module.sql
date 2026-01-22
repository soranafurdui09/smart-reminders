create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  reminder_id uuid references public.reminders(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  patient_member_id uuid references public.household_members(id) on delete set null,
  name text not null,
  form text,
  strength text,
  notes text,
  is_active boolean not null default true,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medication_schedules (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  schedule_type text not null,
  days_of_week int[] null,
  times_local text[] not null,
  start_date date not null,
  end_date date null,
  interval_hours int null,
  dose_amount numeric null,
  dose_unit text null,
  reminder_window_minutes int not null default 60,
  allow_snooze boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medication_stock (
  medication_id uuid primary key references public.medications(id) on delete cascade,
  quantity_on_hand numeric not null,
  unit text not null,
  decrement_per_dose numeric not null default 1,
  low_stock_threshold numeric null,
  refill_lead_days int not null default 5,
  refill_enabled boolean not null default true,
  last_refill_at timestamptz null,
  updated_at timestamptz not null default now()
);

create table if not exists public.medication_caregivers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  patient_member_id uuid not null references public.household_members(id) on delete cascade,
  caregiver_member_id uuid not null references public.household_members(id) on delete cascade,
  can_edit boolean not null default false,
  escalation_enabled boolean not null default true,
  escalation_after_minutes int not null default 30,
  escalation_channels text[] not null default array['push']::text[],
  created_at timestamptz not null default now()
);

create table if not exists public.medication_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  medication_id uuid not null references public.medications(id) on delete cascade,
  dose_instance_id uuid null references public.medication_doses(id) on delete cascade,
  actor_profile_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.medication_doses
  add column if not exists medication_id uuid references public.medications(id) on delete cascade,
  add column if not exists household_id uuid references public.households(id) on delete cascade,
  add column if not exists patient_member_id uuid references public.household_members(id) on delete set null,
  add column if not exists scheduled_local_date date,
  add column if not exists scheduled_local_time text,
  add column if not exists confirmation_deadline timestamptz,
  add column if not exists snoozed_until timestamptz,
  add column if not exists skipped_at timestamptz,
  add column if not exists missed_at timestamptz,
  add column if not exists escalation_notified_at timestamptz,
  add column if not exists stock_decremented boolean not null default false;

alter table public.medication_doses
  drop constraint if exists medication_doses_status_check;

alter table public.medication_doses
  add constraint medication_doses_status_check
  check (status in ('pending', 'taken', 'skipped', 'missed'));

update public.medication_doses md
set medication_id = m.id,
    household_id = m.household_id,
    patient_member_id = m.patient_member_id
from public.medications m
where md.medication_id is null
  and md.reminder_id = m.reminder_id;

update public.medication_doses md
set household_id = r.household_id
from public.reminders r
where md.household_id is null
  and md.reminder_id = r.id;

create index if not exists medications_household_id_idx on public.medications(household_id);
create index if not exists medications_reminder_id_idx on public.medications(reminder_id);

create index if not exists medication_schedules_medication_id_idx on public.medication_schedules(medication_id);

create index if not exists medication_stock_low_idx on public.medication_stock(medication_id, quantity_on_hand);

create index if not exists medication_doses_medication_id_idx on public.medication_doses(medication_id);
create index if not exists medication_doses_household_status_idx on public.medication_doses(household_id, status);
create index if not exists medication_doses_status_scheduled_idx on public.medication_doses(status, scheduled_at);
create index if not exists medication_doses_confirmation_deadline_idx on public.medication_doses(confirmation_deadline);
create index if not exists medication_doses_escalation_idx on public.medication_doses(escalation_notified_at);

alter table public.medications enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.medication_stock enable row level security;
alter table public.medication_caregivers enable row level security;
alter table public.medication_events enable row level security;

drop policy if exists "Medication doses viewable by household members" on public.medication_doses;
drop policy if exists "Medication doses insertable by household members" on public.medication_doses;
drop policy if exists "Medication doses updatable by household members" on public.medication_doses;
drop policy if exists "Medication doses deletable by household members" on public.medication_doses;

create policy "Medications viewable by household members" on public.medications
  for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = medications.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medications insertable by household members" on public.medications
  for insert
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = medications.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medications updatable by household members" on public.medications
  for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = medications.household_id
        and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = medications.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medications deletable by household members" on public.medications
  for delete
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = medications.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication schedules viewable by household members" on public.medication_schedules
  for select
  using (
    exists (
      select 1 from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_schedules.medication_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication schedules insertable by household members" on public.medication_schedules
  for insert
  with check (
    exists (
      select 1 from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_schedules.medication_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication schedules updatable by household members" on public.medication_schedules
  for update
  using (
    exists (
      select 1 from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_schedules.medication_id
        and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_schedules.medication_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication schedules deletable by household members" on public.medication_schedules
  for delete
  using (
    exists (
      select 1 from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_schedules.medication_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication stock viewable by household members" on public.medication_stock
  for select
  using (
    exists (
      select 1 from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_stock.medication_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication stock insertable by household members" on public.medication_stock
  for insert
  with check (
    exists (
      select 1 from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_stock.medication_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication stock updatable by household members" on public.medication_stock
  for update
  using (
    exists (
      select 1 from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_stock.medication_id
        and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_stock.medication_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication caregivers viewable by household members" on public.medication_caregivers
  for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = medication_caregivers.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication caregivers insertable by household members" on public.medication_caregivers
  for insert
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = medication_caregivers.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication caregivers updatable by household members" on public.medication_caregivers
  for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = medication_caregivers.household_id
        and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = medication_caregivers.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication events viewable by household members" on public.medication_events
  for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = medication_events.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication events insertable by household members" on public.medication_events
  for insert
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = medication_events.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication doses viewable by household members" on public.medication_doses
  for select
  using (
    exists (
      select 1
      from public.reminders r
      join public.household_members hm on hm.household_id = r.household_id
      where r.id = medication_doses.reminder_id
        and hm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_doses.medication_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication doses insertable by household members" on public.medication_doses
  for insert
  with check (
    exists (
      select 1
      from public.reminders r
      join public.household_members hm on hm.household_id = r.household_id
      where r.id = medication_doses.reminder_id
        and hm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_doses.medication_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication doses updatable by household members" on public.medication_doses
  for update
  using (
    exists (
      select 1
      from public.reminders r
      join public.household_members hm on hm.household_id = r.household_id
      where r.id = medication_doses.reminder_id
        and hm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_doses.medication_id
        and hm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.reminders r
      join public.household_members hm on hm.household_id = r.household_id
      where r.id = medication_doses.reminder_id
        and hm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_doses.medication_id
        and hm.user_id = auth.uid()
    )
  );

create policy "Medication doses deletable by household members" on public.medication_doses
  for delete
  using (
    exists (
      select 1
      from public.reminders r
      join public.household_members hm on hm.household_id = r.household_id
      where r.id = medication_doses.reminder_id
        and hm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.medications m
      join public.household_members hm on hm.household_id = m.household_id
      where m.id = medication_doses.medication_id
        and hm.user_id = auth.uid()
    )
  );
