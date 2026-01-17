create or replace function public.claim_notification_jobs(
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_limit int,
  p_claim_token text
)
returns setof public.notification_jobs
language plpgsql
as $$
begin
  return query
  with candidates as (
    select id
    from public.notification_jobs
    where status = 'pending'
      and notify_at >= p_window_start
      and notify_at <= p_window_end
      and (next_retry_at is null or next_retry_at <= now())
    order by notify_at asc
    limit p_limit
    for update skip locked
  )
  update public.notification_jobs as jobs
  set status = 'processing',
      claimed_at = now(),
      claim_token = p_claim_token,
      updated_at = now()
  from candidates
  where jobs.id = candidates.id
  returning jobs.*;
end;
$$;
