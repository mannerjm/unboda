-- STEP 57D-51C-A: Server-side operator authorization and audit foundation.
-- No operator rows are seeded here. Bootstrap remains an owner-controlled procedure.

create table if not exists public.operator_roles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  role text not null,
  is_active boolean not null default true,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operator_roles_auth_user_unique unique (auth_user_id),
  constraint operator_roles_role_valid check (role in ('CS_OPERATOR')),
  constraint operator_roles_revocation_consistent check (
    (is_active and revoked_at is null) or (not is_active and revoked_at is not null)
  )
);

create index if not exists operator_roles_active_auth_user_idx
  on public.operator_roles (auth_user_id)
  where is_active and revoked_at is null;

create or replace function public.set_operator_roles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists operator_roles_set_updated_at on public.operator_roles;
create trigger operator_roles_set_updated_at
  before update on public.operator_roles
  for each row execute function public.set_operator_roles_updated_at();

create table if not exists public.operator_audit_events (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operator_roles(id) on delete restrict,
  operator_auth_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_reference_hash text not null,
  outcome text not null,
  correlation_id uuid not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint operator_audit_events_action_valid check (action in ('CUSTOMER_LOOKUP', 'ORDER_LOOKUP', 'FAILURE_QUEUE_VIEW')),
  constraint operator_audit_events_target_valid check (target_type in ('ACCOUNT', 'ORDER', 'FAILURE_QUEUE')),
  constraint operator_audit_events_outcome_valid check (outcome in ('SUCCESS', 'NO_RESULT')),
  constraint operator_audit_events_reference_hash_valid check (char_length(target_reference_hash) = 64),
  constraint operator_audit_events_reason_bounded check (reason is null or char_length(reason) between 1 and 240)
);

create index if not exists operator_audit_events_operator_created_idx
  on public.operator_audit_events (operator_id, created_at desc);

create index if not exists operator_audit_events_target_created_idx
  on public.operator_audit_events (target_type, target_reference_hash, created_at desc);

alter table public.operator_roles enable row level security;
alter table public.operator_audit_events enable row level security;

revoke all on public.operator_roles from anon, authenticated;
revoke all on public.operator_audit_events from anon, authenticated;
grant select, insert, update, delete on public.operator_roles to service_role;
grant select, insert, update, delete on public.operator_audit_events to service_role;