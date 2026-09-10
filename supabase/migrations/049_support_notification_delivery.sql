-- Durable support notification delivery queue.
-- Stores only notification metadata; customer message bodies and email addresses are never copied here.
-- Also hardens the existing operator-alert trigger function search_path.

alter function public.set_operator_alert_deliveries_updated_at()
  set search_path = pg_catalog, public;

create table if not exists public.support_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  support_request_id uuid not null references public.support_requests(id) on delete cascade,
  delivery_key text not null unique,
  notification_type text not null,
  status text not null default 'PENDING',
  attempt_count integer not null default 0,
  max_attempt_count integer not null default 10,
  next_retry_at timestamptz,
  provider_message_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint support_notification_deliveries_key_bounded
    check (char_length(delivery_key) between 20 and 128),
  constraint support_notification_deliveries_type_valid
    check (notification_type in ('OWNER_NEW_REQUEST','CUSTOMER_RESPONSE')),
  constraint support_notification_deliveries_status_valid
    check (status in ('PENDING','SENDING','FAILED_RETRYING','SENT','FAILED_FINAL')),
  constraint support_notification_deliveries_attempt_valid
    check (attempt_count >= 0 and max_attempt_count between 1 and 10),
  constraint support_notification_deliveries_error_bounded
    check (last_error_code is null or char_length(last_error_code) between 1 and 120),
  constraint support_notification_deliveries_sent_consistent
    check ((status = 'SENT' and sent_at is not null) or status <> 'SENT')
);

create index if not exists support_notification_deliveries_due_idx
  on public.support_notification_deliveries (next_retry_at, created_at)
  where status in ('PENDING','FAILED_RETRYING','SENDING');

create index if not exists support_notification_deliveries_request_idx
  on public.support_notification_deliveries (support_request_id, created_at desc);

create or replace function public.set_support_notification_deliveries_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_notification_deliveries_set_updated_at on public.support_notification_deliveries;
create trigger support_notification_deliveries_set_updated_at
  before update on public.support_notification_deliveries
  for each row execute function public.set_support_notification_deliveries_updated_at();

create or replace function public.enqueue_support_notification()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.support_notification_deliveries (
      support_request_id,
      delivery_key,
      notification_type
    ) values (
      new.id,
      'OWNER_NEW_REQUEST:' || new.id::text,
      'OWNER_NEW_REQUEST'
    )
    on conflict (delivery_key) do nothing;
  elsif tg_op = 'UPDATE'
    and new.operator_response is distinct from old.operator_response
    and new.operator_response is not null
    and new.responded_at is not null then
    insert into public.support_notification_deliveries (
      support_request_id,
      delivery_key,
      notification_type
    ) values (
      new.id,
      'CUSTOMER_RESPONSE:' || new.id::text || ':' || floor(extract(epoch from new.responded_at) * 1000)::bigint::text,
      'CUSTOMER_RESPONSE'
    )
    on conflict (delivery_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists support_requests_enqueue_notification on public.support_requests;
create trigger support_requests_enqueue_notification
  after insert or update of operator_response on public.support_requests
  for each row execute function public.enqueue_support_notification();

alter table public.support_notification_deliveries enable row level security;
revoke all on public.support_notification_deliveries from anon, authenticated;
grant select, insert, update, delete on public.support_notification_deliveries to service_role;
