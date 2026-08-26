-- STEP 57D-44A: bounded automatic reconciliation retry metadata.
alter table public.toss_payment_records
  add column if not exists retry_count integer not null default 0,
  add column if not exists max_retry_count integer not null default 5,
  add column if not exists next_retry_at timestamptz not null default now(),
  add column if not exists last_attempt_at timestamptz;

alter table public.toss_payment_records
  add constraint toss_payment_records_retry_count_valid
    check (retry_count >= 0 and max_retry_count between 1 and 10);

create index if not exists toss_payment_records_next_retry_idx
  on public.toss_payment_records (next_retry_at, reconciliation_status);