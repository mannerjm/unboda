-- Phase 8B runtime fix: paid_reports writes remain server-only.
-- service_role bypasses RLS, but still requires PostgreSQL table privileges.
-- authenticated/anon write revokes from 004 remain unchanged.

grant select, insert, update, delete
  on table public.paid_reports
  to service_role;
