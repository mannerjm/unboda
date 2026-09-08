-- AI Consulting Phase 9: safe grant-backed chat entry.
--
-- This migration does not issue grants or create commercial access.
-- It only guarantees one active thread per existing paid consulting grant and
-- exposes a service-role-only idempotent get-or-create RPC.

create unique index if not exists ai_consulting_threads_one_active_per_grant_uidx
  on public.ai_consulting_threads (grant_id)
  where status = 'active';

create or replace function public.get_or_create_ai_consulting_thread(
  p_grant_id uuid,
  p_title text default null
)
returns setof public.ai_consulting_threads
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
$$;

revoke all on function public.get_or_create_ai_consulting_thread(uuid, text)
  from public, anon, authenticated;
grant execute on function public.get_or_create_ai_consulting_thread(uuid, text)
  to service_role;
