-- STEP 52D-1B: bounded guest analysis retention and post-transfer minimization.
-- Guest access/initial transfer remains governed by expires_at. Every guest row
-- is eligible for hard deletion at the absolute created_at + 7 day boundary.

alter table public.guest_free_analyses
  alter column profile_input drop not null,
  alter column profile_fingerprint drop not null,
  add column if not exists transferred_minimized_at timestamptz,
  add column if not exists cleanup_claim_token uuid,
  add column if not exists cleanup_claimed_at timestamptz,
  add column if not exists cleanup_claim_expires_at timestamptz;

alter table public.guest_free_analyses
  drop constraint if exists guest_free_analyses_unconsumed_data_required,
  add constraint guest_free_analyses_unconsumed_data_required check (
    consumed_at is not null
    or (secret_hash is not null and profile_input is not null and profile_fingerprint is not null)
  ) not valid;

alter table public.guest_free_analyses
  drop constraint if exists guest_free_analyses_completed_requires_content,
  add constraint guest_free_analyses_completed_requires_content check (
    status <> 'completed' or content is not null or consumed_at is not null
  );

-- Existing consumed rows no longer need a duplicate personal copy. The hash and
-- transfer linkage remain temporarily for same-user lost-response retry.
update public.guest_free_analyses
set
  profile_input = null,
  profile_fingerprint = null,
  content = null,
  transferred_minimized_at = coalesce(transferred_minimized_at, consumed_at, now()),
  updated_at = now()
where consumed_at is not null
  and (
    profile_input is not null
    or profile_fingerprint is not null
    or content is not null
    or transferred_minimized_at is null
  );

alter table public.guest_free_analyses
  validate constraint guest_free_analyses_unconsumed_data_required;

create index if not exists guest_free_analyses_cleanup_claimable_idx
  on public.guest_free_analyses (created_at, cleanup_claim_expires_at)
  where created_at is not null;

create or replace function public.complete_guest_analysis_transfer(
  p_guest_analysis_id uuid,
  p_secret_hash text,
  p_user_id uuid,
  p_profile_fingerprint text
)
returns table (
  resolved_profile_id uuid,
  selected_product_id text,
  transfer_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guest_free_analyses%rowtype;
  v_profile public.profiles%rowtype;
  v_existing_result public.free_analysis_results%rowtype;
  v_label text;
  v_relationship_type text;
  v_birth_date date;
  v_birth_time time;
  v_gender text;
  v_calendar_type text;
  v_is_leap_month boolean;
  v_guest_content jsonb;
  v_content_profile jsonb;
begin
  select * into v_guest
  from public.guest_free_analyses
  where id = p_guest_analysis_id
  for update;

  if not found or v_guest.secret_hash <> p_secret_hash then
    raise exception 'GUEST_ANALYSIS_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_guest.consumed_at is not null then
    if v_guest.transferred_user_id = p_user_id and v_guest.resolved_profile_id is not null then
      return query select v_guest.resolved_profile_id, v_guest.selected_product_id, 'already_transferred';
      return;
    end if;
    raise exception 'GUEST_ANALYSIS_ALREADY_CONSUMED' using errcode = 'P0001';
  end if;

  if v_guest.status <> 'completed' or v_guest.content is null or v_guest.profile_input is null or v_guest.profile_fingerprint is null then
    raise exception 'GUEST_ANALYSIS_NOT_COMPLETED' using errcode = 'P0001';
  end if;

  if v_guest.expires_at <= now() then
    raise exception 'GUEST_ANALYSIS_EXPIRED' using errcode = 'P0001';
  end if;

  v_label := nullif(btrim(v_guest.profile_input ->> 'label'), '');
  v_relationship_type := v_guest.profile_input ->> 'relationshipType';
  v_birth_date := (v_guest.profile_input ->> 'birthDate')::date;
  v_birth_time := (v_guest.profile_input ->> 'birthTime')::time;
  v_gender := case v_guest.profile_input ->> 'gender' when '남성' then 'male' when '여성' then 'female' else null end;
  v_calendar_type := case v_guest.profile_input ->> 'calendarType' when '양력' then 'solar' when '음력' then 'lunar' else null end;
  v_is_leap_month := (v_guest.profile_input ->> 'isLeapMonth')::boolean;

  if v_label is null
    or v_relationship_type not in ('self', 'spouse', 'child', 'parent', 'sibling', 'other')
    or v_gender is null
    or v_calendar_type is null
    or v_is_leap_month is null then
    raise exception 'GUEST_PROFILE_INPUT_INVALID' using errcode = 'P0001';
  end if;

  select p.* into v_profile
  from public.profiles p
  left join public.active_profiles ap on ap.user_id = p.user_id and ap.profile_id = p.id
  where p.user_id = p_user_id
    and p.birth_date = v_birth_date
    and p.birth_time = v_birth_time
    and p.gender = v_gender
    and p.calendar_type = v_calendar_type
    and p.is_leap_month = v_is_leap_month
  order by (ap.profile_id is not null) desc, p.created_at asc, p.id asc
  limit 1;

  if not found then
    if v_relationship_type = 'self' and exists (
      select 1 from public.profiles where user_id = p_user_id and relationship_type = 'self'
    ) then
      raise exception 'SELF_PROFILE_CONFLICT' using errcode = 'P0001';
    end if;

    insert into public.profiles (
      user_id, label, relationship_type, birth_date, birth_time, gender, calendar_type, is_leap_month
    ) values (
      p_user_id, v_label, v_relationship_type, v_birth_date, v_birth_time, v_gender, v_calendar_type, v_is_leap_month
    ) returning * into v_profile;
  end if;

  if p_profile_fingerprint <> v_guest.profile_fingerprint then
    raise exception 'PROFILE_FINGERPRINT_MISMATCH' using errcode = 'P0001';
  end if;

  select * into v_existing_result
  from public.free_analysis_results
  where user_id = p_user_id and profile_id = v_profile.id
  for update;

  v_content_profile := jsonb_build_object(
    'id', v_profile.id,
    'birthDate', to_char(v_profile.birth_date, 'YYYY-MM-DD'),
    'birthTime', to_char(v_profile.birth_time, 'HH24:MI'),
    'gender', case v_profile.gender when 'male' then '남성' else '여성' end,
    'calendarType', case v_profile.calendar_type when 'solar' then '양력' else '음력' end,
    'isLeapMonth', v_profile.is_leap_month
  );
  v_guest_content := jsonb_set(v_guest.content, '{profile}', v_content_profile, true);

  if not found then
    insert into public.free_analysis_results (
      user_id, profile_id, profile_fingerprint, profile_snapshot, status, content, error_code, completed_at
    ) values (
      p_user_id, v_profile.id, v_guest.profile_fingerprint, v_content_profile, 'completed', v_guest_content, null, now()
    );
  elsif v_existing_result.status = 'completed'
    and v_existing_result.profile_fingerprint = v_guest.profile_fingerprint then
    null;
  elsif v_existing_result.status = 'generating'
    and v_existing_result.profile_fingerprint = v_guest.profile_fingerprint then
    update public.guest_free_analyses
    set
      consumed_at = now(),
      transferred_user_id = p_user_id,
      resolved_profile_id = v_profile.id,
      profile_input = null,
      profile_fingerprint = null,
      content = null,
      transferred_minimized_at = now(),
      updated_at = now()
    where id = v_guest.id;

    insert into public.active_profiles (user_id, profile_id)
    values (p_user_id, v_profile.id)
    on conflict (user_id) do update set profile_id = excluded.profile_id;

    return query select v_profile.id, v_guest.selected_product_id, 'pending_existing_result';
    return;
  else
    update public.free_analysis_results
    set
      profile_fingerprint = v_guest.profile_fingerprint,
      profile_snapshot = v_content_profile,
      status = 'completed',
      content = v_guest_content,
      error_code = null,
      completed_at = now()
    where id = v_existing_result.id;
  end if;

  insert into public.active_profiles (user_id, profile_id)
  values (p_user_id, v_profile.id)
  on conflict (user_id) do update set profile_id = excluded.profile_id;

  update public.guest_free_analyses
  set
    consumed_at = now(),
    transferred_user_id = p_user_id,
    resolved_profile_id = v_profile.id,
    profile_input = null,
    profile_fingerprint = null,
    content = null,
    transferred_minimized_at = now(),
    updated_at = now()
  where id = v_guest.id;

  return query select v_profile.id, v_guest.selected_product_id, 'transferred';
end;
$$;

revoke all on function public.complete_guest_analysis_transfer(uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.complete_guest_analysis_transfer(uuid, text, uuid, text)
  to service_role;

create or replace function public.claim_guest_free_analysis_cleanup(
  requested_limit integer default 25,
  claim_token uuid default gen_random_uuid(),
  lease_seconds integer default 300
)
returns table (id uuid)
language sql
security definer
set search_path = public
as $$
  update public.guest_free_analyses guest
  set
    cleanup_claim_token = claim_token,
    cleanup_claimed_at = now(),
    cleanup_claim_expires_at = now() + make_interval(secs => least(greatest(lease_seconds, 10), 3600)),
    updated_at = now()
  where guest.id in (
    select candidate.id
    from public.guest_free_analyses candidate
    where candidate.created_at <= now() - interval '7 days'
      and (candidate.cleanup_claim_expires_at is null or candidate.cleanup_claim_expires_at <= now())
    order by candidate.created_at asc, candidate.id asc
    limit least(greatest(requested_limit, 1), 25)
    for update skip locked
  )
  returning guest.id;
$$;

revoke all on function public.claim_guest_free_analysis_cleanup(integer, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_guest_free_analysis_cleanup(integer, uuid, integer)
  to service_role;