alter table if exists public.reminders
  add column if not exists user_notify_at timestamptz null;

alter table if exists public.reminders
  add column if not exists user_notify_policy text null default 'ONCE';
