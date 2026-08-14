-- Phase 10 runtime privilege: service_role bypasses RLS but still requires ACLs.
-- authenticated and anon write revokes from 008 remain unchanged.

grant select, insert, update, delete
  on table public.free_analysis_results
  to service_role;