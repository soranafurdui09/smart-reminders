alter table public.reminders
  add column if not exists google_event_id text,
  add column if not exists google_calendar_id text default 'primary';

alter table public.reminders
  alter column google_calendar_id set default 'primary';
