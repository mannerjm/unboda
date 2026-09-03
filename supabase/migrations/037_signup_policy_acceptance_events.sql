-- STEP 52D-3C-B: immutable signup policy acceptance evidence foundation.
-- Customer signup activation remains deferred until public policy pages and
-- reviewed wording exist.

create table if not exists public.policy_acceptance_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  policy_type text not null,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  source text not null,
  created_at timestamptz not null default now(),
  constraint policy_acceptance_events_type_valid check (policy_type in ('TERMS', 'AGE_14_PLUS')),
  constraint policy_acceptance_events_type_not_blank check (length(btrim(policy_type)) > 0),
  constraint policy_acceptance_events_version_valid check (length(btrim(policy_version)) between 1 and 80),
  constraint policy_acceptance_events_source_valid check (source in ('SIGNUP')),
  constraint policy_acceptance_events_unique_version unique (user_id, policy_type, policy_version)
);

create index if not exists policy_acceptance_events_user_created_idx
  on public.policy_acceptance_events (user_id, created_at desc);

alter table public.policy_acceptance_events enable row level security;
revoke all on public.policy_acceptance_events from anon, authenticated;
grant select, insert on public.policy_acceptance_events to service_role;

create or replace function public.record_signup_policy_acceptance(
  p_user_id uuid,
  p_terms_version text,
  p_age_policy_version text
)
returns table (terms_accepted boolean, age_14_accepted boolean)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if p_user_id is null
    or p_terms_version is null
    or length(btrim(p_terms_version)) not between 1 and 80
    or p_age_policy_version is null
    or length(btrim(p_age_policy_version)) not between 1 and 80 then
    raise exception 'SIGNUP_POLICY_ACCEPTANCE_INVALID' using errcode = 'P0001';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'SIGNUP_POLICY_USER_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.policy_acceptance_events (user_id, policy_type, policy_version, source)
  values
    (p_user_id, 'TERMS', p_terms_version, 'SIGNUP'),
    (p_user_id, 'AGE_14_PLUS', p_age_policy_version, 'SIGNUP')
  on conflict (user_id, policy_type, policy_version) do nothing;

  return query
  select
    exists (
      select 1 from public.policy_acceptance_events
      where user_id = p_user_id and policy_type = 'TERMS' and policy_version = p_terms_version
    ),
    exists (
      select 1 from public.policy_acceptance_events
      where user_id = p_user_id and policy_type = 'AGE_14_PLUS' and policy_version = p_age_policy_version
    );
end;
$$;

revoke all on function public.record_signup_policy_acceptance(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_signup_policy_acceptance(uuid, text, text) to service_role;
