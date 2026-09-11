-- NICE identity verification sessions.
-- Stores only account binding, replay/idempotency state, normalized outcomes,
-- and an opaque gateway-sealed provider context. Raw NICE identity result fields
-- (name, birthdate, phone, CI/DI, etc.) are never persisted here.
create table if not exists public.identity_verification_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'NICE',
  state_hash text not null,
  provider_context text,
  status text not null default 'PENDING',
  outcome_code text,
  evidence_version text,
  policy_version text,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint identity_verification_sessions_provider_valid check (provider = 'NICE'),
  constraint identity_verification_sessions_state_hash_valid check (state_hash ~ '^[0-9a-f]{64}$'),
  constraint identity_verification_sessions_state_hash_unique unique (state_hash),
  constraint identity_verification_sessions_status_valid check (
    status in ('PENDING', 'PROCESSING', 'VERIFIED_ADULT', 'UNDERAGE', 'FAILED', 'CANCELLED', 'SUPERSEDED')
  ),
  constraint identity_verification_sessions_outcome_valid check (
    outcome_code is null or outcome_code in ('ADULT', 'UNDERAGE', 'PROVIDER_ERROR', 'ACCOUNT_NOT_ELIGIBLE', 'CANCELLED', 'SUPERSEDED')
  )
);

create index if not exists identity_verification_sessions_user_created_idx
  on public.identity_verification_sessions(user_id, created_at desc);

create index if not exists identity_verification_sessions_pending_expiry_idx
  on public.identity_verification_sessions(expires_at)
  where status in ('PENDING', 'PROCESSING');

alter table public.identity_verification_sessions enable row level security;

-- Verification sessions are server-only. Browser clients receive no direct table access.
revoke all on public.identity_verification_sessions from anon, authenticated;
grant select, insert, update, delete on public.identity_verification_sessions to service_role;
