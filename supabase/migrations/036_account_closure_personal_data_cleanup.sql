-- STEP 52D-2B: finalized account closure personal-data minimization.
-- Extends the existing closure DB transaction without changing its public
-- signature, financial preconditions, Auth phase, or CLOSED transition.

alter table public.free_analysis_results
  alter column profile_snapshot drop not null,
  alter column profile_fingerprint drop not null;

alter table public.free_analysis_results
  drop constraint if exists free_analysis_results_completed_requires_content;

create or replace function public.prevent_free_analysis_personal_nulls()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_finalization_started_at timestamptz;
begin
  if new.profile_snapshot is null
    or new.profile_fingerprint is null
    or (new.status = 'completed' and new.content is null) then
    select status, finalization_started_at
      into v_status, v_finalization_started_at
    from public.account_lifecycles
    where user_id = new.user_id;

    if not found
      or not (
        v_status = 'CLOSED'
        or (v_status = 'DELETION_REQUESTED' and v_finalization_started_at is not null)
      ) then
      raise exception 'FREE_ANALYSIS_PERSONAL_FIELDS_REQUIRED_FOR_ACTIVE_ACCOUNT';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists free_analysis_results_personal_fields_guard on public.free_analysis_results;
create trigger free_analysis_results_personal_fields_guard
  before insert or update on public.free_analysis_results
  for each row
  execute function public.prevent_free_analysis_personal_nulls();

-- Normalize only accounts already finalized before this migration. Financial
-- rows are not deleted or altered by this backfill.
update public.free_analysis_results result
set
  content = null,
  profile_snapshot = null,
  profile_fingerprint = null
from public.account_lifecycles lifecycle
where lifecycle.user_id = result.user_id
  and lifecycle.status = 'CLOSED';

update public.orders order_row
set analysis_reference_snapshot = case
  when jsonb_typeof(order_row.analysis_reference_snapshot) = 'object'
    and jsonb_typeof(order_row.analysis_reference_snapshot -> 'anchorDate') = 'string'
  then jsonb_build_object('anchorDate', order_row.analysis_reference_snapshot -> 'anchorDate')
  else null
end
from public.account_lifecycles lifecycle
where lifecycle.user_id = order_row.user_id
  and lifecycle.status = 'CLOSED'
  and order_row.analysis_reference_snapshot is not null;

update public.purchases purchase_row
set analysis_reference_snapshot = case
  when jsonb_typeof(purchase_row.analysis_reference_snapshot) = 'object'
    and jsonb_typeof(purchase_row.analysis_reference_snapshot -> 'anchorDate') = 'string'
  then jsonb_build_object('anchorDate', purchase_row.analysis_reference_snapshot -> 'anchorDate')
  else null
end
from public.account_lifecycles lifecycle
where lifecycle.user_id = purchase_row.user_id
  and lifecycle.status = 'CLOSED'
  and purchase_row.analysis_reference_snapshot is not null;

delete from public.interested_analyses interest
using public.account_lifecycles lifecycle
where lifecycle.user_id = interest.user_id
  and lifecycle.status = 'CLOSED';

delete from public.guest_free_analyses guest
using public.account_lifecycles lifecycle
where lifecycle.user_id = guest.transferred_user_id
  and lifecycle.status = 'CLOSED'
  and guest.consumed_at is not null;

-- Replace the existing RPC body while preserving its authorization, signature,
-- financial checks, advisory lock, and data_scrubbed_at completion boundary.
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

  update public.free_analysis_results
  set
    content = null,
    profile_snapshot = null,
    profile_fingerprint = null
  where user_id = p_user_id
    and (
      content is not null
      or profile_snapshot is not null
      or profile_fingerprint is not null
    );

  update public.orders
  set
    analysis_reference_snapshot = case
      when jsonb_typeof(analysis_reference_snapshot) = 'object'
        and jsonb_typeof(analysis_reference_snapshot -> 'anchorDate') = 'string'
      then jsonb_build_object('anchorDate', analysis_reference_snapshot -> 'anchorDate')
      else null
    end,
    analysis_input_snapshot = null
  where user_id = p_user_id
    and (analysis_reference_snapshot is not null or analysis_input_snapshot is not null);

  update public.purchases
  set
    analysis_reference_snapshot = case
      when jsonb_typeof(analysis_reference_snapshot) = 'object'
        and jsonb_typeof(analysis_reference_snapshot -> 'anchorDate') = 'string'
      then jsonb_build_object('anchorDate', analysis_reference_snapshot -> 'anchorDate')
      else null
    end,
    analysis_input_snapshot = null
  where user_id = p_user_id
    and (analysis_reference_snapshot is not null or analysis_input_snapshot is not null);

  delete from public.interested_analyses
  where user_id = p_user_id;

  delete from public.guest_free_analyses
  where transferred_user_id = p_user_id
    and consumed_at is not null;

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
