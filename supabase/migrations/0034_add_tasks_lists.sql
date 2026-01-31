create table if not exists public.task_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  type text not null default 'generic',
  created_at timestamptz not null default now()
);

create table if not exists public.task_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.task_lists(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  title text not null,
  notes text null,
  qty text null,
  due_date date null,
  priority text null,
  done boolean not null default false,
  done_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_task_items_updated_at on public.task_items;
create trigger set_task_items_updated_at
before update on public.task_items
for each row
execute function public.set_updated_at();

create index if not exists task_lists_owner_created_idx
  on public.task_lists(owner_id, created_at desc);

create index if not exists task_items_owner_done_due_created_idx
  on public.task_items(owner_id, done, due_date nulls last, created_at desc);

create index if not exists task_items_list_done_created_idx
  on public.task_items(list_id, done, created_at desc);

alter table public.task_lists enable row level security;
alter table public.task_items enable row level security;

drop policy if exists task_lists_owner_select on public.task_lists;
create policy task_lists_owner_select
  on public.task_lists
  for select
  using (owner_id = auth.uid());

drop policy if exists task_lists_owner_insert on public.task_lists;
create policy task_lists_owner_insert
  on public.task_lists
  for insert
  with check (owner_id = auth.uid());

drop policy if exists task_lists_owner_update on public.task_lists;
create policy task_lists_owner_update
  on public.task_lists
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists task_lists_owner_delete on public.task_lists;
create policy task_lists_owner_delete
  on public.task_lists
  for delete
  using (owner_id = auth.uid());

drop policy if exists task_items_owner_select on public.task_items;
create policy task_items_owner_select
  on public.task_items
  for select
  using (owner_id = auth.uid());

drop policy if exists task_items_owner_insert on public.task_items;
create policy task_items_owner_insert
  on public.task_items
  for insert
  with check (owner_id = auth.uid());

drop policy if exists task_items_owner_update on public.task_items;
create policy task_items_owner_update
  on public.task_items
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists task_items_owner_delete on public.task_items;
create policy task_items_owner_delete
  on public.task_items
  for delete
  using (owner_id = auth.uid());
