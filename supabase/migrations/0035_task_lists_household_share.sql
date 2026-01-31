alter table public.task_lists
  add column if not exists household_id uuid references public.households(id);

alter table public.task_items
  add column if not exists household_id uuid references public.households(id);

update public.task_lists tl
set household_id = hm.household_id
from lateral (
  select household_id
  from public.household_members
  where user_id = tl.owner_id
  order by created_at
  limit 1
) hm
where tl.household_id is null;

update public.task_items ti
set household_id = tl.household_id
from public.task_lists tl
where ti.list_id = tl.id
  and ti.household_id is null;

create index if not exists task_lists_household_created_idx
  on public.task_lists(household_id, created_at desc);

create index if not exists task_items_household_done_due_created_idx
  on public.task_items(household_id, done, due_date nulls last, created_at desc);

alter table public.task_lists enable row level security;
alter table public.task_items enable row level security;

drop policy if exists task_lists_owner_select on public.task_lists;
drop policy if exists task_lists_owner_insert on public.task_lists;
drop policy if exists task_lists_owner_update on public.task_lists;
drop policy if exists task_lists_owner_delete on public.task_lists;

create policy task_lists_household_select
  on public.task_lists
  for select
  using (
    owner_id = auth.uid()
    or (
      household_id is not null
      and exists (
        select 1
        from public.household_members hm
        where hm.household_id = task_lists.household_id
          and hm.user_id = auth.uid()
      )
    )
  );

create policy task_lists_household_insert
  on public.task_lists
  for insert
  with check (
    owner_id = auth.uid()
    and (
      household_id is null
      or exists (
        select 1
        from public.household_members hm
        where hm.household_id = task_lists.household_id
          and hm.user_id = auth.uid()
      )
    )
  );

create policy task_lists_household_update
  on public.task_lists
  for update
  using (
    owner_id = auth.uid()
    or (
      household_id is not null
      and exists (
        select 1
        from public.household_members hm
        where hm.household_id = task_lists.household_id
          and hm.user_id = auth.uid()
      )
    )
  )
  with check (
    owner_id = auth.uid()
    and (
      household_id is null
      or exists (
        select 1
        from public.household_members hm
        where hm.household_id = task_lists.household_id
          and hm.user_id = auth.uid()
      )
    )
  );

create policy task_lists_household_delete
  on public.task_lists
  for delete
  using (
    owner_id = auth.uid()
    or (
      household_id is not null
      and exists (
        select 1
        from public.household_members hm
        where hm.household_id = task_lists.household_id
          and hm.user_id = auth.uid()
      )
    )
  );

drop policy if exists task_items_owner_select on public.task_items;
drop policy if exists task_items_owner_insert on public.task_items;
drop policy if exists task_items_owner_update on public.task_items;
drop policy if exists task_items_owner_delete on public.task_items;

create policy task_items_household_select
  on public.task_items
  for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.task_lists tl
      join public.household_members hm on hm.household_id = tl.household_id
      where tl.id = task_items.list_id
        and hm.user_id = auth.uid()
    )
  );

create policy task_items_household_insert
  on public.task_items
  for insert
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.task_lists tl
      left join public.household_members hm on hm.household_id = tl.household_id
      where tl.id = task_items.list_id
        and (tl.owner_id = auth.uid() or hm.user_id = auth.uid())
    )
  );

create policy task_items_household_update
  on public.task_items
  for update
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.task_lists tl
      join public.household_members hm on hm.household_id = tl.household_id
      where tl.id = task_items.list_id
        and hm.user_id = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.task_lists tl
      join public.household_members hm on hm.household_id = tl.household_id
      where tl.id = task_items.list_id
        and hm.user_id = auth.uid()
    )
  );

create policy task_items_household_delete
  on public.task_items
  for delete
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.task_lists tl
      join public.household_members hm on hm.household_id = tl.household_id
      where tl.id = task_items.list_id
        and hm.user_id = auth.uid()
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.task_items;
exception when duplicate_object then
  null;
end $$;
