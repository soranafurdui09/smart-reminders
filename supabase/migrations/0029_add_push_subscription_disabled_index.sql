alter table public.push_subscriptions
  add column if not exists is_disabled boolean not null default false;

alter table public.push_subscriptions
  add column if not exists disabled_reason text;

update public.push_subscriptions
  set is_disabled = false
  where is_disabled is null;

create index if not exists push_subscriptions_user_disabled_idx
  on public.push_subscriptions(user_id, is_disabled);
