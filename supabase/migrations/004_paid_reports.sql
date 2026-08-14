-- Phase 8B: Profile-scoped paid report persistence
--
-- A paid report is logically identified by user + profile + canonical product.
-- It stores the generated V3 JSON so refreshes and other devices can reuse it.

create table if not exists public.paid_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  product_id text not null,
  purchase_id uuid references public.purchases (id) on delete set null,
  status text not null default 'generating',
  content jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint paid_reports_product_id_not_blank check (length(btrim(product_id)) > 0),
  constraint paid_reports_status_valid check (status in ('generating', 'completed', 'failed')),
  constraint paid_reports_completed_requires_content check (
    status <> 'completed' or content is not null
  ),
  constraint paid_reports_user_profile_product_unique unique (
    user_id,
    profile_id,
    product_id
  )
);

create index if not exists paid_reports_profile_product_idx
  on public.paid_reports (profile_id, product_id, status);

create index if not exists paid_reports_purchase_id_idx
  on public.paid_reports (purchase_id)
  where purchase_id is not null;

create or replace function public.set_paid_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists paid_reports_set_updated_at on public.paid_reports;
create trigger paid_reports_set_updated_at
  before update on public.paid_reports
  for each row
  execute function public.set_paid_reports_updated_at();

alter table public.paid_reports enable row level security;

drop policy if exists "paid_reports_select_own" on public.paid_reports;
create policy "paid_reports_select_own"
  on public.paid_reports
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Browser clients may read only their own reports. Writes stay server-only.
revoke insert, update, delete on public.paid_reports from anon, authenticated;
