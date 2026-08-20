-- Additive unit-economics telemetry for one OpenAI request attempt.
-- No user/profile/prompt/report content is stored here.
create table if not exists public.paid_generation_attempts (
  attempt_id text primary key,
  generation_id text not null,
  report_id uuid not null references public.paid_reports (id) on delete cascade,
  product_id text not null,
  product_family text not null,
  commercial_band text not null,
  generation_contract_version text not null,
  model text not null,
  reasoning_effort text not null,
  max_output_tokens integer not null,
  request_id text,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  duration_ms integer not null check (duration_ms >= 0),
  status text not null,
  failure_stage text,
  retry_index integer not null check (retry_index >= 0),
  usage_available boolean not null default false,
  input_tokens integer,
  cached_input_tokens integer,
  cache_write_tokens integer,
  output_tokens integer,
  reasoning_tokens integer,
  total_tokens integer,

  constraint paid_generation_attempts_product_family_valid
    check (product_family in ('TOPIC', 'PERIOD')),
  constraint paid_generation_attempts_status_valid
    check (status in ('succeeded', 'failed', 'timed_out', 'incomplete', 'aborted')),
  constraint paid_generation_attempts_failure_stage_valid
    check (failure_stage is null or failure_stage in (
      'request', 'response', 'extraction', 'parse', 'schema',
      'consistency', 'self_review', 'category_validation', 'persistence'
    )),
  constraint paid_generation_attempts_tokens_non_negative
    check (
      (input_tokens is null or input_tokens >= 0)
      and (cached_input_tokens is null or cached_input_tokens >= 0)
      and (cache_write_tokens is null or cache_write_tokens >= 0)
      and (output_tokens is null or output_tokens >= 0)
      and (reasoning_tokens is null or reasoning_tokens >= 0)
      and (total_tokens is null or total_tokens >= 0)
    ),
  constraint paid_generation_attempts_generation_retry_unique
    unique (generation_id, retry_index)
);

create index if not exists paid_generation_attempts_product_idx
  on public.paid_generation_attempts (product_id, started_at desc);

create index if not exists paid_generation_attempts_report_idx
  on public.paid_generation_attempts (report_id, retry_index);

create index if not exists paid_generation_attempts_status_idx
  on public.paid_generation_attempts (status, failure_stage, started_at desc);

create index if not exists paid_generation_attempts_started_at_idx
  on public.paid_generation_attempts (started_at desc);

alter table public.paid_generation_attempts enable row level security;

revoke all on public.paid_generation_attempts from anon, authenticated;
grant select, insert, update on public.paid_generation_attempts to service_role;