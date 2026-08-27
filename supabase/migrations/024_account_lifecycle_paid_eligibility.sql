-- STEP 57D-46C-1: provider-neutral account lifecycle foundation.
-- Analysis profiles and financial records retain their existing ownership/FKs.
create table if not exists public.account_lifecycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  generation integer not null default 1,
  status text not null default 'ACTIVE',
  paid_eligibility_status text not null default 'UNVERIFIED',
  paid_eligibility_method text,
  paid_eligibility_provider text,
  paid_eligible_at timestamptz,
  paid_eligibility_policy_version text,
  paid_eligibility_invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_lifecycles_generation_positive check (generation >= 1),
  constraint account_lifecycles_user_generation_unique unique (user_id, generation),
  constraint account_lifecycles_status_valid check (status in ('ACTIVE', 'DELETION_REQUESTED', 'CLOSED')),
  constraint account_lifecycles_eligibility_valid check (paid_eligibility_status in ('UNVERIFIED', 'VERIFIED_ADULT', 'REVOKED')),
  constraint account_lifecycles_eligibility_method_valid check (paid_eligibility_method is null or paid_eligibility_method in ('DECLARATION', 'EXTERNAL_PROVIDER'))
);

create index if not exists account_lifecycles_status_idx on public.account_lifecycles(status);
create index if not exists account_lifecycles_eligibility_idx on public.account_lifecycles(paid_eligibility_status);
create unique index if not exists account_lifecycles_one_current_idx
  on public.account_lifecycles(user_id)
  where status <> 'CLOSED';

create or replace function public.prevent_account_lifecycle_generation_change()
returns trigger
language plpgsql
as $$
begin
  if new.generation <> old.generation then
    raise exception 'account lifecycle generation is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists account_lifecycles_generation_immutable on public.account_lifecycles;
create trigger account_lifecycles_generation_immutable
  before update on public.account_lifecycles
  for each row execute function public.prevent_account_lifecycle_generation_change();

create or replace function public.set_account_lifecycles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists account_lifecycles_set_updated_at on public.account_lifecycles;
create trigger account_lifecycles_set_updated_at
  before update on public.account_lifecycles
  for each row execute function public.set_account_lifecycles_updated_at();

alter table public.account_lifecycles enable row level security;
drop policy if exists "account_lifecycles_select_own" on public.account_lifecycles;
create policy "account_lifecycles_select_own"
  on public.account_lifecycles for select to authenticated
  using (auth.uid() = user_id);
revoke all on public.account_lifecycles from anon, authenticated;
grant select on public.account_lifecycles to authenticated;
grant select, insert, update, delete on public.account_lifecycles to service_role;
