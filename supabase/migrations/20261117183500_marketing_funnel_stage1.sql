-- Stage 1 marketing measurement: additive-only. Existing growth metrics and purchase records stay unchanged.
-- Anonymous random browser/session IDs only; never store birth data, names, report text or raw URLs.
alter table public.service_analytics_events
  drop constraint if exists service_analytics_acquisition_source_valid;
alter table public.service_analytics_events
  add constraint service_analytics_acquisition_source_valid
  check (acquisition_source is null or acquisition_source in (
    'direct','naver','google','daum','bing','kakao','instagram','facebook','youtube','x','tiktok','threads','other'
  ));

create table if not exists public.marketing_funnel_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in (
    'SITE_PAGE_VIEWED','FREE_PAGE_VIEWED','FREE_FORM_STARTED','FREE_SUBMIT_CLICKED',
    'FREE_ANALYSIS_STARTED','FREE_ANALYSIS_COMPLETED','FREE_ANALYSIS_FAILED','FREE_RESULT_VIEWED'
  )),
  visitor_id uuid not null,
  session_id uuid not null,
  first_channel text check (first_channel is null or first_channel in (
    'direct','organic_search','paid_campaign','social','shared_link','referral','other'
  )),
  first_source text check (first_source is null or first_source in (
    'direct','naver','google','daum','bing','kakao','instagram','facebook','youtube','x','tiktok','threads','other'
  )),
  current_channel text check (current_channel is null or current_channel in (
    'direct','organic_search','paid_campaign','social','shared_link','referral','other'
  )),
  current_source text check (current_source is null or current_source in (
    'direct','naver','google','daum','bing','kakao','instagram','facebook','youtube','x','tiktok','threads','other'
  )),
  campaign text check (campaign is null or (length(campaign) between 1 and 48 and campaign ~ '^[a-z0-9_-]+$')),
  is_internal boolean not null default false,
  occurred_at timestamptz not null default now(),
  event_date_kst date not null default (timezone('Asia/Seoul',now())::date)
);
create index if not exists marketing_funnel_day_event_idx
  on public.marketing_funnel_events (event_date_kst,event_name);
create index if not exists marketing_funnel_session_time_idx
  on public.marketing_funnel_events (session_id,occurred_at);
create index if not exists marketing_funnel_visitor_time_idx
  on public.marketing_funnel_events (visitor_id,occurred_at);
alter table public.marketing_funnel_events enable row level security;
revoke all on public.marketing_funnel_events from public,anon,authenticated;
grant select,insert,delete on public.marketing_funnel_events to service_role;
revoke all on sequence public.marketing_funnel_events_id_seq from public,anon,authenticated;
grant usage,select on sequence public.marketing_funnel_events_id_seq to service_role;

-- Explicit retention helper; the existing scheduler can call it after separate verification.
create or replace function public.prune_marketing_funnel_events(p_limit integer default 2000)
returns integer language plpgsql security invoker set search_path = public
as $$
declare removed integer;
begin
  with expired as (
    select id from public.marketing_funnel_events
    where occurred_at < now() - interval '90 days'
    order by occurred_at
    limit greatest(1,least(coalesce(p_limit,2000),2000))
  )
  delete from public.marketing_funnel_events m using expired e where m.id=e.id;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.prune_marketing_funnel_events(integer) from public,anon,authenticated;
grant execute on function public.prune_marketing_funnel_events(integer) to service_role;
