-- Phase 3B: Purchase / Order / Entitlement server persistence
--
-- Design notes:
-- * product_id / resource_id store the CANONICAL premium productId as TEXT.
--   The canonical source of truth stays in app/lib/premiumProductRegistry.ts
--   (getCanonicalPremiumProductId / getPremiumProduct). The DB intentionally
--   does not enumerate product IDs so the registry can evolve without migrations.
-- * RLS: authenticated users may SELECT only their own rows. There is NO
--   INSERT / UPDATE / DELETE policy for `authenticated`, so the browser
--   publishable key cannot forge an order, purchase or entitlement.
--   All writes go through server routes using the service_role key.

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  amount integer not null,
  status text not null default 'pending',
  payment_provider text,
  transaction_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,

  constraint orders_product_id_not_blank check (length(btrim(product_id)) > 0),
  constraint orders_amount_non_negative check (amount >= 0),
  -- aligned with PaymentStatus in app/lib/payment.ts
  constraint orders_status_valid check (status in ('pending', 'paid', 'failed', 'canceled')),
  constraint orders_paid_requires_paid_at check (status <> 'paid' or paid_at is not null)
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_user_product_idx on public.orders (user_id, product_id);
create index if not exists orders_status_idx on public.orders (status);

-- ---------------------------------------------------------------------------
-- purchases
-- ---------------------------------------------------------------------------
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  order_id uuid not null references public.orders (id) on delete cascade,
  purchased_at timestamptz not null default now(),

  constraint purchases_product_id_not_blank check (length(btrim(product_id)) > 0),
  -- one purchase per paid order => mock-confirm replay is idempotent
  constraint purchases_order_id_unique unique (order_id)
);

create index if not exists purchases_user_id_idx on public.purchases (user_id);
create index if not exists purchases_user_product_idx on public.purchases (user_id, product_id);

-- ---------------------------------------------------------------------------
-- entitlements
-- ---------------------------------------------------------------------------
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resource_id text not null,
  resource_type text not null default 'paid_analysis',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint entitlements_resource_id_not_blank check (length(btrim(resource_id)) > 0),
  -- a user can only hold one entitlement row per resource
  constraint entitlements_user_resource_unique unique (user_id, resource_id, resource_type)
);

create index if not exists entitlements_user_id_idx on public.entitlements (user_id);
create index if not exists entitlements_lookup_idx
  on public.entitlements (user_id, resource_id, resource_type, is_active);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.purchases enable row level security;
alter table public.entitlements enable row level security;

-- Read-only, self-scoped policies for authenticated users.
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "purchases_select_own" on public.purchases;
create policy "purchases_select_own"
  on public.purchases
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
  on public.entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE policies are defined on purpose.
-- RLS denies by default, so anon/authenticated clients cannot write.
-- Server routes use the service_role key (which bypasses RLS) and always
-- derive user_id from the verified Supabase session, never from request body.

revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.purchases from anon, authenticated;
revoke insert, update, delete on public.entitlements from anon, authenticated;
