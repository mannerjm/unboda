-- Phase 10: Profile-scoped persistence for free analysis results.
-- The logical identity is user_id + profile_id. A birth-data fingerprint
-- invalidates a cached result without affecting profile metadata changes.

create table if not exists public.free_analysis_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  profile_fingerprint text not null,
  profile_snapshot jsonb not null,
  status text not null default 'generating',
  content jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint free_analysis_results_status_valid
    check (status in ('generating', 'completed', 'failed')),
  constraint free_analysis_results_completed_requires_content
    check (status <> 'completed' or content is not null),
  constraint free_analysis_results_user_profile_unique unique (user_id, profile_id)
);

create index if not exists free_analysis_results_profile_status_idx
  on public.free_analysis_results (profile_id, status);

create or replace function public.set_free_analysis_results_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists free_analysis_results_set_updated_at on public.free_analysis_results;
create trigger free_analysis_results_set_updated_at
  before update on public.free_analysis_results
  for each row
  execute function public.set_free_analysis_results_updated_at();

alter table public.free_analysis_results enable row level security;

drop policy if exists "free_analysis_results_select_own" on public.free_analysis_results;
create policy "free_analysis_results_select_own"
  on public.free_analysis_results
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Browser clients may read only their own completed results through server APIs.
-- Writes remain server-only.
revoke insert, update, delete on public.free_analysis_results from anon, authenticated;