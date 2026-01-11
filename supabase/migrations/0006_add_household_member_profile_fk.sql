do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'household_members_user_id_fkey'
      and conrelid = 'public.household_members'::regclass
  ) then
    alter table household_members
      add constraint household_members_user_id_fkey
      foreign key (user_id) references profiles(user_id) on delete cascade;
  end if;
end $$;
