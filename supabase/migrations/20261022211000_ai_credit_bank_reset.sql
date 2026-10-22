-- Allow a customer to correct a submitted account only after the operator confirms
-- no bank transfer was sent. This preserves a tamper-evident audit trail.
alter table public.ai_credit_refund_resolution_events
  drop constraint if exists ai_credit_refund_resolution_events_resolution_action_check;
alter table public.ai_credit_refund_resolution_events
  add constraint ai_credit_refund_resolution_events_resolution_action_check
  check (resolution_action in ('MANUAL_REQUIRED','MANUAL_PAID','CREDIT_RESTORED','BANK_INFO_RESET'));

create or replace function public.reset_ai_credit_bank_intake(
  p_request_id uuid,p_operator_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_req public.ai_credit_refund_requests%rowtype; v_deleted integer;
begin
  if p_operator_id is null or length(btrim(coalesce(p_reason,'')))<6
    or length(p_reason)>180 then raise exception 'BANK_INTAKE_RESET_REASON_REQUIRED';end if;
  select * into v_req from public.ai_credit_refund_requests where id=p_request_id for update;
  if not found or v_req.status<>'MANUAL_BANK_REQUIRED' or not v_req.provider_final_failure
    or v_req.processing_claim_expires_at>now() then
    raise exception 'BANK_INTAKE_RESET_NOT_ALLOWED';end if;
  delete from public.ai_credit_refund_bank_details where refund_id=p_request_id;
  get diagnostics v_deleted=row_count;
  if v_deleted<>1 then raise exception 'BANK_INTAKE_RESET_NOT_FOUND';end if;
  update public.ai_credit_refund_requests set updated_at=now() where id=p_request_id;
  insert into public.ai_credit_refund_resolution_events(refund_id,operator_auth_id,resolution_action,reference_note)
    values(p_request_id,p_operator_id,'BANK_INFO_RESET',p_reason);
  return true;
end;$$;
revoke all on function public.reset_ai_credit_bank_intake(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reset_ai_credit_bank_intake(uuid,uuid,text) to service_role;
