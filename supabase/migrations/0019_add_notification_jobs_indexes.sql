create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notify_at timestamptz not null,
  channel text not null check (channel in ('email', 'push', 'both')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_jobs_status_notify_at_idx
  on public.notification_jobs(status, notify_at);

create index if not exists notification_jobs_user_notify_at_idx
  on public.notification_jobs(user_id, notify_at);

create index if not exists notification_jobs_reminder_id_idx
  on public.notification_jobs(reminder_id);

alter table public.notification_jobs enable row level security;

drop policy if exists "Users can see their own notification jobs" on public.notification_jobs;
create policy "Users can see their own notification jobs"
  on public.notification_jobs
  for select
  using (auth.uid() = user_id);

create index if not exists reminders_created_by_idx
  on public.reminders(created_by);

create index if not exists reminders_household_id_idx
  on public.reminders(household_id);

create index if not exists reminders_household_due_at_idx
  on public.reminders(household_id, due_at);

create index if not exists reminders_created_by_due_at_idx
  on public.reminders(created_by, due_at);

create index if not exists reminders_created_by_kind_due_at_idx
  on public.reminders(created_by, kind, due_at);

create index if not exists household_members_household_id_idx
  on public.household_members(household_id);

create index if not exists household_members_user_household_idx
  on public.household_members(user_id, household_id);

create index if not exists reminder_occurrences_reminder_id_idx
  on public.reminder_occurrences(reminder_id);

create index if not exists reminder_occurrences_status_occur_at_idx
  on public.reminder_occurrences(status, occur_at);

create index if not exists notification_log_occurrence_id_idx
  on public.notification_log(reminder_occurrence_id);

create index if not exists medication_doses_reminder_scheduled_idx
  on public.medication_doses(reminder_id, scheduled_at);
