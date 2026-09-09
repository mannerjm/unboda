-- AI Consulting Phase 12B: durable operational observability.
--
-- This table records only execution metadata for already-authorized AI consulting
-- attempts. It stores no question/answer text and is never client-readable.
-- Observability writes must not grant access, reserve/consume credits, or change
-- the answer lifecycle. Existing message + ledger rows remain the commercial
-- source of truth.

create table if not exists public.ai_consulting_attempts (
  id uuid primary key default gen_random_uuid(),
  user_message_id uuid not null,
  thread_id uuid not null,
  user_id uuid not null,
  profile_id uuid not null,
  status text not null default 'started',
  failure_stage text,
  failure_code text,
  model text,
  input_tokens integer,
  output_tokens integer,
  duration_ms integer,
  reservation_release_failed boolean not null default false,
  release_failure_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_consulting_attempts_user_message_unique unique (user_message_id),
  constraint ai_consulting_attempts_user_message_boundary_fkey
    foreign key (user_message_id, user_id, profile_id)
    references public.ai_consulting_messages (id, user_id, profile_id)
    on delete cascade,
  constraint ai_consulting_attempts_thread_boundary_fkey
    foreign key (thread_id, user_id, profile_id)
    references public.ai_consulting_threads (id, user_id, profile_id)
    on delete cascade,
  constraint ai_consulting_attempts_status_valid
    check (status in ('started', 'succeeded', 'failed', 'timed_out')),
  constraint ai_consulting_attempts_failure_stage_valid
    check (
      failure_stage is null
      or failure_stage in ('context', 'model', 'output', 'completion', 'unknown')
    ),
  constraint ai_consulting_attempts_finished_metadata
    check (
      (status = 'started' and completed_at is null)
      or (status <> 'started' and completed_at is not null)
    ),
  constraint ai_consulting_attempts_failure_metadata
    check (
      (status in ('failed', 'timed_out') and failure_stage is not null and failure_code is not null)
      or (status not in ('failed', 'timed_out') and failure_stage is null and failure_code is null)
    ),
  constraint ai_consulting_attempts_model_length
    check (model is null or (length(btrim(model)) > 0 and length(model) <= 120)),
  constraint ai_consulting_attempts_token_counts_non_negative
    check (
      (input_tokens is null or input_tokens >= 0)
      and (output_tokens is null or output_tokens >= 0)
    ),
  constraint ai_consulting_attempts_duration_non_negative
    check (duration_ms is null or duration_ms >= 0),
  constraint ai_consulting_attempts_release_failure_metadata
    check (
      (reservation_release_failed and release_failure_code is not null)
      or (not reservation_release_failed and release_failure_code is null)
    )
);

create index if not exists ai_consulting_attempts_started_idx
  on public.ai_consulting_attempts (started_at desc, id desc);

create index if not exists ai_consulting_attempts_status_started_idx
  on public.ai_consulting_attempts (status, started_at desc);

alter table public.ai_consulting_attempts enable row level security;

-- Deliberately no authenticated policy. The dashboard reads through the
-- service-role server boundary after operator authorization.
revoke all on public.ai_consulting_attempts from public, anon, authenticated;
grant select, insert, update on public.ai_consulting_attempts to service_role;

drop trigger if exists ai_consulting_attempts_set_updated_at on public.ai_consulting_attempts;
create trigger ai_consulting_attempts_set_updated_at
  before update on public.ai_consulting_attempts
  for each row execute function public.set_ai_consulting_updated_at();
