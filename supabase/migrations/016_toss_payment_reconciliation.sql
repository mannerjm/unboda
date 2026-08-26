-- STEP 57D-42: durable Toss payment evidence and reconciliation state.
-- This table is intentionally separate from orders so a provider-confirmed
-- payment remains identifiable even when a later purchase/entitlement write fails.
create table if not exists public.toss_payment_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  payment_key text,
  provider_order_id text,
  expected_amount integer not null,
  confirmed_amount integer,
  currency text,
  provider_status text,
  confirmation_started_at timestamptz,
  confirmed_at timestamptz,
  reconciliation_status text not null default 'pending',
  last_reconciliation_result text,
  last_reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint toss_payment_records_order_unique unique (order_id),
  constraint toss_payment_records_payment_key_unique unique (payment_key),
  constraint toss_payment_records_status_valid check (
    reconciliation_status in (
      'pending', 'confirmation_started', 'externally_confirmed',
      'paid', 'reconciliation_required', 'reconciliation_failed',
      'terminal_mismatch'
    )
  )
);

create index if not exists toss_payment_records_reconciliation_idx
  on public.toss_payment_records (reconciliation_status, updated_at);
create index if not exists toss_payment_records_provider_order_idx
  on public.toss_payment_records (provider_order_id);

alter table public.toss_payment_records enable row level security;

create policy "toss_payment_records_select_own"
  on public.toss_payment_records
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = toss_payment_records.order_id
        and orders.user_id = auth.uid()
    )
  );

revoke insert, update, delete on public.toss_payment_records from anon, authenticated;