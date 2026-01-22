alter table public.medication_notification_log
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.medication_notification_log mnl
set user_id = r.created_by
from public.medication_doses md
join public.reminders r on r.id = md.reminder_id
where mnl.user_id is null
  and mnl.medication_dose_id = md.id;

alter table public.medication_notification_log
  drop constraint if exists medication_notification_log_medication_dose_id_channel_key;

create unique index if not exists medication_notification_log_dose_channel_user_uniq
  on public.medication_notification_log(medication_dose_id, channel, user_id);

create index if not exists medication_notification_log_user_idx
  on public.medication_notification_log(user_id);
