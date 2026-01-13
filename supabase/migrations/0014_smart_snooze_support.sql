-- Ensure snooze metadata exists for occurrences.
alter table reminder_occurrences
  add column if not exists snoozed_until timestamptz;

create index if not exists reminder_occurrences_snoozed_until_idx
  on reminder_occurrences(snoozed_until);
