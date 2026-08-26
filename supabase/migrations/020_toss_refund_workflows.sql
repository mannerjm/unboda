-- STEP 57D-45A: full Toss cancellation workflow evidence.
alter table public.entitlements
  add column if not exists revoked_at timestamptz,
  add column if not exists revocation_reason text;

create table if not exists public.refund_workflows (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_record_id uuid not null references public.toss_payment_records(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  product_id text not null,
  requested_amount integer not null,
  currency text not null default 'KRW',
  reason_category text not null,
  reason_text text,
  status text not null default 'REFUND_REQUESTED',
  provider_status text,
  provider_cancellation_reference text,
  requested_at timestamptz not null default now(),
  processing_started_at timestamptz,
  provider_confirmed_at timestamptz,
  completed_at timestamptz,
  entitlement_revoked_at timestamptz,
  retry_count integer not null default 0,
  max_retry_count integer not null default 5,
  next_retry_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  last_provider_http_status integer,
  last_provider_error_code text,
  last_provider_error_message text,
  last_retryability text,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refund_workflows_status_valid check (status in ('REFUND_REQUESTED','REFUND_PROCESSING','REFUND_FAILED_RETRYING','REFUND_COMPLETED','OWNER_REVIEW_REQUIRED')),
  constraint refund_workflows_reason_valid check (reason_category in ('CHANGE_OF_MIND','CONTENT_NOT_PROVIDED','MATERIAL_DEFECT','MATERIALLY_DIFFERENT','OWNER_OVERRIDE')),
  constraint refund_workflows_retryability_valid check (last_retryability is null or last_retryability in ('RETRYABLE','NON_RETRYABLE','OWNER_ESCALATION_REQUIRED')),
  constraint refund_workflows_retry_budget_valid check (retry_count >= 0 and max_retry_count between 1 and 10),
  constraint refund_workflows_full_amount check (requested_amount > 0)
);

create unique index if not exists refund_workflows_one_active_order
  on public.refund_workflows(order_id)
  where status <> 'REFUND_COMPLETED';
create unique index if not exists refund_workflows_provider_reference_unique
  on public.refund_workflows(provider_cancellation_reference)
  where provider_cancellation_reference is not null;
create index if not exists refund_workflows_retry_idx
  on public.refund_workflows(next_retry_at, status);

alter table public.refund_workflows enable row level security;
create policy "refund_workflows_select_own"
  on public.refund_workflows for select to authenticated
  using (auth.uid() = user_id);
revoke insert, update, delete on public.refund_workflows from anon, authenticated;
grant select, insert, update, delete on public.refund_workflows to service_role;