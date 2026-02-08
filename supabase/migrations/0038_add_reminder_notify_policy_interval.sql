alter table if exists public.reminders
  add column if not exists user_notify_interval_minutes integer null;

update public.reminders
  set user_notify_policy = 'ONCE'
  where user_notify_policy is not null
    and user_notify_policy not in ('ONCE', 'UNTIL_DONE');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reminders_user_notify_policy_check'
  ) then
    alter table public.reminders
      add constraint reminders_user_notify_policy_check
      check (user_notify_policy is null or user_notify_policy in ('ONCE', 'UNTIL_DONE'));
  end if;
end $$;
