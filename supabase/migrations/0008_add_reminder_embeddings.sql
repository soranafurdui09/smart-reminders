create extension if not exists vector;

alter table reminders add column if not exists embedding vector(1536);

create index if not exists reminders_embedding_idx
  on reminders using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
