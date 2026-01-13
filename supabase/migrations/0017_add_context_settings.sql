alter table public.reminders
  add column if not exists context_settings jsonb;
