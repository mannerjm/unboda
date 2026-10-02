-- AI consulting credit pricing update.
-- Current launch prices:
--   3 questions: 2,900 KRW
--   5 questions: 4,500 KRW
--  10 questions: 8,500 KRW
--
-- The database still accepts the immediately previous 5/10-pack prices only
-- so an order created just before the rollout can finish safely. New orders are
-- server-authoritative and use the current commercial policy prices.

create or replace function public.record_ai_consulting_credit_purchase(
  p_source_purchase_id uuid,
  p_bundle_id text,
  p_quantity integer
)
returns setof public.ai_consulting_credit_ledger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
  v_order public.orders%rowtype;
  v_existing public.ai_consulting_credit_ledger%rowtype;
  v_created public.ai_consulting_credit_ledger%rowtype;
begin
  if p_source_purchase_id is null then
    raise exception 'AI_CONSULTING_CREDIT_PURCHASE_REQUIRED';
  end if;

  if p_bundle_id = 'ai-consulting-3' then
    if p_quantity <> 3 then
      raise exception 'AI_CONSULTING_CREDIT_BUNDLE_QUANTITY_MISMATCH';
    end if;
  elsif p_bundle_id = 'ai-consulting-5' then
    if p_quantity <> 5 then
      raise exception 'AI_CONSULTING_CREDIT_BUNDLE_QUANTITY_MISMATCH';
    end if;
  elsif p_bundle_id = 'ai-consulting-10' then
    if p_quantity <> 10 then
      raise exception 'AI_CONSULTING_CREDIT_BUNDLE_QUANTITY_MISMATCH';
    end if;
  else
    raise exception 'AI_CONSULTING_CREDIT_BUNDLE_INVALID';
  end if;

  select * into v_purchase
  from public.purchases
  where id = p_source_purchase_id
  for update;

  if not found then
    raise exception 'AI_CONSULTING_CREDIT_PURCHASE_NOT_FOUND';
  end if;

  select * into v_order
  from public.orders
  where id = v_purchase.order_id
  for share;

  if not found then
    raise exception 'AI_CONSULTING_CREDIT_ORDER_NOT_FOUND';
  end if;

  if v_purchase.user_id is null
    or v_purchase.profile_id is null
    or v_purchase.product_id <> p_bundle_id
    or v_order.user_id <> v_purchase.user_id
    or v_order.profile_id <> v_purchase.profile_id
    or v_order.product_id <> p_bundle_id
    or not (
      (p_bundle_id = 'ai-consulting-3' and v_order.amount = 2900)
      or (p_bundle_id = 'ai-consulting-5' and v_order.amount in (4500, 4900))
      or (p_bundle_id = 'ai-consulting-10' and v_order.amount in (8500, 8900))
    )
    or v_order.status <> 'paid' then
    raise exception 'AI_CONSULTING_CREDIT_PURCHASE_BOUNDARY_INVALID';
  end if;

  select * into v_existing
  from public.ai_consulting_credit_ledger
  where source_purchase_id = p_source_purchase_id
    and entry_type = 'PURCHASE'
  for update;

  if found then
    if v_existing.user_id <> v_purchase.user_id
      or v_existing.profile_id <> v_purchase.profile_id
      or v_existing.bundle_id <> p_bundle_id
      or v_existing.quantity <> p_quantity then
      raise exception 'AI_CONSULTING_CREDIT_PURCHASE_REPLAY_MISMATCH';
    end if;
    return next v_existing;
    return;
  end if;

  insert into public.ai_consulting_credit_ledger (
    user_id, profile_id, source_purchase_id, entry_type, quantity, bundle_id
  ) values (
    v_purchase.user_id, v_purchase.profile_id, v_purchase.id,
    'PURCHASE', p_quantity, p_bundle_id
  ) returning * into v_created;

  return next v_created;
end;
$$;

revoke all on function public.record_ai_consulting_credit_purchase(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.record_ai_consulting_credit_purchase(uuid, text, integer)
  to service_role;
