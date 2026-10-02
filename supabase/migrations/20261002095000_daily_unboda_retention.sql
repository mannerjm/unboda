-- Daily Unboda retention measurement.
-- Stores no birth data, fortune text, report content, consultation text, IP, or user agent.
-- TODAY_VIEWED is one idempotent account/profile/day marker after a valid daily reading renders.

alter table public.customer_journey_events
  add column if not exists profile_id uuid;

alter table public.customer_journey_events
  drop constraint if exists customer_journey_events_profile_id_fkey;
alter table public.customer_journey_events
  add constraint customer_journey_events_profile_id_fkey
  foreign key (profile_id) references public.profiles(id) on delete cascade;

alter table public.customer_journey_events
  drop constraint if exists customer_journey_events_event_name_check;
alter table public.customer_journey_events
  add constraint customer_journey_events_event_name_check check (
    event_name in (
      'PAGE_VISIT','PRODUCT_SELECTED','PRODUCT_DETAIL_VIEWED',
      'CHECKOUT_VIEWED','REPORT_PAGE_OPENED','AI_CHAT_PAGE_OPENED','TODAY_VIEWED'
    )
  );

alter table public.customer_journey_events
  drop constraint if exists customer_journey_today_profile_required;
alter table public.customer_journey_events
  add constraint customer_journey_today_profile_required check (
    event_name <> 'TODAY_VIEWED'
    or (account_id is not null and profile_id is not null)
  );

create index if not exists customer_journey_events_profile_date_idx
  on public.customer_journey_events(profile_id,event_date_kst)
  where profile_id is not null;

create unique index if not exists customer_journey_today_profile_unique
  on public.customer_journey_events(account_id,profile_id,event_date_kst)
  where event_name='TODAY_VIEWED' and account_id is not null and profile_id is not null;

create or replace function public.get_admin_daily_unboda_retention()
returns jsonb
language sql stable security invoker
set search_path = public
as $$
with bounds as (
  select timezone('Asia/Seoul',now())::date as today
),
daily_events as (
  select account_id,event_date_kst
  from public.customer_journey_events
  where event_name='TODAY_VIEWED' and account_id is not null
  group by account_id,event_date_kst
),
first_daily as (
  select account_id,min(event_date_kst) as first_day
  from daily_events
  group by account_id
),
retention as (
  select
    (select count(distinct account_id) from daily_events
      where event_date_kst=(select today from bounds))::integer as viewed_today,
    (select count(distinct account_id) from daily_events
      where event_date_kst=(select today-1 from bounds))::integer as viewed_yesterday,
    (select count(distinct y.account_id)
      from daily_events y
      where y.event_date_kst=(select today-1 from bounds)
        and exists (
          select 1 from daily_events t
          where t.account_id=y.account_id
            and t.event_date_kst=(select today from bounds)
        ))::integer as returned_today_from_yesterday,
    (select count(*) from (
      select account_id
      from daily_events
      where event_date_kst between (select today-6 from bounds) and (select today from bounds)
      group by account_id
      having count(distinct event_date_kst) >= 2
    ) active_accounts)::integer as active_2_days_7,
    count(*) filter (
      where first_day <= (select today-1 from bounds)
    )::integer as d1_eligible,
    count(*) filter (
      where first_day <= (select today-1 from bounds)
        and exists (
          select 1 from daily_events e
          where e.account_id=f.account_id
            and e.event_date_kst=f.first_day+1
        )
    )::integer as d1_returned,
    count(*) filter (
      where first_day <= (select today-7 from bounds)
    )::integer as d7_eligible,
    count(*) filter (
      where first_day <= (select today-7 from bounds)
        and exists (
          select 1 from daily_events e
          where e.account_id=f.account_id
            and e.event_date_kst>f.first_day
            and e.event_date_kst<=f.first_day+7
        )
    )::integer as d7_returned
  from first_daily f
)
select jsonb_build_object(
  'todaySince',(select min(event_date_kst) from daily_events),
  'todayViewedToday',(select viewed_today from retention),
  'todayViewedYesterday',(select viewed_yesterday from retention),
  'todayReturnedFromYesterday',(select returned_today_from_yesterday from retention),
  'todayActive2Days7',(select active_2_days_7 from retention),
  'todayD1Eligible',(select d1_eligible from retention),
  'todayD1Returned',(select d1_returned from retention),
  'todayD7Eligible',(select d7_eligible from retention),
  'todayD7Returned',(select d7_returned from retention)
);
$$;

revoke all on function public.get_admin_daily_unboda_retention() from public,anon,authenticated;
grant execute on function public.get_admin_daily_unboda_retention() to service_role;
