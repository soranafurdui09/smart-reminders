-- Allow household owners to create the initial membership row.
drop policy if exists "Household members insertable by owner" on household_members;

create policy "Household members insertable by owner" on household_members
  for insert with check (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'OWNER'
    )
    or exists (
      select 1 from households h
      where h.id = household_members.household_id
        and h.owner_user_id = auth.uid()
    )
  );
