-- Phase 3C: Profile persistence
--
-- Profiles are birth-chart subjects owned by a Supabase Auth user. Profile
-- writes are server-only; browser clients may only select their own profiles.
-- Gender/calendar values are language-neutral DB codes. Future server mappers
-- convert the current Korean UI values before persisting them.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  relationship_type text not null default 'self',
  birth_date date not null,
  birth_time time not null,
  gender text not null,
  calendar_type text not null,
  is_leap_month boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_label_not_blank check (length(btrim(label)) > 0),
  constraint profiles_relationship_type_valid check (
    relationship_type in ('self', 'spouse', 'child', 'parent', 'sibling', 'other')
  ),
  constraint profiles_gender_valid check (gender in ('male', 'female')),
  constraint profiles_calendar_type_valid check (calendar_type in ('solar', 'lunar')),
  constraint profiles_solar_not_leap_month check (
    calendar_type = 'lunar' or is_leap_month = false
  )
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);

-- One account can have at most one self profile. Other profiles may share
-- identical birth data because they can represent different people.
create unique index if not exists profiles_one_self_per_user_idx
  on public.profiles (user_id)
  where relationship_type = 'self';

-- Keep this trigger function profile-specific so it has no effect on existing
-- Phase 3B tables or future tables that do not opt into this trigger.
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE policies are defined on purpose. RLS therefore
-- denies client writes; future server routes use the service_role client.
revoke insert, update, delete on public.profiles from anon, authenticated;
