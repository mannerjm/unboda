-- Phase 7C: Profile-scoped purchase persistence
--
-- Development-only data policy: Phase 3B order, purchase and entitlement rows
-- have no reliable profile association, so clear only those mock rows before
-- enforcing profile_id as NOT NULL. Existing public.profiles rows are retained.

truncate table public.entitlements, public.purchases, public.orders;

-- ---------------------------------------------------------------------------
-- orders: immutable purchase target selected at checkout
-- ---------------------------------------------------------------------------
alter table public.orders
  add column profile_id uuid not null
    constraint orders_profile_id_fkey
    references public.profiles (id)
    on delete restrict;

create index if not exists orders_profile_id_idx
  on public.orders (profile_id);

-- ---------------------------------------------------------------------------
-- purchases: retain the profile snapshot without requiring an order join
-- ---------------------------------------------------------------------------
alter table public.purchases
  add column profile_id uuid not null
    constraint purchases_profile_id_fkey
    references public.profiles (id)
    on delete restrict;

create index if not exists purchases_profile_id_idx
  on public.purchases (profile_id);

-- purchases_order_id_unique remains unchanged: one purchase per paid order.

-- ---------------------------------------------------------------------------
-- entitlements: active paid-analysis rights are profile-scoped
-- ---------------------------------------------------------------------------
alter table public.entitlements
  add column profile_id uuid not null
    constraint entitlements_profile_id_fkey
    references public.profiles (id)
    on delete restrict,
  add column purchase_id uuid
    constraint entitlements_purchase_id_fkey
    references public.purchases (id)
    on delete set null,
  add column source text not null default 'purchase',
  add constraint entitlements_source_valid check (
    source in ('purchase', 'subscription', 'credit', 'grant')
  );

-- Exact Phase 3B constraint name from 001_phase3b_purchase_persistence.sql.
alter table public.entitlements
  drop constraint entitlements_user_resource_unique,
  add constraint entitlements_user_profile_resource_unique unique (
    user_id,
    profile_id,
    resource_id,
    resource_type
  );

-- Replace the account-only lookup index with the profile-scoped access key.
drop index if exists public.entitlements_lookup_idx;
create index if not exists entitlements_lookup_idx
  on public.entitlements (
    user_id,
    profile_id,
    resource_id,
    resource_type,
    is_active
  );

create index if not exists entitlements_profile_id_idx
  on public.entitlements (profile_id);

create index if not exists entitlements_purchase_id_idx
  on public.entitlements (purchase_id)
  where purchase_id is not null;

-- Existing user_id-based RLS SELECT policies and server-only write model remain
-- unchanged. The next server/API implementation must verify that profile_id
-- belongs to the authenticated user before writing any row.
