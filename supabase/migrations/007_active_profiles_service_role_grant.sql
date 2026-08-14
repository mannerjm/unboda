-- Phase 9 runtime fix: active profile reads and writes remain server-only.
-- service_role bypasses RLS, but still needs PostgreSQL table privileges.
-- The authenticated/anon write revokes in 006 remain unchanged.

grant select, insert, update
  on table public.active_profiles
  to service_role;