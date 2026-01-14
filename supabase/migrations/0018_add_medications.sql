do $$ begin
  if not exists (select 1 from pg_type where typname = 'reminder_kind') then
    create type reminder_kind as enum ('generic', 'medication');
  end if;
end $$;

alter table public.reminders
  add column if not exists kind reminder_kind default 'generic';

alter table public.reminders
  add column if not exists medication_details jsonb;

update public.reminders set kind = 'generic' where kind is null;

create table if not exists public.medication_doses (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null check (status in ('pending','taken','skipped')),
  skipped_reason text,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists medication_doses_reminder_id_idx on public.medication_doses(reminder_id);
create index if not exists medication_doses_scheduled_at_idx on public.medication_doses(scheduled_at);

alter table public.medication_doses enable row level security;

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
  )
  with check (
    exists (
      select 1
      from public.reminders r
      join public.household_members hm on hm.household_id = r.household_id
      where r.id = medication_doses.reminder_id
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
  );

create table if not exists public.medication_notification_log (
  id uuid primary key default gen_random_uuid(),
  medication_dose_id uuid not null references public.medication_doses(id) on delete cascade,
  channel notification_channel not null default 'email',
  sent_at timestamptz,
  status notification_status not null default 'sent',
  created_at timestamptz not null default now(),
  unique (medication_dose_id, channel)
);

