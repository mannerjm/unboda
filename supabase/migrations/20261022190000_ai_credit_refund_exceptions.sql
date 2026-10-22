-- AI consultation credit refund: manual exceptions and customer notification ledger.
-- No existing purchase, credit balance or paid transaction is modified by this migration.
alter table public.ai_credit_refund_requests
  add column if not exists provider_final_failure boolean not null default false,
  add column if not exists manual_reference text,
  add column if not exists manual_completed_at timestamptz,
  add column if not exists resolution_note text,
  add column if not exists processing_claim_token uuid,
  add column if not exists processing_claim_expires_at timestamptz;

alter table public.ai_credit_refund_requests drop constraint if exists ai_credit_refund_requests_status_check;
alter table public.ai_credit_refund_requests add constraint ai_credit_refund_requests_status_check
  check (status in ('PENDING','PROVIDER_UNKNOWN','COMPLETED','REVIEW_REQUIRED',
                   'MANUAL_BANK_REQUIRED','MANUAL_BANK_PAID','CANCELLED_NO_REFUND'));

create table if not exists public.ai_credit_refund_resolution_events (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null references public.ai_credit_refund_requests(id) on delete restrict,
  operator_auth_id uuid not null references auth.users(id) on delete restrict,
  resolution_action text not null check (resolution_action in ('MANUAL_REQUIRED','MANUAL_PAID','CREDIT_RESTORED')),
  reference_note text not null check (length(reference_note) between 6 and 240),
  created_at timestamptz not null default now()
);
create index if not exists ai_credit_refund_resolution_events_refund_idx
  on public.ai_credit_refund_resolution_events(refund_id,created_at desc);
alter table public.ai_credit_refund_resolution_events enable row level security;
revoke all on public.ai_credit_refund_resolution_events from public,anon,authenticated;
grant select,insert on public.ai_credit_refund_resolution_events to service_role;

create table if not exists public.ai_credit_refund_notice_deliveries (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null references public.ai_credit_refund_requests(id) on delete cascade,
  refund_status text not null check(refund_status in (
    'PENDING','PROVIDER_UNKNOWN','COMPLETED','REVIEW_REQUIRED',
    'MANUAL_BANK_REQUIRED','MANUAL_BANK_PAID','CANCELLED_NO_REFUND')),
  status text not null default 'PENDING' check(status in ('PENDING','SENDING','FAILED_RETRYING','SENT','FAILED_FINAL','SKIPPED')),
  attempt_count integer not null default 0 check(attempt_count>=0),
  next_retry_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(refund_id, refund_status)
);
create index if not exists ai_credit_refund_notices_pending_idx
  on public.ai_credit_refund_notice_deliveries(status, next_retry_at, created_at);
alter table public.ai_credit_refund_notice_deliveries enable row level security;
revoke all on public.ai_credit_refund_notice_deliveries from public,anon,authenticated;
grant select,insert,update on public.ai_credit_refund_notice_deliveries to service_role;

-- One provider call per request at a time; claims are fenced and expire if a worker crashes.
create or replace function public.claim_ai_credit_refund_processing(p_request_id uuid,p_token uuid)
returns setof public.ai_credit_refund_requests
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_req public.ai_credit_refund_requests%rowtype;
begin
  if p_token is null then raise exception 'AI_CREDIT_CLAIM_TOKEN_REQUIRED'; end if;
  select * into v_req from public.ai_credit_refund_requests where id=p_request_id for update;
  if not found then return; end if;
  if v_req.status not in ('PENDING','PROVIDER_UNKNOWN') then return; end if;
  if v_req.processing_claim_expires_at is not null
    and v_req.processing_claim_expires_at>now() then return; end if;
  update public.ai_credit_refund_requests
    set processing_claim_token=p_token,processing_claim_expires_at=now()+interval '3 minutes',
        updated_at=now()
    where id=p_request_id returning * into v_req;
  return next v_req;
end; $$;
revoke all on function public.claim_ai_credit_refund_processing(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_ai_credit_refund_processing(uuid,uuid) to service_role;

-- Recorded manual transfer can only finalize an exception that is already held for refund.
-- This RPC does NOT transfer money. Operator must verify the bank transfer independently.
create or replace function public.finish_ai_credit_manual_bank_refund(
  p_request_id uuid,p_operator_id uuid,p_bank_reference text)
returns setof public.ai_credit_refund_requests
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_req public.ai_credit_refund_requests%rowtype; v_ref_ledger uuid;
begin
  if p_operator_id is null or length(btrim(coalesce(p_bank_reference,'')))<6
     or length(p_bank_reference)>180 then raise exception 'AI_CREDIT_INVALID_MANUAL_EVIDENCE'; end if;
  select * into v_req from public.ai_credit_refund_requests where id=p_request_id;
  if not found then raise exception 'AI_CREDIT_REFUND_NOT_FOUND'; end if;
  perform 1 from public.profiles where id=v_req.profile_id and user_id=v_req.user_id for update;
  select * into v_req from public.ai_credit_refund_requests where id=p_request_id for update;
  if v_req.status='MANUAL_BANK_PAID' then return next v_req;return;end if;
  if v_req.status<>'MANUAL_BANK_REQUIRED' or not v_req.provider_final_failure
     or v_req.processing_claim_expires_at>now() then
    raise exception 'AI_CREDIT_MANUAL_REFUND_NOT_READY'; end if;
  if not exists(select 1 from public.ai_credit_lots where purchase_id=v_req.purchase_id
    and held_quantity>=v_req.refund_quantity) then raise exception 'AI_CREDIT_REFUND_HOLD_MISMATCH';end if;
  select id into v_ref_ledger from public.ai_consulting_credit_ledger
    where source_purchase_id=v_req.purchase_id and entry_type='PURCHASE';
  if v_ref_ledger is null then raise exception 'AI_CREDIT_REFUND_LEDGER_MISSING';end if;
  update public.ai_credit_lots
     set held_quantity=held_quantity-v_req.refund_quantity,
         refunded_quantity=refunded_quantity+v_req.refund_quantity
   where purchase_id=v_req.purchase_id;
  insert into public.ai_consulting_credit_ledger(user_id,profile_id,entry_type,quantity,note)
    values(v_req.user_id,v_req.profile_id,'ADJUSTMENT',v_req.refund_quantity,
      'Manual refund hold released: '||v_req.id::text);
  insert into public.ai_consulting_credit_ledger(user_id,profile_id,entry_type,quantity,reversal_of_entry_id,note)
    values(v_req.user_id,v_req.profile_id,'REFUND',-v_req.refund_quantity,v_ref_ledger,
      'Manual bank refund: '||v_req.id::text);
  update public.ai_credit_refund_requests
    set status='MANUAL_BANK_PAID',manual_reference=p_bank_reference,
        manual_completed_at=now(),updated_at=now()
    where id=v_req.id returning * into v_req;
  insert into public.ai_credit_refund_resolution_events(refund_id,operator_auth_id,resolution_action,reference_note)
    values(v_req.id,p_operator_id,'MANUAL_PAID',p_bank_reference);
  return next v_req;
end; $$;
revoke all on function public.finish_ai_credit_manual_bank_refund(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.finish_ai_credit_manual_bank_refund(uuid,uuid,text) to service_role;

-- Explicit customer-approved cancellation of the refund request (not a card cancellation).
-- Preserve 12-month expiry even if the hold crosses the expiration date.
create or replace function public.restore_ai_credit_refund_hold(
  p_request_id uuid,p_operator_id uuid,p_reason text)
returns setof public.ai_credit_refund_requests
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_req public.ai_credit_refund_requests%rowtype; v_expired boolean;
begin
  if p_operator_id is null or length(btrim(coalesce(p_reason,'')))<6
     or length(p_reason)>180 then raise exception 'AI_CREDIT_INVALID_RESTORE_REASON';end if;
  select * into v_req from public.ai_credit_refund_requests where id=p_request_id;
  if not found then raise exception 'AI_CREDIT_REFUND_NOT_FOUND';end if;
  perform 1 from public.profiles where id=v_req.profile_id and user_id=v_req.user_id for update;
  select * into v_req from public.ai_credit_refund_requests where id=p_request_id for update;
  if v_req.status='CANCELLED_NO_REFUND' then return next v_req;return;end if;
  if v_req.status not in ('REVIEW_REQUIRED','MANUAL_BANK_REQUIRED')
      or not v_req.provider_final_failure or v_req.processing_claim_expires_at>now() then
    raise exception 'AI_CREDIT_RESTORE_NOT_READY';end if;
  if not exists(select 1 from public.ai_credit_lots where purchase_id=v_req.purchase_id
     and held_quantity>=v_req.refund_quantity) then raise exception 'AI_CREDIT_REFUND_HOLD_MISMATCH';end if;
  select (expires_at is not null and expires_at<=now()) into v_expired
    from public.ai_credit_lots where purchase_id=v_req.purchase_id for update;
  update public.ai_credit_lots
    set held_quantity=held_quantity-v_req.refund_quantity,
        expired_quantity=expired_quantity+(case when v_expired then v_req.refund_quantity else 0 end)
    where purchase_id=v_req.purchase_id;
  if not v_expired then
    insert into public.ai_consulting_credit_ledger(user_id,profile_id,entry_type,quantity,note)
      values(v_req.user_id,v_req.profile_id,'ADJUSTMENT',v_req.refund_quantity,
        'Customer-approved refund withdrawal: '||v_req.id::text);
  end if;
  update public.ai_credit_refund_requests
    set status='CANCELLED_NO_REFUND',resolution_note=p_reason,updated_at=now()
    where id=v_req.id returning * into v_req;
  insert into public.ai_credit_refund_resolution_events(refund_id,operator_auth_id,resolution_action,reference_note)
    values(v_req.id,p_operator_id,'CREDIT_RESTORED',p_reason);
  return next v_req;
end; $$;
revoke all on function public.restore_ai_credit_refund_hold(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.restore_ai_credit_refund_hold(uuid,uuid,text) to service_role;

-- Atomic escalation to a manually handled refund after verified definitive card refusal.
create or replace function public.mark_ai_credit_manual_required(
  p_request_id uuid,p_operator_id uuid,p_reason text)
returns setof public.ai_credit_refund_requests
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_req public.ai_credit_refund_requests%rowtype;
begin
  if p_operator_id is null or length(btrim(coalesce(p_reason,'')))<6
     or length(p_reason)>180 then raise exception 'AI_CREDIT_MANUAL_REASON_REQUIRED';end if;
  select * into v_req from public.ai_credit_refund_requests where id=p_request_id for update;
  if not found then raise exception 'AI_CREDIT_REFUND_NOT_FOUND';end if;
  if v_req.status='MANUAL_BANK_REQUIRED' then return next v_req;return;end if;
  if v_req.status<>'REVIEW_REQUIRED' or not v_req.provider_final_failure
    or v_req.processing_claim_expires_at>now() then
    raise exception 'AI_CREDIT_PROVIDER_FAILURE_NOT_FINAL';end if;
  update public.ai_credit_refund_requests
    set status='MANUAL_BANK_REQUIRED',resolution_note=p_reason,updated_at=now()
    where id=p_request_id returning * into v_req;
  insert into public.ai_credit_refund_resolution_events(refund_id,operator_auth_id,resolution_action,reference_note)
    values(v_req.id,p_operator_id,'MANUAL_REQUIRED',p_reason);
  return next v_req;
end; $$;
revoke all on function public.mark_ai_credit_manual_required(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.mark_ai_credit_manual_required(uuid,uuid,text) to service_role;
