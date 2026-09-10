-- Support center foundation: authenticated customer escalation plus audited operator handling.
-- Customer and operator access stays server-only through service_role; no browser table grants.

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  contact_email text not null,
  category text not null,
  message text not null,
  order_id uuid references public.orders(id) on delete set null,
  status text not null default 'OPEN',
  operator_response text,
  responded_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_requests_contact_email_bounded
    check (char_length(contact_email) between 3 and 254 and position('@' in contact_email) > 1),
  constraint support_requests_category_valid
    check (category in ('PAYMENT_REFUND','PAID_ANALYSIS','ACCOUNT_ACCESS','PROFILE_DATA','PRIVACY_ACCOUNT','OTHER')),
  constraint support_requests_message_bounded
    check (char_length(message) between 20 and 1200),
  constraint support_requests_status_valid
    check (status in ('OPEN','IN_REVIEW','WAITING_USER','RESOLVED')),
  constraint support_requests_operator_response_bounded
    check (operator_response is null or char_length(operator_response) between 5 and 1500),
  constraint support_requests_resolution_consistent
    check ((status = 'RESOLVED' and resolved_at is not null) or (status <> 'RESOLVED' and resolved_at is null))
);

create index if not exists support_requests_user_created_idx
  on public.support_requests (user_id, created_at desc)
  where user_id is not null;

create index if not exists support_requests_status_created_idx
  on public.support_requests (status, created_at asc);

create index if not exists support_requests_order_idx
  on public.support_requests (order_id)
  where order_id is not null;

create or replace function public.set_support_requests_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_requests_set_updated_at on public.support_requests;
create trigger support_requests_set_updated_at
  before update on public.support_requests
  for each row execute function public.set_support_requests_updated_at();

alter table public.support_requests enable row level security;
revoke all on public.support_requests from anon, authenticated;
grant select, insert, update, delete on public.support_requests to service_role;

alter table public.operator_audit_events
  drop constraint if exists operator_audit_events_action_valid;

alter table public.operator_audit_events
  add constraint operator_audit_events_action_valid
  check (action in ('CUSTOMER_LOOKUP','ORDER_LOOKUP','FAILURE_QUEUE_VIEW','SUPPORT_REQUEST_VIEW','SUPPORT_REQUEST_UPDATE'));

alter table public.operator_audit_events
  drop constraint if exists operator_audit_events_target_valid;

alter table public.operator_audit_events
  add constraint operator_audit_events_target_valid
  check (target_type in ('ACCOUNT','ORDER','FAILURE_QUEUE','SUPPORT_REQUEST'));

create or replace function public.operator_update_support_request(
  p_operator_id uuid,
  p_operator_auth_user_id uuid,
  p_request_id uuid,
  p_status text,
  p_response text,
  p_target_reference_hash text,
  p_correlation_id uuid
)
returns table (
  id uuid,
  status text,
  operator_response text,
  responded_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_response text := nullif(btrim(p_response), '');
begin
  if not exists (
    select 1
    from public.operator_roles r
    where r.id = p_operator_id
      and r.auth_user_id = p_operator_auth_user_id
      and r.role = 'CS_OPERATOR'
      and r.is_active = true
      and r.revoked_at is null
  ) then
    raise exception 'OPERATOR_NOT_AUTHORIZED';
  end if;

  if p_status not in ('OPEN','IN_REVIEW','WAITING_USER','RESOLVED') then
    raise exception 'INVALID_SUPPORT_STATUS';
  end if;

  if p_status in ('WAITING_USER','RESOLVED') and (v_response is null or char_length(v_response) < 5) then
    raise exception 'SUPPORT_RESPONSE_REQUIRED';
  end if;

  if v_response is not null and char_length(v_response) > 1500 then
    raise exception 'SUPPORT_RESPONSE_TOO_LONG';
  end if;

  if char_length(p_target_reference_hash) <> 64 then
    raise exception 'INVALID_AUDIT_REFERENCE';
  end if;

  update public.support_requests s
  set status = p_status,
      operator_response = case when v_response is null then s.operator_response else v_response end,
      responded_at = case when v_response is null then s.responded_at else now() end,
      resolved_at = case when p_status = 'RESOLVED' then now() else null end
  where s.id = p_request_id;

  if not found then
    raise exception 'SUPPORT_REQUEST_NOT_FOUND';
  end if;

  insert into public.operator_audit_events (
    operator_id,
    operator_auth_user_id,
    action,
    target_type,
    target_reference_hash,
    outcome,
    correlation_id,
    reason
  ) values (
    p_operator_id,
    p_operator_auth_user_id,
    'SUPPORT_REQUEST_UPDATE',
    'SUPPORT_REQUEST',
    p_target_reference_hash,
    'SUCCESS',
    p_correlation_id,
    'support request status/response update'
  );

  return query
    select s.id, s.status, s.operator_response, s.responded_at, s.resolved_at, s.updated_at
    from public.support_requests s
    where s.id = p_request_id;
end;
$$;

revoke all on function public.operator_update_support_request(uuid, uuid, uuid, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.operator_update_support_request(uuid, uuid, uuid, text, text, text, uuid) to service_role;