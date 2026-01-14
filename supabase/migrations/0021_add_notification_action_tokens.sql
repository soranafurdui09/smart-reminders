alter table public.notification_jobs
  add column if not exists action_token text,
  add column if not exists action_token_expires_at timestamptz,
  add column if not exists action_handled_at timestamptz,
  add column if not exists action_handled_action text;

create index if not exists notification_jobs_action_token_idx
  on public.notification_jobs(action_token);
