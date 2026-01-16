alter table public.profiles
  add column if not exists notify_by_email boolean default true,
  add column if not exists notify_by_push boolean default false;

update public.profiles
  set notify_by_email = true
  where notify_by_email is null;

update public.profiles
  set notify_by_push = false
  where notify_by_push is null;
