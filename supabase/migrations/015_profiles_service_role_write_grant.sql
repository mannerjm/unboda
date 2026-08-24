-- profiles application write flows run through the service_role server client.
-- SELECT is granted separately by migration 014.
-- Grant only the remaining table operations required by profile CRUD.

grant insert, update, delete
  on table public.profiles
  to service_role;
