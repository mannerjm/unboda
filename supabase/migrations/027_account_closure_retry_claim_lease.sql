-- STEP 57D-46 PHASE 3E-1: Account Closure Durable Retry + Claim/Lease Foundation
--
-- 1. Add closure retry & claim lease columns to public.account_lifecycles.
--    Use `closure_` prefixes to keep closure automation separate from financial metadata.
-- 2. Create service-role RPC `claim_account_closure_finalizations`.
-- 3. Create service-role RPC `record_account_closure_retry`.
-- 4. Create service-role RPC `escalate_account_closure_owner_review`.
-- 5. Create service-role RPC `release_account_closure_claim`.

-- ---------------------------------------------------------------------------
-- 1. Schema Extensions
-- ---------------------------------------------------------------------------
alter table public.account_lifecycles
  add column if not exists closure_retry_count integer not null default 0,
  add column if not exists closure_next_retry_at timestamptz,
  add column if not exists closure_last_attempt_at timestamptz,
  add column if not exists closure_last_error_code text,
  add column if not exists closure_owner_review_required boolean not null default false,
  add column if not exists closure_claim_token uuid,
  add column if not exists closure_claimed_at timestamptz,
  add column if not exists closure_claim_expires_at timestamptz;

create index if not exists account_lifecycles_closure_claimable_idx
  on public.account_lifecycles (status, finalization_started_at, closure_owner_review_required, closure_next_retry_at, closure_claim_expires_at)
  where status = 'DELETION_REQUESTED' and finalization_started_at is not null and finalized_at is null and closure_owner_review_required = false;

-- ---------------------------------------------------------------------------
-- 2. Claim RPC
-- ---------------------------------------------------------------------------
create or replace function public.claim_account_closure_finalizations(
  requested_limit integer default 10,
  claim_token uuid default gen_random_uuid(),
  lease_seconds integer default 300
)
returns setof public.account_lifecycles
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_effective_limit integer;
  v_effective_lease integer;
  v_effective_token uuid;
begin
  -- Input hardening: clamp limit to 1..50 (default 10)
  v_effective_limit := least(greatest(coalesce(requested_limit, 10), 1), 50);
  -- Input hardening: clamp lease_seconds to 10..3600 (default 300)
  v_effective_lease := least(greatest(coalesce(lease_seconds, 300), 10), 3600);
  -- Input hardening: guarantee non-null claim token
  v_effective_token := coalesce(claim_token, gen_random_uuid());

  return query
  with candidate_ids as (
    select candidate.id
    from public.account_lifecycles candidate
    where candidate.status = 'DELETION_REQUESTED'
      and candidate.finalization_started_at is not null
      and candidate.finalized_at is null
      and candidate.closure_owner_review_required = false
      and (candidate.closure_next_retry_at is null or candidate.closure_next_retry_at <= now())
      and (candidate.closure_claim_expires_at is null or candidate.closure_claim_expires_at <= now())
    order by candidate.updated_at asc
    limit v_effective_limit
    for update skip locked
  )
  update public.account_lifecycles lifecycle
  set
    closure_claim_token = v_effective_token,
    closure_claimed_at = now(),
    closure_claim_expires_at = now() + make_interval(secs => v_effective_lease),
    closure_last_attempt_at = now(),
    updated_at = now()
  from candidate_ids
  where lifecycle.id = candidate_ids.id
  returning lifecycle.*;
end;
$$;

revoke all on function public.claim_account_closure_finalizations(integer, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_account_closure_finalizations(integer, uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Retry Failure RPC
-- ---------------------------------------------------------------------------
create or replace function public.record_account_closure_retry(
  p_user_id uuid,
  p_claim_token uuid,
  p_error_code text,
  p_next_retry_at timestamptz
)
returns public.account_lifecycles
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_account public.account_lifecycles%rowtype;
begin
  if p_user_id is null or p_claim_token is null then
    raise exception 'user_id and claim_token are required';
  end if;

  update public.account_lifecycles
  set
    closure_retry_count = closure_retry_count + 1,
    closure_last_error_code = p_error_code,
    closure_next_retry_at = p_next_retry_at,
    closure_claim_token = null,
    closure_claimed_at = null,
    closure_claim_expires_at = null,
    updated_at = now()
  where user_id = p_user_id
    and closure_claim_token = p_claim_token
  returning * into v_account;

  if not found then
    select * into v_account from public.account_lifecycles where user_id = p_user_id;
  end if;

  return v_account;
end;
$$;

revoke all on function public.record_account_closure_retry(uuid, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.record_account_closure_retry(uuid, uuid, text, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Owner Review Escalation RPC
-- ---------------------------------------------------------------------------
create or replace function public.escalate_account_closure_owner_review(
  p_user_id uuid,
  p_claim_token uuid,
  p_error_code text
)
returns public.account_lifecycles
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_account public.account_lifecycles%rowtype;
begin
  if p_user_id is null or p_claim_token is null then
    raise exception 'user_id and claim_token are required';
  end if;

  update public.account_lifecycles
  set
    closure_owner_review_required = true,
    closure_last_error_code = p_error_code,
    closure_claim_token = null,
    closure_claimed_at = null,
    closure_claim_expires_at = null,
    updated_at = now()
  where user_id = p_user_id
    and closure_claim_token = p_claim_token
  returning * into v_account;

  if not found then
    select * into v_account from public.account_lifecycles where user_id = p_user_id;
  end if;

  return v_account;
end;
$$;

revoke all on function public.escalate_account_closure_owner_review(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.escalate_account_closure_owner_review(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Release Claim RPC
-- ---------------------------------------------------------------------------
create or replace function public.release_account_closure_claim(
  p_user_id uuid,
  p_claim_token uuid
)
returns public.account_lifecycles
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_account public.account_lifecycles%rowtype;
begin
  if p_user_id is null or p_claim_token is null then
    raise exception 'user_id and claim_token are required';
  end if;

  update public.account_lifecycles
  set
    closure_claim_token = null,
    closure_claimed_at = null,
    closure_claim_expires_at = null,
    updated_at = now()
  where user_id = p_user_id
    and closure_claim_token = p_claim_token
  returning * into v_account;

  if not found then
    select * into v_account from public.account_lifecycles where user_id = p_user_id;
  end if;

  return v_account;
end;
$$;

revoke all on function public.release_account_closure_claim(uuid, uuid) from public, anon, authenticated;
grant execute on function public.release_account_closure_claim(uuid, uuid) to service_role;
