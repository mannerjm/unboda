-- Staging runtime integration fix: server-side profile ownership verification
-- (e.g. staging diagnostics, admin lookups) needs service_role to read profiles.
-- service_role bypasses RLS, but still needs the PostgreSQL table privilege.
-- Least privilege: SELECT only. No INSERT/UPDATE/DELETE granted here.

grant select
  on table public.profiles
  to service_role;
