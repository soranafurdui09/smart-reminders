create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(hid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from households h
    where h.id = hid
      and h.owner_user_id = auth.uid()
  );
$$;

drop policy if exists "Household members are viewable by members" on household_members;
drop policy if exists "Household members insertable by owner" on household_members;

create policy "Household members are viewable by members" on household_members
  for select using (public.is_household_member(household_id));

create policy "Household members insertable by owner" on household_members
  for insert with check (public.is_household_owner(household_id));
