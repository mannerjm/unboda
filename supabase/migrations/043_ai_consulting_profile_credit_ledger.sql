-- AI Consulting Phase 10: profile-scoped commercial credit ledger foundation.
--
-- This migration intentionally does NOT issue credits and does NOT connect a
-- checkout provider. It creates an auditable shared balance for a profile so
-- unused paid questions can be used later against any separately purchased,
-- eligible paid-analysis product/edition for the same profile.

create table if not exists public.ai_consulting_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source_purchase_id uuid references public.purchases(id) on delete restrict,
  entry_type text not null,
  quantity integer not null,
  bundle_id text,
  related_message_id uuid references public.ai_consulting_messages(id) on delete restrict,
  reversal_of_entry_id uuid references public.ai_consulting_credit_ledger(id) on delete restrict,
  note text,
  created_at timestamptz not null default now(),
  constraint ai_consulting_credit_ledger_entry_type_check
    check (entry_type in ('PURCHASE', 'CONSUME', 'REFUND', 'ADJUSTMENT')),
  constraint ai_consulting_credit_ledger_quantity_nonzero check (quantity <> 0),
  constraint ai_consulting_credit_ledger_sign_check check (
    (entry_type = 'PURCHASE' and quantity > 0)
    or (entry_type = 'CONSUME' and quantity = -1)
    or (entry_type = 'REFUND' and quantity < 0)
    or (entry_type = 'ADJUSTMENT')
  ),
  constraint ai_consulting_credit_ledger_purchase_fields_check check (
    entry_type <> 'PURCHASE'
    or (source_purchase_id is not null and bundle_id is not null)
  ),
  constraint ai_consulting_credit_ledger_consume_fields_check check (
    entry_type <> 'CONSUME'
    or related_message_id is not null
  ),
  constraint ai_consulting_credit_ledger_refund_fields_check check (
    entry_type <> 'REFUND'
    or reversal_of_entry_id is not null
  )
);

create unique index if not exists ai_consulting_credit_ledger_purchase_uidx
  on public.ai_consulting_credit_ledger (source_purchase_id)
  where entry_type = 'PURCHASE';

create unique index if not exists ai_consulting_credit_ledger_consume_uidx
  on public.ai_consulting_credit_ledger (related_message_id)
  where entry_type = 'CONSUME';

create unique index if not exists ai_consulting_credit_ledger_reversal_uidx
  on public.ai_consulting_credit_ledger (reversal_of_entry_id)
  where reversal_of_entry_id is not null;

create index if not exists ai_consulting_credit_ledger_profile_idx
  on public.ai_consulting_credit_ledger (user_id, profile_id, created_at, id);

alter table public.ai_consulting_credit_ledger enable row level security;

revoke all on table public.ai_consulting_credit_ledger from public, anon, authenticated;
grant select, insert on table public.ai_consulting_credit_ledger to service_role;

create or replace function public.get_ai_consulting_credit_balance(
  p_user_id uuid,
  p_profile_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(l.quantity), 0)::integer
  from public.ai_consulting_credit_ledger l
  where l.user_id = p_user_id
    and l.profile_id = p_profile_id;
$$;

revoke all on function public.get_ai_consulting_credit_balance(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_ai_consulting_credit_balance(uuid, uuid)
  to service_role;

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
  v_expected_price integer;
begin
  if p_source_purchase_id is null then
    raise exception 'AI_CONSULTING_CREDIT_PURCHASE_REQUIRED';
  end if;

  if p_bundle_id = 'ai-consulting-3' then
    if p_quantity <> 3 then
      raise exception 'AI_CONSULTING_CREDIT_BUNDLE_QUANTITY_MISMATCH';
    end if;
    v_expected_price := 2900;
  elsif p_bundle_id = 'ai-consulting-5' then
    if p_quantity <> 5 then
      raise exception 'AI_CONSULTING_CREDIT_BUNDLE_QUANTITY_MISMATCH';
    end if;
    v_expected_price := 4900;
  elsif p_bundle_id = 'ai-consulting-10' then
    if p_quantity <> 10 then
      raise exception 'AI_CONSULTING_CREDIT_BUNDLE_QUANTITY_MISMATCH';
    end if;
    v_expected_price := 8900;
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

  -- Fail closed at the database boundary. A credit purchase must represent the
  -- exact AI bundle, exact profile/user, exact configured amount, and an order
  -- that the existing payment lifecycle has already finalized as paid.
  if v_purchase.user_id is null
    or v_purchase.profile_id is null
    or v_purchase.product_id <> p_bundle_id
    or v_order.user_id <> v_purchase.user_id
    or v_order.profile_id <> v_purchase.profile_id
    or v_order.product_id <> p_bundle_id
    or v_order.amount <> v_expected_price
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
