alter table profiles add column if not exists locale text default 'ro';

update profiles set locale = 'ro' where locale is null;
