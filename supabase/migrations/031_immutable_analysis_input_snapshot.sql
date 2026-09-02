-- STEP 57D-48F-D2: immutable paid-analysis input snapshot (additive plumbing).
--
-- Adds a nullable analysis_input_snapshot jsonb column to orders/purchases
-- only. Captures ONLY the canonical saju calculation inputs (birthDate,
-- birthTime, calendarType, isLeapMonth, gender) actually consumed by
-- getSaju()/buildFreeAnalysis() — never the full profiles row, never account
-- metadata. Not added to entitlements/paid_reports: order/purchase remain the
-- single source of frozen commercial input; report identity does not need to
-- duplicate it.
--
-- Non-destructive: no drop, no reset, no NOT NULL. New production orders
-- always populate this column (enforced in application code); legacy
-- pre-D2 orders/purchases remain NULL and fall back to existing behavior.

alter table public.orders
  add column if not exists analysis_input_snapshot jsonb;

alter table public.purchases
  add column if not exists analysis_input_snapshot jsonb;

-- ---------------------------------------------------------------------------
-- Account closure: the frozen birth-data snapshot is personal data and must
-- follow the same scrub philosophy already applied to profiles/paid_reports.
-- Financial identity (amount, status, edition key) is retained; only the raw
-- birth-analysis input is cleared. Additive change to the existing cleanup
-- RPC (026_account_closure_db_cleanup_rpc.sql) — same signature, same safety
-- checks, only the body gains two more scrub statements.
-- ---------------------------------------------------------------------------
create or replace function public.execute_account_closure_db_cleanup(p_user_id uuid)
returns public.account_lifecycles
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_account public.account_lifecycles%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('account_closure_financial:' || p_user_id::text));

  select * into v_account
  from public.account_lifecycles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Account lifecycle not found for user %', p_user_id;
  end if;

  if v_account.status = 'CLOSED' or v_account.finalized_at is not null then
    return v_account;
  end if;

  if v_account.status <> 'DELETION_REQUESTED' then
    raise exception 'Account must be in DELETION_REQUESTED state to execute cleanup';
  end if;

  if v_account.finalization_started_at is null then
    raise exception 'Finalization has not been started for user %', p_user_id;
  end if;

  if v_account.data_scrubbed_at is not null then
    return v_account;
  end if;

  if public.has_account_closure_financial_blockers(p_user_id) then
    raise exception 'Cannot execute account closure database cleanup: unresolved financial blockers exist for user %', p_user_id;
  end if;

  delete from public.active_profiles
  where user_id = p_user_id;

  update public.profiles
  set
    label = 'ANONYMIZED',
    relationship_type = 'other',
    birth_date = '1900-01-01'::date,
    birth_time = '00:00:00'::time,
    gender = 'male',
    calendar_type = 'solar',
    is_leap_month = false,
    updated_at = now()
  where user_id = p_user_id;

  update public.paid_reports
  set
    content = '{"scrubbed": true}'::jsonb,
    updated_at = now()
  where user_id = p_user_id
    and (content is null or content <> '{"scrubbed": true}'::jsonb);

  -- Clear the frozen birth-data snapshot; financial identity (amount, status,
  -- product_id, analysis_edition_key) is retained for legitimate financial history.
  update public.orders
  set analysis_input_snapshot = null
  where user_id = p_user_id
    and analysis_input_snapshot is not null;

  update public.purchases
  set analysis_input_snapshot = null
  where user_id = p_user_id
    and analysis_input_snapshot is not null;

  update public.entitlements
  set
    is_active = false,
    revoked_at = now(),
    revocation_reason = 'ACCOUNT_CLOSED'
  where user_id = p_user_id
    and is_active = true;

  update public.account_lifecycles
  set
    data_scrubbed_at = now(),
    updated_at = now()
  where user_id = p_user_id
  returning * into v_account;

  return v_account;
end;
$$;

revoke all on function public.execute_account_closure_db_cleanup(uuid) from public, anon, authenticated;
grant execute on function public.execute_account_closure_db_cleanup(uuid) to service_role;
