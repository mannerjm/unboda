-- STEP 57D-44B-R: safe, durable provider confirmation diagnostics.
alter table public.toss_payment_records
  add column if not exists last_confirmation_http_status integer,
  add column if not exists last_provider_error_code text,
  add column if not exists last_provider_error_message text,
  add column if not exists last_confirmation_attempt_at timestamptz,
  add column if not exists last_confirmation_retryability text,
  add column if not exists last_confirmation_correlation_id text;

alter table public.toss_payment_records
  add constraint toss_payment_records_retryability_valid
    check (last_confirmation_retryability is null or last_confirmation_retryability in (
      'RETRYABLE', 'NON_RETRYABLE', 'OWNER_ESCALATION_REQUIRED'
    ));