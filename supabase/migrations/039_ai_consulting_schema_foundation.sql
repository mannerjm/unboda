-- AI Consulting Phase 4: schema foundation only.
--
-- This migration creates the persistence boundary for paid AI consultation.
-- It does NOT issue grants, charge questions, call OpenAI, or expose a chat UI.
-- All writes remain server-only. Authenticated browser clients may only read
-- their own rows under RLS.
--
-- Commercial invariant:
--   every consulting grant must originate from a persisted purchase, and is
--   also pinned to exactly one owned paid-analysis entitlement edition.
-- Memory is profile-scoped for long-term continuity, but never creates access.

-- ---------------------------------------------------------------------------
-- Supporting immutable boundary indexes for composite foreign keys.
-- ---------------------------------------------------------------------------
create unique index if not exists purchases_ai_consulting_source_boundary_uidx
  on public.purchases (id, user_id, profile_id, product_id);

create unique index if not exists entitlements_ai_consulting_base_boundary_uidx
  on public.entitlements (
    id,
    user_id,
    profile_id,
    resource_id,
    resource_type,
    analysis_edition_key
  );

-- ---------------------------------------------------------------------------
-- Paid consultation grants.
-- One paid source purchase may issue at most one grant. Multiple purchases may
-- fund additional grants for the same base analysis edition.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_consulting_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,

  source_purchase_id uuid not null,
  source_product_id text not null,

  base_entitlement_id uuid not null,
  base_product_id text not null,
  base_resource_type text not null default 'paid_analysis',
  analysis_edition_key text not null,

  question_limit integer not null,
  questions_used integer not null default 0,
  status text not null default 'active',
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_consulting_grants_source_product_not_blank
    check (length(btrim(source_product_id)) > 0),
  constraint ai_consulting_grants_base_product_not_blank
    check (length(btrim(base_product_id)) > 0),
  constraint ai_consulting_grants_edition_not_blank
    check (length(btrim(analysis_edition_key)) > 0),
  constraint ai_consulting_grants_resource_type_paid_analysis
    check (base_resource_type = 'paid_analysis'),
  constraint ai_consulting_grants_question_limit_positive
    check (question_limit > 0),
  constraint ai_consulting_grants_questions_used_bounded
    check (questions_used >= 0 and questions_used <= question_limit),
  constraint ai_consulting_grants_status_valid
    check (status in ('active', 'exhausted', 'revoked', 'expired')),
  constraint ai_consulting_grants_active_has_capacity
    check (status <> 'active' or questions_used < question_limit),
  constraint ai_consulting_grants_exhausted_at_limit
    check (status <> 'exhausted' or questions_used = question_limit),
  constraint ai_consulting_grants_revocation_metadata
    check (
      (status = 'revoked' and revoked_at is not null)
      or (status <> 'revoked' and revoked_at is null)
    ),
  constraint ai_consulting_grants_source_purchase_unique
    unique (source_purchase_id),
  constraint ai_consulting_grants_source_purchase_boundary_fkey
    foreign key (source_purchase_id, user_id, profile_id, source_product_id)
    references public.purchases (id, user_id, profile_id, product_id)
    on delete cascade,
  constraint ai_consulting_grants_base_entitlement_boundary_fkey
    foreign key (
      base_entitlement_id,
      user_id,
      profile_id,
      base_product_id,
      base_resource_type,
      analysis_edition_key
    )
    references public.entitlements (
      id,
      user_id,
      profile_id,
      resource_id,
      resource_type,
      analysis_edition_key
    )
    on delete cascade,
  constraint ai_consulting_grants_boundary_unique
    unique (id, user_id, profile_id, base_product_id, analysis_edition_key)
);

create index if not exists ai_consulting_grants_user_profile_idx
  on public.ai_consulting_grants (user_id, profile_id, status);

create index if not exists ai_consulting_grants_base_analysis_idx
  on public.ai_consulting_grants (
    user_id,
    profile_id,
    base_product_id,
    analysis_edition_key,
    status
  );

-- ---------------------------------------------------------------------------
-- Consultation threads.
-- A thread is hard-pinned to the same user/profile/product/edition as its grant.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_consulting_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  grant_id uuid not null,
  base_product_id text not null,
  analysis_edition_key text not null,
  title text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_consulting_threads_title_length
    check (title is null or length(title) <= 120),
  constraint ai_consulting_threads_status_valid
    check (status in ('active', 'archived')),
  constraint ai_consulting_threads_grant_boundary_fkey
    foreign key (grant_id, user_id, profile_id, base_product_id, analysis_edition_key)
    references public.ai_consulting_grants (
      id,
      user_id,
      profile_id,
      base_product_id,
      analysis_edition_key
    )
    on delete cascade,
  constraint ai_consulting_threads_owner_boundary_unique
    unique (id, user_id, profile_id)
);

create index if not exists ai_consulting_threads_user_profile_idx
  on public.ai_consulting_threads (user_id, profile_id, updated_at desc);

create index if not exists ai_consulting_threads_grant_idx
  on public.ai_consulting_threads (grant_id, status, updated_at desc);

-- ---------------------------------------------------------------------------
-- Messages.
-- scope_decision is an immutable audit snapshot of the pre-LLM scope gate.
-- A charged message must be a user question that was ALLOWed. Actual question
-- consumption will later be performed by one atomic server-side transaction.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_consulting_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  content text not null,
  scope_decision text,
  scope_reason_code text,
  charged boolean not null default false,
  model text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),

  constraint ai_consulting_messages_role_valid
    check (role in ('user', 'assistant')),
  constraint ai_consulting_messages_content_not_blank
    check (length(btrim(content)) > 0),
  constraint ai_consulting_messages_content_hard_cap
    check (length(content) <= 8000),
  constraint ai_consulting_messages_user_question_cap
    check (role <> 'user' or length(content) <= 300),
  constraint ai_consulting_messages_scope_valid
    check (
      scope_decision is null
      or scope_decision in ('ALLOW', 'CLARIFY', 'DENY', 'SAFETY_REDIRECT')
    ),
  constraint ai_consulting_messages_user_scope_required
    check (
      (role = 'user' and scope_decision is not null)
      or (role = 'assistant' and scope_decision is null)
    ),
  constraint ai_consulting_messages_charge_only_allowed_user
    check (not charged or (role = 'user' and scope_decision = 'ALLOW')),
  constraint ai_consulting_messages_user_has_no_model_usage
    check (
      role <> 'user'
      or (model is null and input_tokens is null and output_tokens is null)
    ),
  constraint ai_consulting_messages_token_counts_non_negative
    check (
      (input_tokens is null or input_tokens >= 0)
      and (output_tokens is null or output_tokens >= 0)
    ),
  constraint ai_consulting_messages_thread_boundary_fkey
    foreign key (thread_id, user_id, profile_id)
    references public.ai_consulting_threads (id, user_id, profile_id)
    on delete cascade,
  constraint ai_consulting_messages_owner_boundary_unique
    unique (id, user_id, profile_id)
);

create index if not exists ai_consulting_messages_thread_created_idx
  on public.ai_consulting_messages (thread_id, created_at, id);

create index if not exists ai_consulting_messages_user_profile_recent_idx
  on public.ai_consulting_messages (user_id, profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Long-term profile memory.
-- Memory intentionally has NO grant FK: it can survive across paid consulting
-- purchases for the same profile. It still cannot create permission to answer.
-- Provenance is mandatory so AI-derived interpretation is never silently
-- promoted to a user-stated fact.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_consulting_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  provenance text not null,
  content text not null,
  source_thread_id uuid,
  source_message_id uuid,
  status text not null default 'active',
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_consulting_memories_kind_valid
    check (
      kind in (
        'user_fact',
        'life_event',
        'goal',
        'preference',
        'consultation_summary',
        'analysis_interpretation'
      )
    ),
  constraint ai_consulting_memories_provenance_valid
    check (provenance in ('USER_STATED', 'ANALYSIS_DERIVED', 'SYSTEM_SUMMARY')),
  constraint ai_consulting_memories_status_valid
    check (status in ('active', 'superseded', 'deleted')),
  constraint ai_consulting_memories_content_not_blank
    check (length(btrim(content)) > 0),
  constraint ai_consulting_memories_content_cap
    check (length(content) <= 1200),
  constraint ai_consulting_memories_tags_cap
    check (cardinality(tags) <= 12),
  constraint ai_consulting_memories_summary_provenance
    check (kind <> 'consultation_summary' or provenance = 'SYSTEM_SUMMARY'),
  constraint ai_consulting_memories_analysis_provenance
    check (kind <> 'analysis_interpretation' or provenance = 'ANALYSIS_DERIVED'),
  constraint ai_consulting_memories_source_thread_boundary_fkey
    foreign key (source_thread_id, user_id, profile_id)
    references public.ai_consulting_threads (id, user_id, profile_id)
    on delete set null (source_thread_id),
  constraint ai_consulting_memories_source_message_boundary_fkey
    foreign key (source_message_id, user_id, profile_id)
    references public.ai_consulting_messages (id, user_id, profile_id)
    on delete set null (source_message_id)
);

create index if not exists ai_consulting_memories_user_profile_active_idx
  on public.ai_consulting_memories (user_id, profile_id, updated_at desc)
  where status = 'active';

create index if not exists ai_consulting_memories_tags_gin_idx
  on public.ai_consulting_memories using gin (tags);

-- ---------------------------------------------------------------------------
-- updated_at maintenance with explicit search_path.
-- ---------------------------------------------------------------------------
create or replace function public.set_ai_consulting_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_ai_consulting_updated_at() from public, anon, authenticated;

for_grants: begin
  drop trigger if exists ai_consulting_grants_set_updated_at on public.ai_consulting_grants;
  create trigger ai_consulting_grants_set_updated_at
    before update on public.ai_consulting_grants
    for each row execute function public.set_ai_consulting_updated_at();
end for_grants;

for_threads: begin
  drop trigger if exists ai_consulting_threads_set_updated_at on public.ai_consulting_threads;
  create trigger ai_consulting_threads_set_updated_at
    before update on public.ai_consulting_threads
    for each row execute function public.set_ai_consulting_updated_at();
end for_threads;

for_memories: begin
  drop trigger if exists ai_consulting_memories_set_updated_at on public.ai_consulting_memories;
  create trigger ai_consulting_memories_set_updated_at
    before update on public.ai_consulting_memories
    for each row execute function public.set_ai_consulting_updated_at();
end for_memories;

-- ---------------------------------------------------------------------------
-- RLS: read-own only for authenticated clients; writes are server-only.
-- ---------------------------------------------------------------------------
alter table public.ai_consulting_grants enable row level security;
alter table public.ai_consulting_threads enable row level security;
alter table public.ai_consulting_messages enable row level security;
alter table public.ai_consulting_memories enable row level security;

drop policy if exists "ai_consulting_grants_select_own" on public.ai_consulting_grants;
create policy "ai_consulting_grants_select_own"
  on public.ai_consulting_grants for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_consulting_threads_select_own" on public.ai_consulting_threads;
create policy "ai_consulting_threads_select_own"
  on public.ai_consulting_threads for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_consulting_messages_select_own" on public.ai_consulting_messages;
create policy "ai_consulting_messages_select_own"
  on public.ai_consulting_messages for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_consulting_memories_select_own" on public.ai_consulting_memories;
create policy "ai_consulting_memories_select_own"
  on public.ai_consulting_memories for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.ai_consulting_grants from anon;
revoke all on public.ai_consulting_threads from anon;
revoke all on public.ai_consulting_messages from anon;
revoke all on public.ai_consulting_memories from anon;

grant select on public.ai_consulting_grants to authenticated;
grant select on public.ai_consulting_threads to authenticated;
grant select on public.ai_consulting_messages to authenticated;
grant select on public.ai_consulting_memories to authenticated;

revoke insert, update, delete on public.ai_consulting_grants from authenticated;
revoke insert, update, delete on public.ai_consulting_threads from authenticated;
revoke insert, update, delete on public.ai_consulting_messages from authenticated;
revoke insert, update, delete on public.ai_consulting_memories from authenticated;

grant select, insert, update, delete on public.ai_consulting_grants to service_role;
grant select, insert, update, delete on public.ai_consulting_threads to service_role;
grant select, insert, update, delete on public.ai_consulting_messages to service_role;
grant select, insert, update, delete on public.ai_consulting_memories to service_role;

-- ---------------------------------------------------------------------------
-- Account-closure personal-data cleanup extension.
-- Consultation text, titles and long-term memories are personal data and must
-- not survive the existing DB scrub boundary. Commercial grant metadata is
-- revoked here and remains only until the later Auth-user cascade removes it.
-- Existing financial checks and public function signature are unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.execute_account_closure_db_cleanup(p_user_id uuid)
returns public.account_lifecycles
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_account public.account_lifecycles%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('account_closure_financial:' || p_user_id::text));

  select * into v_account
  from public.account_lifecycles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Account lifecycle not found for user %', p_user_id;
  end if;

  if v_account.status = 'CLOSED' or v_account.finalized_at is not null then
    return v_account;
  end if;

  if v_account.status <> 'DELETION_REQUESTED' then
    raise exception 'Account must be in DELETION_REQUESTED state to execute cleanup';
  end if;

  if v_account.finalization_started_at is null then
    raise exception 'Finalization has not been started for user %', p_user_id;
  end if;

  if v_account.data_scrubbed_at is not null then
    return v_account;
  end if;

  if public.has_account_closure_financial_blockers(p_user_id) then
    raise exception 'Cannot execute account closure database cleanup: unresolved financial blockers exist for user %', p_user_id;
  end if;

  delete from public.ai_consulting_memories
  where user_id = p_user_id;

  -- Deleting threads cascades all consultation messages.
  delete from public.ai_consulting_threads
  where user_id = p_user_id;

  update public.ai_consulting_grants
  set
    status = 'revoked',
    revoked_at = now(),
    revocation_reason = 'ACCOUNT_CLOSED',
    updated_at = now()
  where user_id = p_user_id
    and status <> 'revoked';

  delete from public.active_profiles
  where user_id = p_user_id;

  update public.profiles
  set
    label = 'ANONYMIZED',
    relationship_type = 'other',
    birth_date = '1900-01-01'::date,
    birth_time = '00:00:00'::time,
    gender = 'male',
    calendar_type = 'solar',
    is_leap_month = false,
    updated_at = now()
  where user_id = p_user_id;

  update public.paid_reports
  set
    content = '{"scrubbed": true}'::jsonb,
    updated_at = now()
  where user_id = p_user_id
    and (content is null or content <> '{"scrubbed": true}'::jsonb);

  update public.free_analysis_results
  set
    content = null,
    profile_snapshot = null,
    profile_fingerprint = null
  where user_id = p_user_id
    and (
      content is not null
      or profile_snapshot is not null
      or profile_fingerprint is not null
    );

  update public.orders
  set
    analysis_reference_snapshot = case
      when jsonb_typeof(analysis_reference_snapshot) = 'object'
        and jsonb_typeof(analysis_reference_snapshot -> 'anchorDate') = 'string'
      then jsonb_build_object('anchorDate', analysis_reference_snapshot -> 'anchorDate')
      else null
    end,
    analysis_input_snapshot = null
  where user_id = p_user_id
    and (analysis_reference_snapshot is not null or analysis_input_snapshot is not null);

  update public.purchases
  set
    analysis_reference_snapshot = case
      when jsonb_typeof(analysis_reference_snapshot) = 'object'
        and jsonb_typeof(analysis_reference_snapshot -> 'anchorDate') = 'string'
      then jsonb_build_object('anchorDate', analysis_reference_snapshot -> 'anchorDate')
      else null
    end,
    analysis_input_snapshot = null
  where user_id = p_user_id
    and (analysis_reference_snapshot is not null or analysis_input_snapshot is not null);

  delete from public.interested_analyses
  where user_id = p_user_id;

  delete from public.guest_free_analyses
  where transferred_user_id = p_user_id
    and consumed_at is not null;

  update public.entitlements
  set
    is_active = false,
    revoked_at = now(),
    revocation_reason = 'ACCOUNT_CLOSED'
  where user_id = p_user_id
    and is_active = true;

  update public.account_lifecycles
  set
    data_scrubbed_at = now(),
    updated_at = now()
  where user_id = p_user_id
  returning * into v_account;

  return v_account;
end;
$$;

revoke all on function public.execute_account_closure_db_cleanup(uuid) from public, anon, authenticated;
grant execute on function public.execute_account_closure_db_cleanup(uuid) to service_role;
