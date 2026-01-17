alter table public.notification_jobs
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists occurrence_at_utc timestamptz,
  add column if not exists claimed_at timestamptz,
  add column if not exists claim_token text,
  add column if not exists retry_count int not null default 0,
  add column if not exists next_retry_at timestamptz;

update public.notification_jobs
  set occurrence_at_utc = notify_at
  where occurrence_at_utc is null;

update public.notification_jobs nj
  set entity_type = 'medication_dose',
      entity_id = md.id
from public.medication_doses md
where nj.entity_id is null
  and md.reminder_id = nj.reminder_id
  and md.scheduled_at = nj.notify_at;

update public.notification_jobs
  set entity_type = 'reminder',
      entity_id = reminder_id
  where entity_type is null
     or entity_id is null;

insert into public.notification_jobs (
  reminder_id,
  user_id,
  notify_at,
  channel,
  status,
  last_error,
  created_at,
  updated_at,
  action_token,
  action_token_expires_at,
  action_handled_at,
  action_handled_action,
  entity_type,
  entity_id,
  occurrence_at_utc,
  claimed_at,
  claim_token,
  retry_count,
  next_retry_at
)
select
  reminder_id,
  user_id,
  notify_at,
  'email',
  status,
  last_error,
  created_at,
  updated_at,
  action_token,
  action_token_expires_at,
  action_handled_at,
  action_handled_action,
  entity_type,
  entity_id,
  occurrence_at_utc,
  claimed_at,
  claim_token,
  retry_count,
  next_retry_at
from public.notification_jobs
where channel = 'both';

insert into public.notification_jobs (
  reminder_id,
  user_id,
  notify_at,
  channel,
  status,
  last_error,
  created_at,
  updated_at,
  action_token,
  action_token_expires_at,
  action_handled_at,
  action_handled_action,
  entity_type,
  entity_id,
  occurrence_at_utc,
  claimed_at,
  claim_token,
  retry_count,
  next_retry_at
)
select
  reminder_id,
  user_id,
  notify_at,
  'push',
  status,
  last_error,
  created_at,
  updated_at,
  action_token,
  action_token_expires_at,
  action_handled_at,
  action_handled_action,
  entity_type,
  entity_id,
  occurrence_at_utc,
  claimed_at,
  claim_token,
  retry_count,
  next_retry_at
from public.notification_jobs
where channel = 'both';

delete from public.notification_jobs where channel = 'both';

delete from public.notification_jobs a
using public.notification_jobs b
where a.id < b.id
  and a.entity_type = b.entity_type
  and a.entity_id = b.entity_id
  and a.occurrence_at_utc = b.occurrence_at_utc
  and a.channel = b.channel;

alter table public.notification_jobs
  alter column entity_type set not null,
  alter column entity_id set not null,
  alter column occurrence_at_utc set not null;

alter table public.notification_jobs
  drop constraint if exists notification_jobs_channel_check;

alter table public.notification_jobs
  add constraint notification_jobs_channel_check
  check (channel in ('email', 'push'));

alter table public.notification_jobs
  drop constraint if exists notification_jobs_status_check;

alter table public.notification_jobs
  add constraint notification_jobs_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'skipped'));

create index if not exists notification_jobs_status_notify_at_idx
  on public.notification_jobs(status, notify_at);

create index if not exists notification_jobs_next_retry_at_idx
  on public.notification_jobs(next_retry_at);

create index if not exists notification_jobs_entity_idx
  on public.notification_jobs(entity_type, entity_id);

create unique index if not exists notification_jobs_entity_occurrence_channel_uniq
  on public.notification_jobs(entity_type, entity_id, occurrence_at_utc, channel);

create or replace function public.get_utc_now()
returns timestamptz
language sql
stable
as $$
  select now();
$$;
