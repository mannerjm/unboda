-- Phase 9: server-backed active Profile selection.
-- A user may have many profiles but only one active analysis target at a time.

create table if not exists public.active_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  updated_at timestamptz not null default now()
);

create index if not exists active_profiles_profile_id_idx
  on public.active_profiles (profile_id);

create or replace function public.set_active_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists active_profiles_set_updated_at on public.active_profiles;
create trigger active_profiles_set_updated_at
  before update on public.active_profiles
  for each row
  execute function public.set_active_profiles_updated_at();

alter table public.active_profiles enable row level security;

drop policy if exists "active_profiles_select_own" on public.active_profiles;
create policy "active_profiles_select_own"
  on public.active_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.active_profiles from anon, authenticated;
