alter table public.notification_log
  add column if not exists reminder_id uuid references public.reminders(id) on delete cascade,
  add column if not exists occurrence_at_utc timestamptz,
  add column if not exists error text;

update public.notification_log nl
set reminder_id = ro.reminder_id,
    occurrence_at_utc = ro.occur_at
from public.reminder_occurrences ro
where nl.reminder_occurrence_id = ro.id
  and (nl.reminder_id is null or nl.occurrence_at_utc is null);

alter table public.notification_log
  drop constraint if exists notification_log_reminder_occurrence_id_channel_key;

create index if not exists notification_log_reminder_id_idx
  on public.notification_log(reminder_id);

create index if not exists notification_log_occurrence_at_idx
  on public.notification_log(occurrence_at_utc);

create unique index if not exists notification_log_occurrence_channel_uniq
  on public.notification_log(reminder_id, occurrence_at_utc, channel)
  where reminder_id is not null and occurrence_at_utc is not null;
