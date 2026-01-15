alter table public.profiles
  add column if not exists context_defaults jsonb;
