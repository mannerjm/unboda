-- Phase 11 runtime privilege: guest analysis persistence and transfer stay server-only.
-- Browser roles retain no direct access to guest rows or the transfer RPC.

grant select, insert, update, delete
  on table public.guest_free_analyses
  to service_role;

grant execute on function public.complete_guest_analysis_transfer(uuid, text, uuid, text)
  to service_role;