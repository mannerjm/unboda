-- Memory assetization metrics for operator-only product learning.
-- No memory text, consultation text, birth data, IP, or user agent is returned.

create or replace function public.get_admin_memory_asset_metrics()
returns jsonb
language sql stable security invoker
set search_path = public
as $$
with first_memory as (
  select user_id,min(created_at) as first_saved
  from public.ai_consulting_memories
  where provenance='USER_STATED'
  group by user_id
),
memory_d7 as (
  select
    count(*) filter (where first_saved <= now()-interval '7 days')::integer as eligible,
    count(*) filter (
      where first_saved <= now()-interval '7 days'
        and exists (
          select 1
          from public.ai_consulting_messages m
          where m.user_id=f.user_id
            and m.role='user'
            and m.charged=true
            and m.created_at>f.first_saved
            and m.created_at<=f.first_saved+interval '7 days'
        )
    )::integer as returned
  from first_memory f
)
select jsonb_build_object(
  'memoryActiveCount',(
    select count(*)::integer
    from public.ai_consulting_memories
    where provenance='USER_STATED' and status='active'
  ),
  'memoryUsersWithActive',(
    select count(distinct user_id)::integer
    from public.ai_consulting_memories
    where provenance='USER_STATED' and status='active'
  ),
  'memoryProfilesWithActive',(
    select count(distinct profile_id)::integer
    from public.ai_consulting_memories
    where provenance='USER_STATED' and status='active'
  ),
  'memorySaved30',(
    select count(*)::integer
    from public.ai_consulting_memories
    where provenance='USER_STATED' and created_at>=now()-interval '30 days'
  ),
  'memoryChanged30',(
    select count(*)::integer
    from public.ai_consulting_memories
    where provenance='USER_STATED'
      and supersedes_memory_id is not null
      and created_at>=now()-interval '30 days'
  ),
  'memoryD7Eligible',(select eligible from memory_d7),
  'memoryD7Reconsulted',(select returned from memory_d7)
);
$$;

revoke all on function public.get_admin_memory_asset_metrics() from public,anon,authenticated;
grant execute on function public.get_admin_memory_asset_metrics() to service_role;
