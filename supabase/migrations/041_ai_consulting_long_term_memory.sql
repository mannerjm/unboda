-- AI Consulting Phase 7: long-term memory persistence and bounded retrieval.
--
-- Goals:
-- * keep user-stated facts separate from analysis-derived interpretation
-- * preserve memory revisions instead of silently overwriting prior content
-- * make retries idempotent
-- * keep memory profile-scoped and never let memory create commercial access
-- * return only a small, deterministic memory set for future prompt construction
-- * all mutation/retrieval RPCs are service_role-only

alter table public.ai_consulting_memories
  add column if not exists write_request_id uuid,
  add column if not exists supersedes_memory_id uuid;

create unique index if not exists ai_consulting_memories_owner_boundary_uidx
  on public.ai_consulting_memories (id, user_id, profile_id);

create unique index if not exists ai_consulting_memories_write_request_uidx
  on public.ai_consulting_memories (user_id, profile_id, write_request_id)
  where write_request_id is not null;

alter table public.ai_consulting_memories
  drop constraint if exists ai_consulting_memories_provenance_kind_pair,
  add constraint ai_consulting_memories_provenance_kind_pair check (
    (provenance = 'USER_STATED' and kind in ('user_fact', 'life_event', 'goal', 'preference'))
    or (provenance = 'ANALYSIS_DERIVED' and kind = 'analysis_interpretation')
    or (provenance = 'SYSTEM_SUMMARY' and kind = 'consultation_summary')
  ),
  drop constraint if exists ai_consulting_memories_supersedes_boundary_fkey,
  add constraint ai_consulting_memories_supersedes_boundary_fkey
    foreign key (supersedes_memory_id, user_id, profile_id)
    references public.ai_consulting_memories (id, user_id, profile_id)
    on delete set null (supersedes_memory_id);

create or replace function public.save_ai_consulting_memory(
  p_user_id uuid,
  p_profile_id uuid,
  p_write_request_id uuid,
  p_kind text,
  p_provenance text,
  p_content text,
  p_tags text[] default '{}'::text[],
  p_source_thread_id uuid default null,
  p_source_message_id uuid default null,
  p_supersedes_memory_id uuid default null
)
returns setof public.ai_consulting_memories
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.ai_consulting_memories%rowtype;
  v_source_thread public.ai_consulting_threads%rowtype;
  v_source_message public.ai_consulting_messages%rowtype;
  v_superseded public.ai_consulting_memories%rowtype;
  v_created public.ai_consulting_memories%rowtype;
  v_tag text;
begin
  if p_user_id is null or p_profile_id is null or p_write_request_id is null then
    raise exception 'AI_CONSULTING_MEMORY_IDENTITY_REQUIRED';
  end if;

  if p_content is null or length(btrim(p_content)) = 0 or length(p_content) > 1200 then
    raise exception 'AI_CONSULTING_MEMORY_INVALID_CONTENT';
  end if;

  if p_tags is null or cardinality(p_tags) > 12 then
    raise exception 'AI_CONSULTING_MEMORY_INVALID_TAGS';
  end if;

  foreach v_tag in array p_tags loop
    if length(btrim(v_tag)) = 0 or length(v_tag) > 40 then
      raise exception 'AI_CONSULTING_MEMORY_INVALID_TAG';
    end if;
  end loop;

  if not (
    (p_provenance = 'USER_STATED' and p_kind in ('user_fact', 'life_event', 'goal', 'preference'))
    or (p_provenance = 'ANALYSIS_DERIVED' and p_kind = 'analysis_interpretation')
    or (p_provenance = 'SYSTEM_SUMMARY' and p_kind = 'consultation_summary')
  ) then
    raise exception 'AI_CONSULTING_MEMORY_PROVENANCE_KIND_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id and p.user_id = p_user_id
  ) then
    raise exception 'AI_CONSULTING_MEMORY_PROFILE_BOUNDARY_MISMATCH';
  end if;

  select * into v_existing
  from public.ai_consulting_memories
  where user_id = p_user_id
    and profile_id = p_profile_id
    and write_request_id = p_write_request_id
  for update;

  if found then
    if v_existing.kind <> p_kind
      or v_existing.provenance <> p_provenance
      or v_existing.content <> p_content
      or v_existing.tags is distinct from p_tags
      or v_existing.source_thread_id is distinct from p_source_thread_id
      or v_existing.source_message_id is distinct from p_source_message_id
      or v_existing.supersedes_memory_id is distinct from p_supersedes_memory_id then
      raise exception 'AI_CONSULTING_MEMORY_WRITE_REPLAY_MISMATCH';
    end if;
    return next v_existing;
    return;
  end if;

  if p_source_thread_id is not null then
    select * into v_source_thread
    from public.ai_consulting_threads
    where id = p_source_thread_id
      and user_id = p_user_id
      and profile_id = p_profile_id;

    if not found then
      raise exception 'AI_CONSULTING_MEMORY_SOURCE_THREAD_MISMATCH';
    end if;
  end if;

  if p_source_message_id is not null then
    select * into v_source_message
    from public.ai_consulting_messages
    where id = p_source_message_id
      and user_id = p_user_id
      and profile_id = p_profile_id;

    if not found then
      raise exception 'AI_CONSULTING_MEMORY_SOURCE_MESSAGE_MISMATCH';
    end if;

    if p_source_thread_id is not null and v_source_message.thread_id <> p_source_thread_id then
      raise exception 'AI_CONSULTING_MEMORY_SOURCE_BOUNDARY_MISMATCH';
    end if;

    if p_provenance = 'USER_STATED' and v_source_message.role <> 'user' then
      raise exception 'AI_CONSULTING_MEMORY_USER_FACT_REQUIRES_USER_SOURCE';
    end if;
  end if;

  if p_supersedes_memory_id is not null then
    select * into v_superseded
    from public.ai_consulting_memories
    where id = p_supersedes_memory_id
      and user_id = p_user_id
      and profile_id = p_profile_id
    for update;

    if not found or v_superseded.status <> 'active' then
      raise exception 'AI_CONSULTING_MEMORY_SUPERSEDED_TARGET_UNAVAILABLE';
    end if;

    if v_superseded.kind <> p_kind or v_superseded.provenance <> p_provenance then
      raise exception 'AI_CONSULTING_MEMORY_SUPERSEDED_TYPE_MISMATCH';
    end if;
  end if;

  insert into public.ai_consulting_memories (
    user_id,
    profile_id,
    kind,
    provenance,
    content,
    source_thread_id,
    source_message_id,
    status,
    tags,
    write_request_id,
    supersedes_memory_id
  ) values (
    p_user_id,
    p_profile_id,
    p_kind,
    p_provenance,
    p_content,
    p_source_thread_id,
    p_source_message_id,
    'active',
    p_tags,
    p_write_request_id,
    p_supersedes_memory_id
  )
  returning * into v_created;

  if p_supersedes_memory_id is not null then
    update public.ai_consulting_memories
    set status = 'superseded'
    where id = p_supersedes_memory_id;
  end if;

  return next v_created;
end;
$$;

revoke all on function public.save_ai_consulting_memory(
  uuid, uuid, uuid, text, text, text, text[], uuid, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.save_ai_consulting_memory(
  uuid, uuid, uuid, text, text, text, text[], uuid, uuid, uuid
) to service_role;

create or replace function public.get_ai_consulting_context_memories(
  p_user_id uuid,
  p_profile_id uuid,
  p_tags text[] default '{}'::text[],
  p_limit integer default 8
)
returns table (
  id uuid,
  kind text,
  provenance text,
  content text,
  tags text[],
  source_thread_id uuid,
  source_message_id uuid,
  supersedes_memory_id uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
begin
  if p_user_id is null or p_profile_id is null then
    raise exception 'AI_CONSULTING_MEMORY_IDENTITY_REQUIRED';
  end if;

  if p_limit < 1 or p_limit > 8 then
    raise exception 'AI_CONSULTING_MEMORY_LIMIT_OUT_OF_RANGE';
  end if;

  if p_tags is null or cardinality(p_tags) > 12 then
    raise exception 'AI_CONSULTING_MEMORY_INVALID_TAGS';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id and p.user_id = p_user_id
  ) then
    raise exception 'AI_CONSULTING_MEMORY_PROFILE_BOUNDARY_MISMATCH';
  end if;

  return query
  select
    m.id,
    m.kind,
    m.provenance,
    m.content,
    m.tags,
    m.source_thread_id,
    m.source_message_id,
    m.supersedes_memory_id,
    m.updated_at
  from public.ai_consulting_memories m
  where m.user_id = p_user_id
    and m.profile_id = p_profile_id
    and m.status = 'active'
  order by
    case
      when cardinality(p_tags) = 0 then 0
      else (
        select count(*)::integer
        from unnest(m.tags) mt(tag)
        where mt.tag = any(p_tags)
      )
    end desc,
    case m.provenance
      when 'USER_STATED' then 0
      when 'ANALYSIS_DERIVED' then 1
      when 'SYSTEM_SUMMARY' then 2
      else 3
    end,
    m.updated_at desc,
    m.id desc
  limit p_limit;
end;
$$;

revoke all on function public.get_ai_consulting_context_memories(uuid, uuid, text[], integer)
  from public, anon, authenticated;
grant execute on function public.get_ai_consulting_context_memories(uuid, uuid, text[], integer)
  to service_role;
