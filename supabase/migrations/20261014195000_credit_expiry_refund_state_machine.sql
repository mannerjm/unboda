-- Refund and expiry ledger operations: one profile row serializes every mutation
-- with the existing AI answer reservation/completion RPCs.
create or replace function public.expire_due_ai_credit_lots(p_user_id uuid,p_profile_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_lot record; v_qty integer; v_total integer:=0;
begin
  perform 1 from public.profiles where id=p_profile_id and user_id=p_user_id for update;
  if not found then raise exception 'AI_CREDIT_PROFILE_NOT_FOUND'; end if;
  for v_lot in
    select purchase_id,purchased_quantity,consumed_quantity,held_quantity,refunded_quantity,expired_quantity
    from public.ai_credit_lots
    where user_id=p_user_id and profile_id=p_profile_id and expires_at is not null and expires_at<=now()
    order by expires_at,purchase_id for update
  loop
    v_qty:=v_lot.purchased_quantity-v_lot.consumed_quantity-v_lot.held_quantity
      -v_lot.refunded_quantity-v_lot.expired_quantity;
    if v_qty>0 then
      update public.ai_credit_lots set expired_quantity=expired_quantity+v_qty
      where purchase_id=v_lot.purchase_id;
      insert into public.ai_consulting_credit_ledger(user_id,profile_id,entry_type,quantity,note)
      values(p_user_id,p_profile_id,'ADJUSTMENT',-v_qty,
        'Purchased credit term expired: '||v_lot.purchase_id::text);
      v_total:=v_total+v_qty;
    end if;
  end loop;
  return v_total;
end; $$;
revoke all on function public.expire_due_ai_credit_lots(uuid,uuid) from public,anon,authenticated;
grant execute on function public.expire_due_ai_credit_lots(uuid,uuid) to service_role;

create or replace function public.begin_ai_credit_refund(p_user_id uuid,p_profile_id uuid,p_purchase_id uuid)
returns setof public.ai_credit_refund_requests
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_lot public.ai_credit_lots%rowtype;
        v_pur public.purchases%rowtype;
        v_ord public.orders%rowtype;
        v_existing public.ai_credit_refund_requests%rowtype;
        v_request public.ai_credit_refund_requests%rowtype;
        v_qty integer; v_amount integer; v_reserved integer;
begin
  perform 1 from public.profiles where id=p_profile_id and user_id=p_user_id for update;
  if not found then raise exception 'AI_CREDIT_PROFILE_NOT_FOUND'; end if;
  perform public.expire_due_ai_credit_lots(p_user_id,p_profile_id);
  select * into v_existing from public.ai_credit_refund_requests where purchase_id=p_purchase_id for update;
  if found then
    if v_existing.user_id<>p_user_id or v_existing.profile_id<>p_profile_id then
      raise exception 'AI_CREDIT_REFUND_NOT_OWNED';
    end if;
    return next v_existing; return;
  end if;
  select * into v_lot from public.ai_credit_lots
    where purchase_id=p_purchase_id and user_id=p_user_id and profile_id=p_profile_id for update;
  if not found then raise exception 'AI_CREDIT_LOT_NOT_FOUND'; end if;
  if v_lot.expires_at is not null and v_lot.expires_at<=now() then
    raise exception 'AI_CREDIT_EXPIRED_SUPPORT_REQUIRED';
  end if;
  select * into v_pur from public.purchases where id=v_lot.purchase_id;
  select * into v_ord from public.orders where id=v_pur.order_id;
  if v_ord.id is null or v_ord.user_id<>p_user_id or v_ord.profile_id<>p_profile_id
    or v_ord.status<>'paid' or v_ord.payment_provider<>'toss_ai_credit'
    or v_ord.amount<>v_lot.paid_amount_krw then
    raise exception 'AI_CREDIT_REFUND_PAID_ORDER_REQUIRED';
  end if;
  select count(*)::integer into v_reserved from public.ai_consulting_messages m
  join public.ai_consulting_threads t on t.id=m.thread_id
  where t.user_id=p_user_id and t.profile_id=p_profile_id
    and m.role='user' and m.scope_decision='ALLOW' and not m.charged
    and m.reservation_token is not null and m.reservation_released_at is null
    and m.reservation_expires_at>now();
  if v_reserved>0 then raise exception 'AI_CREDIT_ACTIVE_CONSULTATION'; end if;
  v_qty:=v_lot.purchased_quantity-v_lot.consumed_quantity-v_lot.held_quantity
    -v_lot.refunded_quantity-v_lot.expired_quantity;
  if v_qty<=0 then raise exception 'AI_CREDIT_NO_REFUNDABLE_BALANCE'; end if;
  v_amount:=(v_lot.paid_amount_krw::bigint*v_qty/v_lot.purchased_quantity)::integer;
  if v_amount<=0 then raise exception 'AI_CREDIT_ZERO_REFUND_AMOUNT'; end if;
  insert into public.ai_credit_refund_requests(purchase_id,order_id,user_id,profile_id,refund_quantity,refund_amount_krw)
  values(p_purchase_id,v_ord.id,p_user_id,p_profile_id,v_qty,v_amount) returning * into v_request;
  update public.ai_credit_lots set held_quantity=held_quantity+v_qty
  where purchase_id=p_purchase_id;
  insert into public.ai_consulting_credit_ledger(user_id,profile_id,entry_type,quantity,note)
  values(p_user_id,p_profile_id,'ADJUSTMENT',-v_qty,'Refund hold: '||v_request.id::text);
  return next v_request;
end; $$;
revoke all on function public.begin_ai_credit_refund(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.begin_ai_credit_refund(uuid,uuid,uuid) to service_role;

create or replace function public.complete_ai_credit_refund(p_request_id uuid,p_transaction_key text)
returns setof public.ai_credit_refund_requests
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_req public.ai_credit_refund_requests%rowtype; v_ref_ledger uuid;
begin
  select * into v_req from public.ai_credit_refund_requests where id=p_request_id;
  if not found then raise exception 'AI_CREDIT_REFUND_REQUEST_NOT_FOUND'; end if;
  perform 1 from public.profiles where id=v_req.profile_id and user_id=v_req.user_id for update;
  select * into v_req from public.ai_credit_refund_requests where id=p_request_id for update;
  if v_req.status='COMPLETED' then return next v_req;return;end if;
  if v_req.status not in ('PENDING','PROVIDER_UNKNOWN','REVIEW_REQUIRED') then
    raise exception 'AI_CREDIT_REFUND_INVALID_STATE';
  end if;
  if p_transaction_key is null or length(btrim(p_transaction_key))=0 then
    raise exception 'AI_CREDIT_REFUND_PROVIDER_PROOF_REQUIRED';
  end if;
  if not exists(select 1 from public.ai_credit_lots where purchase_id=v_req.purchase_id
    and held_quantity>=v_req.refund_quantity) then
    raise exception 'AI_CREDIT_REFUND_HOLD_MISMATCH';
  end if;
  select id into v_ref_ledger from public.ai_consulting_credit_ledger
  where source_purchase_id=v_req.purchase_id and entry_type='PURCHASE';
  if v_ref_ledger is null then raise exception 'AI_CREDIT_REFUND_PURCHASE_LEDGER_NOT_FOUND'; end if;
  update public.ai_credit_lots set held_quantity=held_quantity-v_req.refund_quantity,
    refunded_quantity=refunded_quantity+v_req.refund_quantity
  where purchase_id=v_req.purchase_id;
  insert into public.ai_consulting_credit_ledger(user_id,profile_id,entry_type,quantity,note)
    values(v_req.user_id,v_req.profile_id,'ADJUSTMENT',v_req.refund_quantity,
      'Refund hold released: '||v_req.id::text);
  insert into public.ai_consulting_credit_ledger
   (user_id,profile_id,entry_type,quantity,reversal_of_entry_id,note)
    values(v_req.user_id,v_req.profile_id,'REFUND',-v_req.refund_quantity,v_ref_ledger,
      'Paid refund: '||v_req.id::text);
  update public.ai_credit_refund_requests set status='COMPLETED',
    provider_transaction_key=p_transaction_key,updated_at=now()
  where id=p_request_id returning * into v_req;
  return next v_req;
end; $$;
revoke all on function public.complete_ai_credit_refund(uuid,text) from public,anon,authenticated;
grant execute on function public.complete_ai_credit_refund(uuid,text) to service_role;

-- Protection against expiry bypass through a direct grant lookup is added
-- without weakening any existing legacy entitlement.
