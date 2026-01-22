alter table public.notification_jobs
  drop constraint if exists notification_jobs_entity_occurrence_channel_uniq;

drop index if exists notification_jobs_entity_occurrence_channel_uniq;

drop index if exists notification_jobs_entity_occurrence_user_channel_uniq;

create unique index if not exists notification_jobs_entity_occurrence_user_channel_uniq
  on public.notification_jobs(entity_type, entity_id, occurrence_at_utc, channel, user_id);
