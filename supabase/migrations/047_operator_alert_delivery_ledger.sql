-- Solo-operator alert delivery ledger.
-- Stores only operational alert metadata; no customer content or email addresses.

create table if not exists public.operator_alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_key text not null unique,
  alert_type text not null default 'OWNER_REVIEW',
  incident_count integer not null,
  status text not null default 'PENDING',
  attempt_count integer not null default 0,
  max_attempt_count integer not null default 5,
  next_retry_at timestamptz,
  provider_message_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint operator_alert_deliveries_key_length check (char_length(alert_key) between 16 and 128),
  constraint operator_alert_deliveries_type_valid check (alert_type in ('OWNER_REVIEW')),
  constraint operator_alert_deliveries_incident_count_valid check (incident_count > 0),
  constraint operator_alert_deliveries_status_valid check (status in ('PENDING','SENDING','FAILED_RETRYING','SENT','FAILED_FINAL')),
  constraint operator_alert_deliveries_attempt_count_valid check (attempt_count >= 0 and max_attempt_count between 1 and 10),
  constraint operator_alert_deliveries_error_code_bounded check (last_error_code is null or char_length(last_error_code) between 1 and 120),
  constraint operator_alert_deliveries_sent_consistent check ((status = 'SENT' and sent_at is not null) or status <> 'SENT')
);

create index if not exists operator_alert_deliveries_due_idx
  on public.operator_alert_deliveries (next_retry_at, created_at)
  where status in ('PENDING','FAILED_RETRYING');

create or replace function public.set_operator_alert_deliveries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists operator_alert_deliveries_set_updated_at on public.operator_alert_deliveries;
create trigger operator_alert_deliveries_set_updated_at
  before update on public.operator_alert_deliveries
  for each row execute function public.set_operator_alert_deliveries_updated_at();

alter table public.operator_alert_deliveries enable row level security;
revoke all on public.operator_alert_deliveries from anon, authenticated;
grant select, insert, update, delete on public.operator_alert_deliveries to service_role;
