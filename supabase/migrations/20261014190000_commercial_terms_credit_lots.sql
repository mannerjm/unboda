-- Commercial V2: additive, inert until commercial_policy_activation.effective_at is set.
-- Existing purchases have NULL expiry and retain original access rights.
create table if not exists public.commercial_policy_activation (
  singleton boolean primary key default true check (singleton),
  effective_at timestamptz
);
insert into public.commercial_policy_activation(singleton,effective_at) values(true,null)
on conflict(singleton) do nothing;
alter table public.commercial_policy_activation enable row level security;
revoke all on public.commercial_policy_activation from public, anon, authenticated;
grant select on public.commercial_policy_activation to service_role;

alter table public.purchases add column if not exists service_terms_version text not null default 'legacy';
alter table public.purchases add column if not exists service_expires_at timestamptz;
alter table public.entitlements add column if not exists service_expires_at timestamptz;

create or replace function public.stamp_paid_purchase_terms()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_effective_at timestamptz;
begin
  select effective_at into v_effective_at from public.commercial_policy_activation where singleton=true;
  if v_effective_at is not null and new.purchased_at>=v_effective_at then
    new.service_terms_version:='12_months';
    new.service_expires_at:=new.purchased_at+interval '12 months';
  else
    new.service_terms_version:='legacy';
    new.service_expires_at:=null;
  end if;
  return new;
end; $$;
revoke all on function public.stamp_paid_purchase_terms() from public,anon,authenticated;
create trigger stamp_paid_purchase_terms_before_insert
before insert on public.purchases for each row execute function public.stamp_paid_purchase_terms();

create or replace function public.stamp_paid_entitlement_terms()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if new.purchase_id is not null then
    select service_expires_at into new.service_expires_at from public.purchases
    where id=new.purchase_id and user_id=new.user_id and profile_id=new.profile_id;
  end if;
  return new;
end; $$;
revoke all on function public.stamp_paid_entitlement_terms() from public,anon,authenticated;
create trigger stamp_paid_entitlement_terms_before_write
before insert or update of purchase_id on public.entitlements
for each row execute function public.stamp_paid_entitlement_terms();

create index if not exists entitlements_commercial_expires_idx
on public.entitlements(service_expires_at) where is_active=true and service_expires_at is not null;

-- Purchase-scoped buckets. No purchased questions or prior messages are deleted.
create table if not exists public.ai_credit_lots (
  purchase_id uuid primary key references public.purchases(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  bundle_id text not null,
  paid_amount_krw integer not null check(paid_amount_krw > 0),
  purchased_quantity integer not null check(purchased_quantity>0),
  consumed_quantity integer not null default 0 check(consumed_quantity>=0),
  held_quantity integer not null default 0 check(held_quantity>=0),
  refunded_quantity integer not null default 0 check(refunded_quantity>=0),
  expired_quantity integer not null default 0 check(expired_quantity>=0),
  purchased_at timestamptz not null,
  expires_at timestamptz,
  constraint ai_credit_lots_qty_check check(
    consumed_quantity+held_quantity+refunded_quantity+expired_quantity<=purchased_quantity
  )
);
create index if not exists ai_credit_lots_profile_fifo_idx
on public.ai_credit_lots(user_id,profile_id,expires_at,purchased_at,purchase_id);
alter table public.ai_credit_lots enable row level security;
revoke all on public.ai_credit_lots from public,anon,authenticated;
grant select,insert,update on public.ai_credit_lots to service_role;

create table if not exists public.ai_credit_refund_requests (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null unique references public.purchases(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  refund_quantity integer not null check(refund_quantity>0),
  refund_amount_krw integer not null check(refund_amount_krw>0),
  status text not null default 'PENDING'
    check(status in ('PENDING','PROVIDER_UNKNOWN','COMPLETED','REVIEW_REQUIRED','MANUAL_BANK_REQUIRED','MANUAL_BANK_PAID')),
  idempotency_key text not null unique default gen_random_uuid()::text,
  provider_transaction_key text,
  provider_error text,
  retry_count integer not null default 0,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_credit_refund_requests_status_idx
on public.ai_credit_refund_requests(status,next_retry_at);
alter table public.ai_credit_refund_requests enable row level security;
revoke all on public.ai_credit_refund_requests from public,anon,authenticated;
grant select,insert,update on public.ai_credit_refund_requests to service_role;

-- Records each successful credit purchase in an isolated lot. The ledger remains
-- the authoritative balance for existing consultation RPCs until rollout.
create or replace function public.sync_ai_credit_lot_from_ledger()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_purchase public.purchases%rowtype; v_order public.orders%rowtype;
        v_lot uuid;
begin
  if new.entry_type='PURCHASE' then
    select * into v_purchase from public.purchases where id=new.source_purchase_id;
    if not found then raise exception 'AI_CREDIT_PURCHASE_NOT_FOUND'; end if;
    select * into v_order from public.orders where id=v_purchase.order_id;
    if not found or v_order.user_id<>new.user_id or v_order.profile_id<>new.profile_id then
      raise exception 'AI_CREDIT_LOT_OWNER_MISMATCH';
    end if;
    insert into public.ai_credit_lots
    (purchase_id,user_id,profile_id,bundle_id,paid_amount_krw,purchased_quantity,purchased_at,expires_at)
    values(v_purchase.id,new.user_id,new.profile_id,new.bundle_id,v_order.amount,new.quantity,
      v_purchase.purchased_at,v_purchase.service_expires_at)
    on conflict(purchase_id) do nothing;
  elsif new.entry_type='CONSUME' then
    select purchase_id into v_lot from public.ai_credit_lots
    where user_id=new.user_id and profile_id=new.profile_id
      and purchased_quantity-consumed_quantity-held_quantity-refunded_quantity-expired_quantity>0
    order by expires_at asc nulls last,purchased_at asc,purchase_id asc limit 1 for update;
    if v_lot is null then raise exception 'AI_CREDIT_LOT_BALANCE_MISMATCH'; end if;
    update public.ai_credit_lots set consumed_quantity=consumed_quantity+1 where purchase_id=v_lot;
  end if;
  return new;
end; $$;
revoke all on function public.sync_ai_credit_lot_from_ledger() from public,anon,authenticated;

-- Backfill first, preserving old purchases as non-expiring.
insert into public.ai_credit_lots
(purchase_id,user_id,profile_id,bundle_id,paid_amount_krw,purchased_quantity,purchased_at,expires_at)
select p.id,l.user_id,l.profile_id,l.bundle_id,o.amount,l.quantity,p.purchased_at,p.service_expires_at
from public.ai_consulting_credit_ledger l
join public.purchases p on p.id=l.source_purchase_id
join public.orders o on o.id=p.order_id
where l.entry_type='PURCHASE'
on conflict(purchase_id) do nothing;
do $$
declare v_item record; v_lot uuid;
begin
 for v_item in select user_id,profile_id,id from public.ai_consulting_credit_ledger
 where entry_type='CONSUME' order by created_at,id loop
   select purchase_id into v_lot from public.ai_credit_lots
   where user_id=v_item.user_id and profile_id=v_item.profile_id
     and purchased_quantity-consumed_quantity-held_quantity-refunded_quantity-expired_quantity>0
   order by expires_at asc nulls last,purchased_at asc,purchase_id asc limit 1 for update;
   if v_lot is null then raise exception 'AI_CREDIT_BACKFILL_BALANCE_MISMATCH'; end if;
   update public.ai_credit_lots set consumed_quantity=consumed_quantity+1 where purchase_id=v_lot;
 end loop;
end $$;

create trigger sync_ai_credit_lot_ledger_after_insert
after insert on public.ai_consulting_credit_ledger
for each row execute function public.sync_ai_credit_lot_from_ledger();

-- Invariant: any drift between lots and the legacy credit ledger is a blocking error.
-- Refunds and expirations must update both ledgers in a single DB transaction.
