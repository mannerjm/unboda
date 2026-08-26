-- STEP 57D-45D: atomic refund reconciliation claim with an expiring lease.
alter table public.refund_workflows
  add column if not exists reconciliation_claim_token uuid,
  add column if not exists reconciliation_claimed_at timestamptz,
  add column if not exists reconciliation_claim_expires_at timestamptz;

create index if not exists refund_workflows_claimable_idx
  on public.refund_workflows(status, next_retry_at, reconciliation_claim_expires_at);

create or replace function public.claim_refund_workflows(
  requested_limit integer default 50,
  claim_token uuid default gen_random_uuid(),
  lease_seconds integer default 300
)
returns setof public.refund_workflows
language sql
security definer
set search_path = public
as $$
  update public.refund_workflows workflow
  set reconciliation_claim_token = claim_token,
      reconciliation_claimed_at = now(),
      reconciliation_claim_expires_at = now() + make_interval(secs => lease_seconds),
      updated_at = now()
  where workflow.id in (
    select candidate.id
    from public.refund_workflows candidate
    where candidate.status in ('REFUND_REQUESTED', 'REFUND_PROCESSING', 'REFUND_FAILED_RETRYING')
      and candidate.next_retry_at <= now()
      and (candidate.reconciliation_claim_expires_at is null or candidate.reconciliation_claim_expires_at <= now())
    order by candidate.updated_at asc
    limit least(greatest(requested_limit, 1), 50)
    for update skip locked
  )
  returning workflow.*;
$$;

revoke all on function public.claim_refund_workflows(integer, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_refund_workflows(integer, uuid, integer) to service_role;