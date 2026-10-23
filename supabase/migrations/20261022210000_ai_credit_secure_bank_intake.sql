-- Secure one-time bank account intake for card refunds definitively rejected by provider.
-- Ciphertext is encrypted in application code with an independent Vercel production secret.
-- Neither customer nor anon roles may read this table through PostgREST.
create table if not exists public.ai_credit_refund_bank_details (
  refund_id uuid primary key references public.ai_credit_refund_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_code text not null check (bank_code ~ '^[A-Z]{2,16}$'),
  account_last4 text not null check (account_last4 ~ '^[0-9]{4}$'),
  encrypted_details text not null check (length(encrypted_details) between 60 and 2048),
  submitted_at timestamptz not null default now()
);
create index if not exists ai_credit_refund_bank_details_user_idx
 on public.ai_credit_refund_bank_details(user_id);
alter table public.ai_credit_refund_bank_details enable row level security;
revoke all on public.ai_credit_refund_bank_details from public,anon,authenticated;
grant select,insert,delete on public.ai_credit_refund_bank_details to service_role;

create table if not exists public.ai_credit_refund_bank_access_audit (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null references public.ai_credit_refund_requests(id) on delete restrict,
  operator_auth_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check (length(reason) between 6 and 180),
  accessed_at timestamptz not null default now()
);
create index if not exists ai_credit_refund_bank_access_audit_refund_idx
 on public.ai_credit_refund_bank_access_audit(refund_id,accessed_at desc);
alter table public.ai_credit_refund_bank_access_audit enable row level security;
revoke all on public.ai_credit_refund_bank_access_audit from public,anon,authenticated;
grant select,insert on public.ai_credit_refund_bank_access_audit to service_role;

-- Safety invariant: customer can submit only ONCE, only to their already
-- manually escalated refund. Lock the refund row to serialize with finalization.
create or replace function public.validate_ai_credit_bank_intake()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid;v_status text;v_final boolean;
begin
  select user_id,status,provider_final_failure into v_user,v_status,v_final
  from public.ai_credit_refund_requests where id=new.refund_id for update;
  if not found or v_user<>new.user_id or v_status<>'MANUAL_BANK_REQUIRED' or not v_final then
    raise exception 'BANK_REFUND_INTAKE_NOT_ELIGIBLE';
  end if;
  return new;
end; $$;
revoke all on function public.validate_ai_credit_bank_intake() from public,anon,authenticated;
create trigger validate_ai_credit_bank_intake_before_insert
 before insert on public.ai_credit_refund_bank_details
 for each row execute function public.validate_ai_credit_bank_intake();

-- Tell the existing owner exception alert generator that account information arrived.
create or replace function public.touch_ai_credit_refund_after_bank_intake()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.ai_credit_refund_requests set updated_at=now()
  where id=new.refund_id;
  return new;
end; $$;
revoke all on function public.touch_ai_credit_refund_after_bank_intake() from public,anon,authenticated;
create trigger touch_ai_credit_refund_after_bank_intake
 after insert on public.ai_credit_refund_bank_details
 for each row execute function public.touch_ai_credit_refund_after_bank_intake();

-- Immediately discard the encrypted account and name when the refund finishes
-- or the customer withdraws. Retain only non-account financial/audit metadata.
create or replace function public.purge_ai_credit_bank_after_resolution()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if old.status is distinct from new.status and
    new.status in ('MANUAL_BANK_PAID','COMPLETED','CANCELLED_NO_REFUND') then
    delete from public.ai_credit_refund_bank_details where refund_id=new.id;
  end if;
  return new;
end; $$;
revoke all on function public.purge_ai_credit_bank_after_resolution() from public,anon,authenticated;
create trigger purge_ai_credit_bank_after_resolution
 after update of status on public.ai_credit_refund_requests
 for each row execute function public.purge_ai_credit_bank_after_resolution();

-- Strong DB boundary: manual 'paid' cannot be marked before customer submitted
-- bank information, and financial ledger + refund state transition remain atomic.
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
  if not exists(select 1 from public.ai_credit_refund_bank_details where refund_id=v_req.id)
    then raise exception 'AI_CREDIT_REFUND_ACCOUNT_NOT_SUBMITTED';end if;
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
