-- Read-only verification for 039_ai_consulting_schema_foundation.sql
-- Run only AFTER the migration has been applied. This file performs SELECTs only.

-- 1) All four tables must exist.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'ai_consulting_grants',
    'ai_consulting_threads',
    'ai_consulting_messages',
    'ai_consulting_memories'
  )
order by table_name;

-- Expected: exactly 4 rows.

-- 2) RLS must be enabled on every consulting table.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'ai_consulting_grants',
    'ai_consulting_threads',
    'ai_consulting_messages',
    'ai_consulting_memories'
  )
order by c.relname;

-- Expected: exactly 4 rows, every rls_enabled = true.

-- 3) Authenticated users must have SELECT-only table privileges.
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and table_name in (
    'ai_consulting_grants',
    'ai_consulting_threads',
    'ai_consulting_messages',
    'ai_consulting_memories'
  )
order by table_name, privilege_type;

-- Expected: SELECT only. No INSERT / UPDATE / DELETE.

-- 4) RLS policies must be own-user SELECT policies only.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'ai_consulting_grants',
    'ai_consulting_threads',
    'ai_consulting_messages',
    'ai_consulting_memories'
  )
order by tablename, policyname;

-- Expected: one SELECT policy per table for authenticated, qual contains auth.uid() = user_id.

-- 5) Boundary foreign keys must exist.
select conname, conrelid::regclass as child_table, confrelid::regclass as parent_table
from pg_constraint
where contype = 'f'
  and conname in (
    'ai_consulting_grants_source_purchase_boundary_fkey',
    'ai_consulting_grants_base_entitlement_boundary_fkey',
    'ai_consulting_threads_grant_boundary_fkey',
    'ai_consulting_messages_thread_boundary_fkey',
    'ai_consulting_memories_source_thread_boundary_fkey',
    'ai_consulting_memories_source_message_boundary_fkey'
  )
order by conname;

-- Expected: exactly 6 rows.

-- 6) Security-definer account-closure function must retain explicit search_path
-- and must not be executable by public/anon/authenticated.
select
  p.oid::regprocedure as function_name,
  p.prosecdef as security_definer,
  p.proconfig as function_config,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'execute_account_closure_db_cleanup'
  and pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid';

-- Expected: one row; security_definer=true; function_config contains
-- search_path=public, auth, pg_temp; public/anon/authenticated=false;
-- service_role=true.

-- 7) Fresh migration must not create any consultation data by itself.
select
  (select count(*) from public.ai_consulting_grants) as grants,
  (select count(*) from public.ai_consulting_threads) as threads,
  (select count(*) from public.ai_consulting_messages) as messages,
  (select count(*) from public.ai_consulting_memories) as memories;

-- Expected immediately after first application: 0 / 0 / 0 / 0.
