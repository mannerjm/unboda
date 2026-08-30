-- STEP 57D-46 PHASE 3D-1: Transactional Account Closure Database Cleanup RPC & Financial Safety Predicate
--
-- 1. Helper function to assert financial cleanup safety: public.has_account_closure_financial_blockers(p_user_id uuid)
-- 2. Financial write protection trigger: public.protect_account_closure_financial_writes()
--    Acquires transaction-scoped advisory lock pg_advisory_xact_lock(hashtext('account_closure_financial:' || user_id::text))
--    and prevents financial mutations after data_scrubbed_at is set.
-- 3. Cleanup RPC: public.execute_account_closure_db_cleanup(p_user_id uuid)
--    Acquires exclusive transaction-scoped advisory lock, checks finalization_started_at, asserts financial safety,
--    and atomically tombstones profiles, scrubs paid reports, revokes entitlements, and sets data_scrubbed_at.

create or replace function public.has_account_closure_financial_blockers(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_has_refund_blocker boolean;
  v_has_payment_blocker boolean;
begin
  -- Acquire transaction-scoped advisory lock for user_id to serialize with cleanup RPC & financial writers
  perform pg_advisory_xact_lock(hashtext('account_closure_financial:' || p_user_id::text));

  -- 1. Check refund workflows: active/pending/failed statuses block cleanup
  select exists (
    select 1
    from public.refund_workflows
    where user_id = p_user_id
      and status in ('REFUND_REQUESTED', 'REFUND_PROCESSING', 'REFUND_FAILED_RETRYING', 'OWNER_REVIEW_REQUIRED')
  ) into v_has_refund_blocker;

  if v_has_refund_blocker then
    return true;
  end if;

  -- Fail closed on any unrecognized refund_workflows status
  select exists (
    select 1
    from public.refund_workflows
    where user_id = p_user_id
      and status not in ('REFUND_COMPLETED', 'REFUND_REQUESTED', 'REFUND_PROCESSING', 'REFUND_FAILED_RETRYING', 'OWNER_REVIEW_REQUIRED')
  ) into v_has_refund_blocker;

  if v_has_refund_blocker then
    return true;
  end if;

  -- 2. Check toss_payment_records for user's orders: reconciliation_required, reconciliation_failed, confirmation_started, externally_confirmed, terminal_mismatch
  select exists (
    select 1
    from public.toss_payment_records tpr
    join public.orders o on o.id = tpr.order_id
    where o.user_id = p_user_id
      and tpr.reconciliation_status in (
        'reconciliation_required',
        'reconciliation_failed',
        'confirmation_started',
        'externally_confirmed',
        'terminal_mismatch'
      )
  ) into v_has_payment_blocker;

  if v_has_payment_blocker then
    return true;
  end if;

  -- Fail closed on any unrecognized toss_payment_records reconciliation_status
  select exists (
    select 1
    from public.toss_payment_records tpr
    join public.orders o on o.id = tpr.order_id
    where o.user_id = p_user_id
      and tpr.reconciliation_status not in (
        'pending',
        'paid',
        'reconciliation_required',
        'reconciliation_failed',
        'confirmation_started',
        'externally_confirmed',
        'terminal_mismatch'
      )
  ) into v_has_payment_blocker;

  if v_has_payment_blocker then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.has_account_closure_financial_blockers(uuid) from public, anon, authenticated;
grant execute on function public.has_account_closure_financial_blockers(uuid) to service_role;

-- Financial write protection trigger function
create or replace function public.protect_account_closure_financial_writes()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid;
  v_data_scrubbed_at timestamptz;
  v_status text;
begin
  if TG_TABLE_NAME = 'refund_workflows' then
    v_user_id := NEW.user_id;
  elsif TG_TABLE_NAME = 'toss_payment_records' then
    select user_id into v_user_id
    from public.orders
    where id = NEW.order_id;
  end if;

  if v_user_id is not null then
    -- Acquire transaction-scoped advisory lock for user_id
    perform pg_advisory_xact_lock(hashtext('account_closure_financial:' || v_user_id::text));

    select data_scrubbed_at, status into v_data_scrubbed_at, v_status
    from public.account_lifecycles
    where user_id = v_user_id;

    if v_data_scrubbed_at is not null or v_status = 'CLOSED' then
      raise exception 'Cannot create or modify financial records for a closed/scrubbed account (user %)', v_user_id;
    end if;
  end if;

  return NEW;
end;
$$;

-- Attach triggers to refund_workflows and toss_payment_records
drop trigger if exists trg_protect_refund_workflows_account_closure on public.refund_workflows;
create trigger trg_protect_refund_workflows_account_closure
  before insert or update on public.refund_workflows
  for each row
  execute function public.protect_account_closure_financial_writes();

drop trigger if exists trg_protect_toss_payment_records_account_closure on public.toss_payment_records;
create trigger trg_protect_toss_payment_records_account_closure
  before insert or update on public.toss_payment_records
  for each row
  execute function public.protect_account_closure_financial_writes();

-- Server-only RPC function that executes atomic, idempotent database-side cleanup
create or replace function public.execute_account_closure_db_cleanup(p_user_id uuid)
returns public.account_lifecycles
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_account public.account_lifecycles%rowtype;
begin
  -- 1. Acquire transaction-scoped advisory lock for user_id to serialize with financial writers
  perform pg_advisory_xact_lock(hashtext('account_closure_financial:' || p_user_id::text));

  -- 2. Lock and verify target account lifecycle row
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

  -- 3. Idempotency check: if DB data is already scrubbed, return current row
  if v_account.data_scrubbed_at is not null then
    return v_account;
  end if;

  -- 4. DB-side Financial Blocker Safety Assertion (Fails closed prior to any data scrub)
  if public.has_account_closure_financial_blockers(p_user_id) then
    raise exception 'Cannot execute account closure database cleanup: unresolved financial blockers exist for user %', p_user_id;
  end if;

  -- 5. Delete transient active profile selection
  delete from public.active_profiles
  where user_id = p_user_id;

  -- 6. Tombstone personal Saju chart inputs on profiles
  -- Retains profile UUID for FK integrity while destroying personal birth data
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

  -- 7. Scrub personalized content from completed/generating paid reports
  update public.paid_reports
  set
    content = '{"scrubbed": true}'::jsonb,
    updated_at = now()
  where user_id = p_user_id
    and (content is null or content <> '{"scrubbed": true}'::jsonb);

  -- 8. Revoke active entitlements
  update public.entitlements
  set
    is_active = false,
    revoked_at = now(),
    revocation_reason = 'ACCOUNT_CLOSED'
  where user_id = p_user_id
    and is_active = true;

  -- 9. Record DB data scrubbed completion timestamp
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
