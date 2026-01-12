create or replace function match_reminders(
  query_embedding vector(1536),
  match_count int,
  match_household_id uuid
)
returns table (
  id uuid,
  title text,
  notes text,
  due_at timestamptz,
  household_id uuid,
  similarity float
)
language sql stable
as $$
  select
    r.id,
    r.title,
    r.notes,
    r.due_at,
    r.household_id,
    1 - (r.embedding <=> query_embedding) as similarity
  from reminders r
  where r.household_id = match_household_id
    and r.embedding is not null
  order by r.embedding <=> query_embedding
  limit match_count;
$$;
