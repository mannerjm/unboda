-- STEP 57D-51C-B: service-role-only exact auth email lookup for CS tooling.

alter table public.operator_audit_events
  drop constraint if exists operator_audit_events_outcome_valid;

alter table public.operator_audit_events
  add constraint operator_audit_events_outcome_valid
  check (outcome in ('SUCCESS', 'NOT_FOUND', 'INVALID_INPUT', 'ERROR'));

create or replace function public.lookup_auth_user_by_exact_email(lookup_email text)
returns table (
  auth_user_id uuid,
  email text,
  email_confirmed_at timestamptz
)
language sql
security definer
set search_path = auth, public
as $$
  select id, email, email_confirmed_at
  from auth.users
  where lower(email) = lower(btrim(lookup_email))
  limit 2;
$$;

revoke all on function public.lookup_auth_user_by_exact_email(text) from public, anon, authenticated;
grant execute on function public.lookup_auth_user_by_exact_email(text) to service_role;