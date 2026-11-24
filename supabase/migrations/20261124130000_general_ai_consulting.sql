-- Independent AI consultation uses existing purchased question credits, not a report entitlement.
alter table public.ai_consulting_grants alter column base_entitlement_id drop not null;
alter table public.ai_consulting_grants drop constraint ai_consulting_grants_resource_type_paid_analysis;
alter table public.ai_consulting_grants add constraint ai_consulting_grants_resource_binding_check check (
  (base_resource_type = 'paid_analysis' and base_entitlement_id is not null and base_product_id <> 'ai-consulting-general')
  or (base_resource_type = 'general_consulting' and base_entitlement_id is null and base_product_id = 'ai-consulting-general' and analysis_edition_key = 'general-v1' and source_product_id in ('ai-consulting-3','ai-consulting-5','ai-consulting-10'))
);
create unique index ai_consulting_grants_general_active_profile_uidx on public.ai_consulting_grants(user_id,profile_id) where base_resource_type = 'general_consulting' and status = 'active';
create function public.ensure_general_ai_consulting_grant(p_user_id uuid,p_profile_id uuid)
returns setof public.ai_consulting_grants
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
  v_grant public.ai_consulting_grants%rowtype;
  v_balance integer;
begin
  perform 1 from public.profiles where id=p_profile_id and user_id=p_user_id for update;
  if not found then raise exception 'AI_CONSULTING_PROFILE_BOUNDARY_MISMATCH'; end if;
  perform public.expire_due_ai_credit_lots(p_user_id,p_profile_id);
  select coalesce(sum(quantity),0)::integer into v_balance from public.ai_consulting_credit_ledger where user_id=p_user_id and profile_id=p_profile_id;
  if v_balance<=0 then raise exception 'AI_CONSULTING_NO_PROFILE_CREDIT'; end if;
  select * into v_grant from public.ai_consulting_grants where user_id=p_user_id and profile_id=p_profile_id and base_resource_type='general_consulting' and status='active' limit 1;
  if found then return next v_grant; return; end if;
  select p.* into v_purchase from public.ai_consulting_credit_ledger l
    join public.purchases p on p.id=l.source_purchase_id and p.user_id=l.user_id and p.profile_id=l.profile_id and p.product_id=l.bundle_id
    where l.user_id=p_user_id and l.profile_id=p_profile_id and l.entry_type='PURCHASE' and l.bundle_id in ('ai-consulting-3','ai-consulting-5','ai-consulting-10')
    order by l.created_at desc,l.id desc limit 1;
  if not found then raise exception 'AI_CONSULTING_CREDIT_PURCHASE_NOT_FOUND'; end if;
  insert into public.ai_consulting_grants(user_id,profile_id,source_purchase_id,source_product_id,base_entitlement_id,base_product_id,base_resource_type,analysis_edition_key,question_limit,questions_used,questions_reserved,status,expires_at)
    values(p_user_id,p_profile_id,v_purchase.id,v_purchase.product_id,null,'ai-consulting-general','general_consulting','general-v1',1000,0,0,'active',null)
    returning * into v_grant;
  return next v_grant;
end;
$$;
revoke all on function public.ensure_general_ai_consulting_grant(uuid,uuid) from public,anon,authenticated;
grant execute on function public.ensure_general_ai_consulting_grant(uuid,uuid) to service_role;

CREATE OR REPLACE FUNCTION public.complete_ai_consulting_credit_answer(p_user_message_id uuid, p_reservation_token uuid, p_assistant_content text, p_model text, p_input_tokens integer DEFAULT NULL::integer, p_output_tokens integer DEFAULT NULL::integer)
 RETURNS TABLE(assistant_message_id uuid, questions_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_message public.ai_consulting_messages%rowtype;
  v_thread public.ai_consulting_threads%rowtype;
  v_grant public.ai_consulting_grants%rowtype;
  v_entitlement public.entitlements%rowtype;
  v_existing_answer public.ai_consulting_messages%rowtype;
  v_existing_consume public.ai_consulting_credit_ledger%rowtype;
  v_answer public.ai_consulting_messages%rowtype;
  v_balance integer;
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
  for share;

  if not found
    or v_grant.user_id <> v_thread.user_id
    or v_grant.profile_id <> v_thread.profile_id
    or v_grant.base_product_id <> v_thread.base_product_id
    or v_grant.analysis_edition_key <> v_thread.analysis_edition_key then
    raise exception 'AI_CONSULTING_ACCESS_BOUNDARY_MISMATCH';
  end if;

  perform 1
  from public.profiles
  where id = v_thread.profile_id and user_id = v_thread.user_id
  for update;

  if not found then
    raise exception 'AI_CONSULTING_PROFILE_BOUNDARY_MISMATCH';
  end if;

  perform public.expire_due_ai_credit_lots(v_thread.user_id,v_thread.profile_id);

  select * into v_existing_answer
  from public.ai_consulting_messages
  where reply_to_message_id = v_message.id and role = 'assistant'
  for update;

  if found then
    select * into v_existing_consume
    from public.ai_consulting_credit_ledger
    where related_message_id = v_message.id and entry_type = 'CONSUME'
    limit 1;

    if not v_message.charged or v_existing_consume.id is null then
      raise exception 'AI_CONSULTING_COMPLETION_STATE_INCONSISTENT';
    end if;
    if v_existing_answer.content <> p_assistant_content
      or v_existing_answer.model <> p_model
      or v_existing_answer.input_tokens is distinct from p_input_tokens
      or v_existing_answer.output_tokens is distinct from p_output_tokens then
      raise exception 'AI_CONSULTING_COMPLETION_REPLAY_MISMATCH';
    end if;

    select coalesce(sum(quantity), 0)::integer into v_balance
    from public.ai_consulting_credit_ledger
    where user_id = v_thread.user_id and profile_id = v_thread.profile_id;

    return query select v_existing_answer.id, greatest(0, v_balance);
    return;
  end if;

  if v_message.charged then
    raise exception 'AI_CONSULTING_MESSAGE_ALREADY_CHARGED';
  end if;
  if v_message.reservation_released_at is not null
    or v_message.reservation_expires_at is null
    or v_message.reservation_expires_at <= now() then
    raise exception 'AI_CONSULTING_RESERVATION_RELEASED';
  end if;

  if not (v_grant.base_resource_type = 'general_consulting' and v_grant.base_entitlement_id is null and v_grant.base_product_id = 'ai-consulting-general' and v_grant.analysis_edition_key = 'general-v1') then
    select * into v_entitlement
    from public.entitlements
    where id = v_grant.base_entitlement_id
    for share;
  
    if not found or not v_entitlement.is_active
      or (v_entitlement.service_expires_at is not null and v_entitlement.service_expires_at<=now()) then
      raise exception 'AI_CONSULTING_BASE_ENTITLEMENT_REVOKED';
    end if;
  end if;

  select coalesce(sum(quantity), 0)::integer into v_balance
  from public.ai_consulting_credit_ledger
  where user_id = v_thread.user_id and profile_id = v_thread.profile_id;

  if v_balance <= 0 then
    raise exception 'AI_CONSULTING_NO_PROFILE_CREDIT';
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

  insert into public.ai_consulting_credit_ledger (
    user_id,
    profile_id,
    entry_type,
    quantity,
    related_message_id,
    note
  ) values (
    v_thread.user_id,
    v_thread.profile_id,
    'CONSUME',
    -1,
    v_message.id,
    'AI consulting completed answer'
  );

  return query select v_answer.id, greatest(0, v_balance - 1);
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_ai_consulting_thread(p_grant_id uuid, p_title text DEFAULT NULL::text)
 RETURNS SETOF ai_consulting_threads
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_grant public.ai_consulting_grants%rowtype;
  v_thread public.ai_consulting_threads%rowtype;
begin
  if p_grant_id is null then
    raise exception 'AI_CONSULTING_GRANT_REQUIRED';
  end if;

  if p_title is not null and length(p_title) > 120 then
    raise exception 'AI_CONSULTING_THREAD_TITLE_TOO_LONG';
  end if;

  select * into v_grant
  from public.ai_consulting_grants
  where id = p_grant_id
  for update;

  if not found then
    raise exception 'AI_CONSULTING_GRANT_NOT_FOUND';
  end if;

  if v_grant.status <> 'active' then
    raise exception 'AI_CONSULTING_GRANT_NOT_ACTIVE';
  end if;

  if v_grant.expires_at is not null and v_grant.expires_at <= now() then
    raise exception 'AI_CONSULTING_GRANT_EXPIRED';
  end if;

  if not (v_grant.base_resource_type = 'general_consulting' and v_grant.base_entitlement_id is null and v_grant.base_product_id = 'ai-consulting-general' and v_grant.analysis_edition_key = 'general-v1') then
    if not exists (
      select 1
      from public.entitlements e
      where e.id = v_grant.base_entitlement_id
        and e.user_id = v_grant.user_id
        and e.profile_id = v_grant.profile_id
        and e.resource_id = v_grant.base_product_id
        and e.resource_type = v_grant.base_resource_type
        and e.analysis_edition_key = v_grant.analysis_edition_key
        and e.is_active = true
    ) then
      raise exception 'AI_CONSULTING_BASE_ENTITLEMENT_INACTIVE';
    end if;
  end if;

  select * into v_thread
  from public.ai_consulting_threads
  where grant_id = v_grant.id
    and status = 'active'
  limit 1;

  if found then
    return next v_thread;
    return;
  end if;

  insert into public.ai_consulting_threads (
    user_id,
    profile_id,
    grant_id,
    base_product_id,
    analysis_edition_key,
    title,
    status
  ) values (
    v_grant.user_id,
    v_grant.profile_id,
    v_grant.id,
    v_grant.base_product_id,
    v_grant.analysis_edition_key,
    nullif(btrim(p_title), ''),
    'active'
  )
  on conflict (grant_id) where status = 'active' do nothing
  returning * into v_thread;

  if not found then
    select * into v_thread
    from public.ai_consulting_threads
    where grant_id = v_grant.id
      and status = 'active'
    limit 1;
  end if;

  if v_thread.id is null then
    raise exception 'AI_CONSULTING_THREAD_CREATE_FAILED';
  end if;

  return next v_thread;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reserve_ai_consulting_credit_question(p_thread_id uuid, p_request_id uuid, p_content text, p_scope_decision text, p_scope_reason_code text DEFAULT NULL::text, p_reservation_ttl_seconds integer DEFAULT 300)
 RETURNS TABLE(message_id uuid, reservation_token uuid, reservation_expires_at timestamp with time zone, chargeable boolean, questions_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_thread public.ai_consulting_threads%rowtype;
  v_grant public.ai_consulting_grants%rowtype;
  v_entitlement public.entitlements%rowtype;
  v_existing public.ai_consulting_messages%rowtype;
  v_message public.ai_consulting_messages%rowtype;
  v_token uuid;
  v_expires_at timestamptz;
  v_balance integer;
  v_reserved integer;
  v_existing_found boolean := false;
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
  for share;

  if not found
    or v_grant.user_id <> v_thread.user_id
    or v_grant.profile_id <> v_thread.profile_id
    or v_grant.base_product_id <> v_thread.base_product_id
    or v_grant.analysis_edition_key <> v_thread.analysis_edition_key
    or v_grant.status <> 'active' then
    raise exception 'AI_CONSULTING_ACCESS_BOUNDARY_MISMATCH';
  end if;

  if not (v_grant.base_resource_type = 'general_consulting' and v_grant.base_entitlement_id is null and v_grant.base_product_id = 'ai-consulting-general' and v_grant.analysis_edition_key = 'general-v1') then
    select * into v_entitlement
    from public.entitlements
    where id = v_grant.base_entitlement_id
    for share;
  
    if not found or not v_entitlement.is_active
      or (v_entitlement.service_expires_at is not null and v_entitlement.service_expires_at<=now()) then
      raise exception 'AI_CONSULTING_BASE_ENTITLEMENT_REVOKED';
    end if;
  end if;

  perform 1
  from public.profiles
  where id = v_thread.profile_id and user_id = v_thread.user_id
  for update;

  if not found then
    raise exception 'AI_CONSULTING_PROFILE_BOUNDARY_MISMATCH';
  end if;

  perform public.expire_due_ai_credit_lots(v_thread.user_id,v_thread.profile_id);

  update public.ai_consulting_messages m
  set reservation_released_at = now()
  from public.ai_consulting_threads t
  where m.thread_id = t.id
    and t.user_id = v_thread.user_id
    and t.profile_id = v_thread.profile_id
    and m.role = 'user'
    and m.scope_decision = 'ALLOW'
    and m.charged = false
    and m.reservation_token is not null
    and m.reservation_released_at is null
    and m.reservation_expires_at <= now();

  select * into v_existing
  from public.ai_consulting_messages
  where thread_id = p_thread_id
    and request_id = p_request_id
    and role = 'user'
  for update;
  v_existing_found := found;

  select coalesce(sum(quantity), 0)::integer into v_balance
  from public.ai_consulting_credit_ledger
  where user_id = v_thread.user_id and profile_id = v_thread.profile_id;

  select count(*)::integer into v_reserved
  from public.ai_consulting_messages m
  join public.ai_consulting_threads t on t.id = m.thread_id
  where t.user_id = v_thread.user_id
    and t.profile_id = v_thread.profile_id
    and m.role = 'user'
    and m.scope_decision = 'ALLOW'
    and m.charged = false
    and m.reservation_token is not null
    and m.reservation_released_at is null
    and m.reservation_expires_at > now();

  if v_existing_found then
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
      greatest(0, v_balance - v_reserved);
    return;
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
      greatest(0, v_balance - v_reserved);
    return;
  end if;

  if v_balance - v_reserved <= 0 then
    raise exception 'AI_CONSULTING_NO_PROFILE_CREDIT';
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

  return query select
    v_message.id,
    v_token,
    v_expires_at,
    true,
    greatest(0, v_balance - v_reserved - 1);
end;
$function$;
