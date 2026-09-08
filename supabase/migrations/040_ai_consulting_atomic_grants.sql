-- AI Consulting Phase 6: atomic paid-grant issuance and question reservation/finalization.
--
-- Goals:
-- * one source purchase issues at most one idempotent consulting grant
-- * ALLOW questions reserve capacity before any LLM call
-- * model failure can release the reservation without consuming a paid question
-- * only a successfully persisted assistant answer converts one reservation into one used question
-- * duplicate retries are idempotent and cannot double-reserve or double-charge
-- * all mutation RPCs are service_role-only

alter table public.ai_consulting_grants
  add column if not exists questions_reserved integer not null default 0;

alter table public.ai_consulting_grants
  drop constraint if exists ai_consulting_grants_questions_reserved_non_negative,
  add constraint ai_consulting_grants_questions_reserved_non_negative
    check (questions_reserved >= 0),
  drop constraint if exists ai_consulting_grants_total_capacity_bounded,
  add constraint ai_consulting_grants_total_capacity_bounded
    check (questions_used + questions_reserved <= question_limit);

alter table public.ai_consulting_messages
  add column if not exists request_id uuid,
  add column if not exists reply_to_message_id uuid,
  add column if not exists reservation_token uuid,
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists reservation_released_at timestamptz;

create unique index if not exists ai_consulting_messages_request_uidx
  on public.ai_consulting_messages (thread_id, request_id)
  where role = 'user' and request_id is not null;

create unique index if not exists ai_consulting_messages_reply_uidx
  on public.ai_consulting_messages (reply_to_message_id)
  where role = 'assistant' and reply_to_message_id is not null;

create unique index if not exists ai_consulting_messages_reply_boundary_uidx
  on public.ai_consulting_messages (id, thread_id, user_id, profile_id);

alter table public.ai_consulting_messages
  drop constraint if exists ai_consulting_messages_request_role_fields,
  add constraint ai_consulting_messages_request_role_fields check (
    (role = 'user' and request_id is not null and reply_to_message_id is null)
    or
    (role = 'assistant' and request_id is null and reply_to_message_id is not null)
  ),
  drop constraint if exists ai_consulting_messages_reservation_fields_consistent,
  add constraint ai_consulting_messages_reservation_fields_consistent check (
    role = 'assistant'
    or scope_decision <> 'ALLOW'
    or (
      reservation_token is not null
      and reservation_expires_at is not null
    )
  ),
  drop constraint if exists ai_consulting_messages_non_allow_has_no_reservation,
  add constraint ai_consulting_messages_non_allow_has_no_reservation check (
    role <> 'user'
    or scope_decision = 'ALLOW'
    or (
      reservation_token is null
      and reservation_expires_at is null
      and reservation_released_at is null
      and charged = false
    )
  ),
  drop constraint if exists ai_consulting_messages_charged_reservation_not_released,
  add constraint ai_consulting_messages_charged_reservation_not_released check (
    not charged or reservation_released_at is null
  );

alter table public.ai_consulting_messages
  drop constraint if exists ai_consulting_messages_reply_boundary_fkey,
  add constraint ai_consulting_messages_reply_boundary_fkey
    foreign key (reply_to_message_id, thread_id, user_id, profile_id)
    references public.ai_consulting_messages (id, thread_id, user_id, profile_id)
    on delete cascade;

create or replace function public.issue_ai_consulting_grant(
  p_source_purchase_id uuid,
  p_base_entitlement_id uuid,
  p_question_limit integer,
  p_expires_at timestamptz default null
)
returns setof public.ai_consulting_grants
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
  v_entitlement public.entitlements%rowtype;
  v_existing public.ai_consulting_grants%rowtype;
  v_created public.ai_consulting_grants%rowtype;
begin
  if p_question_limit <= 0 or p_question_limit > 1000 then
    raise exception 'AI_CONSULTING_INVALID_QUESTION_LIMIT';
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'AI_CONSULTING_INVALID_EXPIRY';
  end if;

  select * into v_purchase
  from public.purchases
  where id = p_source_purchase_id
  for update;

  if not found then
    raise exception 'AI_CONSULTING_SOURCE_PURCHASE_NOT_FOUND';
  end if;

  select * into v_entitlement
  from public.entitlements
  where id = p_base_entitlement_id
  for update;

  if not found then
    raise exception 'AI_CONSULTING_BASE_ENTITLEMENT_NOT_FOUND';
  end if;

  if v_purchase.user_id <> v_entitlement.user_id
    or v_purchase.profile_id <> v_entitlement.profile_id then
    raise exception 'AI_CONSULTING_PURCHASE_ENTITLEMENT_BOUNDARY_MISMATCH';
  end if;

  if v_entitlement.resource_type <> 'paid_analysis'
    or not v_entitlement.is_active
    or v_entitlement.analysis_edition_key is null
    or length(btrim(v_entitlement.analysis_edition_key)) = 0 then
    raise exception 'AI_CONSULTING_BASE_ENTITLEMENT_INELIGIBLE';
  end if;

  select * into v_existing
  from public.ai_consulting_grants
  where source_purchase_id = p_source_purchase_id
  for update;

  if found then
    if v_existing.base_entitlement_id <> p_base_entitlement_id
      or v_existing.question_limit <> p_question_limit
      or v_existing.expires_at is distinct from p_expires_at then
      raise exception 'AI_CONSULTING_GRANT_REPLAY_MISMATCH';
    end if;
    return next v_existing;
    return;
  end if;

  insert into public.ai_consulting_grants (
    user_id,
    profile_id,
    source_purchase_id,
    source_product_id,
    base_entitlement_id,
    base_product_id,
    base_resource_type,
    analysis_edition_key,
    question_limit,
    questions_used,
    questions_reserved,
    status,
    expires_at
  ) values (
    v_purchase.user_id,
    v_purchase.profile_id,
    v_purchase.id,
    v_purchase.product_id,
    v_entitlement.id,
    v_entitlement.resource_id,
    v_entitlement.resource_type,
    v_entitlement.analysis_edition_key,
    p_question_limit,
    0,
    0,
    'active',
    p_expires_at
  )
  returning * into v_created;

  return next v_created;
end;
$$;

revoke all on function public.issue_ai_consulting_grant(uuid, uuid, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.issue_ai_consulting_grant(uuid, uuid, integer, timestamptz)
  to service_role;

create or replace function public.reserve_ai_consulting_question(
  p_thread_id uuid,
  p_request_id uuid,
  p_content text,
  p_scope_decision text,
  p_scope_reason_code text default null,
  p_reservation_ttl_seconds integer default 300
)
returns table (
  message_id uuid,
  reservation_token uuid,
  reservation_expires_at timestamptz,
  chargeable boolean,
  questions_remaining integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_thread public.ai_consulting_threads%rowtype;
  v_grant public.ai_consulting_grants%rowtype;
  v_existing public.ai_consulting_messages%rowtype;
  v_entitlement public.entitlements%rowtype;
  v_token uuid;
  v_expires_at timestamptz;
  v_message public.ai_consulting_messages%rowtype;
  v_released integer := 0;
begin
  if p_request_id is null then
    raise exception 'AI_CONSULTING_REQUEST_ID_REQUIRED';
  end if;
  if p_content is null or length(btrim(p_content)) = 0 or length(p_content) > 300 then
    raise exception 'AI_CONSULTING_INVALID_QUESTION';
  end if;
  if p_scope_decision not in ('ALLOW', 'CLARIFY', 'DENY', 'SAFETY_REDIRECT') then
    raise exception 'AI_CONSULTING_INVALID_SCOPE_DECISION';
  end if;
  if p_reservation_ttl_seconds < 30 or p_reservation_ttl_seconds > 900 then
    raise exception 'AI_CONSULTING_INVALID_RESERVATION_TTL';
  end if;

  select * into v_thread
  from public.ai_consulting_threads
  where id = p_thread_id
  for update;

  if not found or v_thread.status <> 'active' then
    raise exception 'AI_CONSULTING_THREAD_UNAVAILABLE';
  end if;

  select * into v_grant
  from public.ai_consulting_grants
  where id = v_thread.grant_id
  for update;

  if not found
    or v_grant.user_id <> v_thread.user_id
    or v_grant.profile_id <> v_thread.profile_id
    or v_grant.base_product_id <> v_thread.base_product_id
    or v_grant.analysis_edition_key <> v_thread.analysis_edition_key then
    raise exception 'AI_CONSULTING_GRANT_THREAD_BOUNDARY_MISMATCH';
  end if;

  select * into v_existing
  from public.ai_consulting_messages
  where thread_id = p_thread_id
    and request_id = p_request_id
    and role = 'user'
  for update;

  if found then
    if v_existing.content <> p_content
      or v_existing.scope_decision <> p_scope_decision
      or v_existing.scope_reason_code is distinct from p_scope_reason_code then
      raise exception 'AI_CONSULTING_REQUEST_REPLAY_MISMATCH';
    end if;
    if v_existing.reservation_released_at is not null and not v_existing.charged then
      raise exception 'AI_CONSULTING_RESERVATION_RELEASED';
    end if;
    return query select
      v_existing.id,
      v_existing.reservation_token,
      v_existing.reservation_expires_at,
      (v_existing.scope_decision = 'ALLOW'),
      greatest(0, v_grant.question_limit - v_grant.questions_used - v_grant.questions_reserved);
    return;
  end if;

  if v_grant.status <> 'active'
    or (v_grant.expires_at is not null and v_grant.expires_at <= now()) then
    raise exception 'AI_CONSULTING_GRANT_UNAVAILABLE';
  end if;

  select * into v_entitlement
  from public.entitlements
  where id = v_grant.base_entitlement_id
  for share;

  if not found or not v_entitlement.is_active then
    raise exception 'AI_CONSULTING_BASE_ENTITLEMENT_REVOKED';
  end if;

  if p_scope_decision <> 'ALLOW' then
    insert into public.ai_consulting_messages (
      thread_id, user_id, profile_id, role, content,
      scope_decision, scope_reason_code, charged, request_id
    ) values (
      v_thread.id, v_thread.user_id, v_thread.profile_id, 'user', p_content,
      p_scope_decision, p_scope_reason_code, false, p_request_id
    ) returning * into v_message;

    return query select
      v_message.id, null::uuid, null::timestamptz, false,
      greatest(0, v_grant.question_limit - v_grant.questions_used - v_grant.questions_reserved);
    return;
  end if;

  with stale as (
    update public.ai_consulting_messages m
    set reservation_released_at = now()
    from public.ai_consulting_threads t
    where m.thread_id = t.id
      and t.grant_id = v_grant.id
      and m.role = 'user'
      and m.scope_decision = 'ALLOW'
      and m.charged = false
      and m.reservation_token is not null
      and m.reservation_released_at is null
      and m.reservation_expires_at <= now()
    returning m.id
  )
  select count(*)::integer into v_released from stale;

  if v_released > 0 then
    update public.ai_consulting_grants
    set questions_reserved = greatest(0, questions_reserved - v_released)
    where id = v_grant.id
    returning * into v_grant;
  end if;

  if v_grant.questions_used + v_grant.questions_reserved >= v_grant.question_limit then
    raise exception 'AI_CONSULTING_NO_QUESTION_CAPACITY';
  end if;

  v_token := gen_random_uuid();
  v_expires_at := now() + make_interval(secs => p_reservation_ttl_seconds);

  insert into public.ai_consulting_messages (
    thread_id, user_id, profile_id, role, content,
    scope_decision, scope_reason_code, charged, request_id,
    reservation_token, reservation_expires_at
  ) values (
    v_thread.id, v_thread.user_id, v_thread.profile_id, 'user', p_content,
    'ALLOW', p_scope_reason_code, false, p_request_id,
    v_token, v_expires_at
  ) returning * into v_message;

  update public.ai_consulting_grants
  set questions_reserved = questions_reserved + 1
  where id = v_grant.id
  returning * into v_grant;

  return query select
    v_message.id,
    v_token,
    v_expires_at,
    true,
    greatest(0, v_grant.question_limit - v_grant.questions_used - v_grant.questions_reserved);
end;
$$;

revoke all on function public.reserve_ai_consulting_question(uuid, uuid, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_ai_consulting_question(uuid, uuid, text, text, text, integer)
  to service_role;

create or replace function public.release_ai_consulting_question_reservation(
  p_user_message_id uuid,
  p_reservation_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_message public.ai_consulting_messages%rowtype;
  v_thread public.ai_consulting_threads%rowtype;
  v_grant public.ai_consulting_grants%rowtype;
begin
  select * into v_message
  from public.ai_consulting_messages
  where id = p_user_message_id
  for update;

  if not found or v_message.role <> 'user' or v_message.scope_decision <> 'ALLOW' then
    raise exception 'AI_CONSULTING_RESERVATION_NOT_FOUND';
  end if;
  if v_message.reservation_token is distinct from p_reservation_token then
    raise exception 'AI_CONSULTING_RESERVATION_TOKEN_MISMATCH';
  end if;
  if v_message.charged then
    return false;
  end if;
  if v_message.reservation_released_at is not null then
    return true;
  end if;

  select * into v_thread
  from public.ai_consulting_threads
  where id = v_message.thread_id
  for update;

  select * into v_grant
  from public.ai_consulting_grants
  where id = v_thread.grant_id
  for update;

  if v_grant.questions_reserved <= 0 then
    raise exception 'AI_CONSULTING_RESERVATION_COUNTER_INCONSISTENT';
  end if;

  update public.ai_consulting_messages
  set reservation_released_at = now()
  where id = v_message.id;

  update public.ai_consulting_grants
  set questions_reserved = questions_reserved - 1
  where id = v_grant.id;

  return true;
end;
$$;

revoke all on function public.release_ai_consulting_question_reservation(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.release_ai_consulting_question_reservation(uuid, uuid)
  to service_role;

create or replace function public.complete_ai_consulting_answer(
  p_user_message_id uuid,
  p_reservation_token uuid,
  p_assistant_content text,
  p_model text,
  p_input_tokens integer default null,
  p_output_tokens integer default null
)
returns table (
  assistant_message_id uuid,
  questions_used integer,
  questions_reserved integer,
  question_limit integer,
  grant_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_message public.ai_consulting_messages%rowtype;
  v_thread public.ai_consulting_threads%rowtype;
  v_grant public.ai_consulting_grants%rowtype;
  v_existing_answer public.ai_consulting_messages%rowtype;
  v_answer public.ai_consulting_messages%rowtype;
  v_entitlement public.entitlements%rowtype;
begin
  if p_assistant_content is null
    or length(btrim(p_assistant_content)) = 0
    or length(p_assistant_content) > 8000 then
    raise exception 'AI_CONSULTING_INVALID_ANSWER';
  end if;
  if p_model is null or length(btrim(p_model)) = 0 or length(p_model) > 120 then
    raise exception 'AI_CONSULTING_INVALID_MODEL';
  end if;
  if (p_input_tokens is not null and p_input_tokens < 0)
    or (p_output_tokens is not null and p_output_tokens < 0) then
    raise exception 'AI_CONSULTING_INVALID_TOKEN_COUNT';
  end if;

  select * into v_message
  from public.ai_consulting_messages
  where id = p_user_message_id
  for update;

  if not found or v_message.role <> 'user' or v_message.scope_decision <> 'ALLOW' then
    raise exception 'AI_CONSULTING_CHARGEABLE_MESSAGE_NOT_FOUND';
  end if;
  if v_message.reservation_token is distinct from p_reservation_token then
    raise exception 'AI_CONSULTING_RESERVATION_TOKEN_MISMATCH';
  end if;

  select * into v_thread
  from public.ai_consulting_threads
  where id = v_message.thread_id
  for update;

  if not found then
    raise exception 'AI_CONSULTING_THREAD_NOT_FOUND';
  end if;

  select * into v_grant
  from public.ai_consulting_grants
  where id = v_thread.grant_id
  for update;

  if not found then
    raise exception 'AI_CONSULTING_GRANT_NOT_FOUND';
  end if;

  select * into v_existing_answer
  from public.ai_consulting_messages
  where reply_to_message_id = v_message.id
    and role = 'assistant'
  for update;

  if found then
    if not v_message.charged then
      raise exception 'AI_CONSULTING_COMPLETION_STATE_INCONSISTENT';
    end if;
    if v_existing_answer.content <> p_assistant_content
      or v_existing_answer.model <> p_model
      or v_existing_answer.input_tokens is distinct from p_input_tokens
      or v_existing_answer.output_tokens is distinct from p_output_tokens then
      raise exception 'AI_CONSULTING_COMPLETION_REPLAY_MISMATCH';
    end if;
    return query select
      v_existing_answer.id,
      v_grant.questions_used,
      v_grant.questions_reserved,
      v_grant.question_limit,
      v_grant.status;
    return;
  end if;

  if v_message.charged then
    raise exception 'AI_CONSULTING_MESSAGE_ALREADY_CHARGED';
  end if;
  if v_message.reservation_released_at is not null then
    raise exception 'AI_CONSULTING_RESERVATION_RELEASED';
  end if;
  if v_grant.questions_reserved <= 0 then
    raise exception 'AI_CONSULTING_RESERVATION_COUNTER_INCONSISTENT';
  end if;

  select * into v_entitlement
  from public.entitlements
  where id = v_grant.base_entitlement_id
  for share;

  if not found or not v_entitlement.is_active then
    raise exception 'AI_CONSULTING_BASE_ENTITLEMENT_REVOKED';
  end if;

  insert into public.ai_consulting_messages (
    thread_id, user_id, profile_id, role, content,
    scope_decision, scope_reason_code, charged,
    model, input_tokens, output_tokens,
    request_id, reply_to_message_id
  ) values (
    v_thread.id, v_thread.user_id, v_thread.profile_id, 'assistant', p_assistant_content,
    null, null, false,
    p_model, p_input_tokens, p_output_tokens,
    null, v_message.id
  ) returning * into v_answer;

  update public.ai_consulting_messages
  set charged = true
  where id = v_message.id;

  update public.ai_consulting_grants
  set
    questions_reserved = questions_reserved - 1,
    questions_used = questions_used + 1,
    status = case
      when questions_used + 1 >= question_limit then 'exhausted'
      else 'active'
    end
  where id = v_grant.id
  returning * into v_grant;

  return query select
    v_answer.id,
    v_grant.questions_used,
    v_grant.questions_reserved,
    v_grant.question_limit,
    v_grant.status;
end;
$$;

revoke all on function public.complete_ai_consulting_answer(uuid, uuid, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.complete_ai_consulting_answer(uuid, uuid, text, text, integer, integer)
  to service_role;
