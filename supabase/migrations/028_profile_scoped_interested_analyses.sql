-- STEP 57D-48D: Profile-Scoped Interested Analyses Foundation
--
-- 1. Create interested_analyses table for user-controlled saved analysis lists
-- 2. Profile-scoped with uniqueness on (user_id, profile_id, product_id)
-- 3. Separate from purchase/entitlement truth
-- 4. Implement RLS policies consistent with existing schema
-- 5. Add appropriate indexes for list lookups

-- ---------------------------------------------------------------------------
-- interested_analyses table
-- ---------------------------------------------------------------------------
create table if not exists public.interested_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint interested_analyses_product_id_not_blank check (length(btrim(product_id)) > 0),
  -- one profile can only save the same analysis once
  constraint interested_analyses_user_profile_product_unique unique (
    user_id,
    profile_id,
    product_id
  )
);

-- Indexes for efficient querying
create index if not exists interested_analyses_user_id_idx
  on public.interested_analyses (user_id);

create index if not exists interested_analyses_profile_id_idx
  on public.interested_analyses (profile_id);

create index if not exists interested_analyses_lookup_idx
  on public.interested_analyses (user_id, profile_id, product_id);

create index if not exists interested_analyses_user_profile_idx
  on public.interested_analyses (user_id, profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.interested_analyses enable row level security;

-- Read-only, self-scoped policy for authenticated users
drop policy if exists "interested_analyses_select_own" on public.interested_analyses;
create policy "interested_analyses_select_own"
  on public.interested_analyses
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Write policies remain empty for authenticated to prevent client-side writes
-- All writes must go through service_role (server-side server actions)

-- ---------------------------------------------------------------------------
-- Service Role Grants
-- ---------------------------------------------------------------------------
grant select, insert, update, delete
  on table public.interested_analyses
  to service_role;
