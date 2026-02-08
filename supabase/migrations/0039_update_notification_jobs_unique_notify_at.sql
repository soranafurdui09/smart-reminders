drop index if exists notification_jobs_entity_occurrence_user_channel_uniq;

create unique index if not exists notification_jobs_entity_occurrence_user_channel_notify_at_uniq
  on public.notification_jobs(entity_type, entity_id, occurrence_at_utc, channel, user_id, notify_at);
