alter table reminders add column if not exists recurrence_rule text;
alter table reminders add column if not exists pre_reminder_minutes integer;
alter table reminders add column if not exists assigned_member_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reminders_assigned_member_id_fkey'
  ) then
    alter table reminders
      add constraint reminders_assigned_member_id_fkey
      foreign key (assigned_member_id) references household_members(id) on delete set null;
  end if;
end $$;

create index if not exists reminders_assigned_member_id_idx on reminders(assigned_member_id);
