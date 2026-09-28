-- Growth decision metrics layered on the existing admin dashboard.
-- Stores only first-party random visitor IDs plus coarse acquisition enums.
-- Never store referrer URLs, query strings, IPs, user agents, email, birth data,
-- report content, consultation text, or arbitrary campaign strings.

alter table public.service_analytics_events
  add column if not exists acquisition_channel text,
  add column if not exists acquisition_source text;

alter table public.service_analytics_events
  drop constraint if exists service_analytics_acquisition_channel_valid;
alter table public.service_analytics_events
  add constraint service_analytics_acquisition_channel_valid check (
    acquisition_channel is null or acquisition_channel in (
      'direct','organic_search','paid_campaign','social','shared_link','referral','other'
    )
  );

alter table public.service_analytics_events
  drop constraint if exists service_analytics_acquisition_source_valid;
alter table public.service_analytics_events
  add constraint service_analytics_acquisition_source_valid check (
    acquisition_source is null or acquisition_source in (
      'direct','naver','google','daum','bing','kakao','instagram',
      'facebook','youtube','x','other'
    )
  );

create index if not exists service_analytics_acquisition_idx
  on public.service_analytics_events(acquisition_channel,acquisition_source,event_date_kst)
  where event_name='VISITOR_DAY' and acquisition_channel is not null;

create or replace function public.get_admin_customer_journey_dashboard()
returns jsonb
language sql stable security invoker
set search_path = public
as $$
with bounds as (
  select timezone('Asia/Seoul',now())::date as today,
         now() - interval '30 days' as since30,
         (select min(occurred_at) from public.customer_journey_events) as journey_since,
         (select min(event_date_kst) from public.service_analytics_events
           where event_name='VISITOR_DAY') as visitor_since
),
first_browser as (
  select visitor_id,min(event_date_kst) first_day
  from public.service_analytics_events
  where event_name='VISITOR_DAY' and visitor_id is not null
  group by visitor_id
),
first_acquisition as (
  select distinct on(visitor_id)
    visitor_id,event_date_kst as acquired_day,occurred_at as acquired_at,
    acquisition_channel,acquisition_source
  from public.service_analytics_events
  where event_name='VISITOR_DAY' and visitor_id is not null
    and acquisition_channel is not null and acquisition_source is not null
  order by visitor_id,event_date_kst,occurred_at,id
),
browser_cohort as (
  select
    count(*) filter (where first_day <= (select today-1 from bounds)
      and first_day >= (select visitor_since from bounds))::integer eligible1,
    count(*) filter (where first_day <= (select today-1 from bounds)
      and exists (
        select 1 from public.service_analytics_events v
        where v.event_name='VISITOR_DAY' and v.visitor_id=f.visitor_id
          and v.event_date_kst=f.first_day+1
      ))::integer returned1,
    count(*) filter (where first_day <= (select today-7 from bounds)
      and first_day >= (select visitor_since from bounds))::integer eligible7,
    count(*) filter (where first_day <= (select today-7 from bounds)
      and exists (
        select 1 from public.service_analytics_events v
        where v.event_name='VISITOR_DAY' and v.visitor_id=f.visitor_id
          and v.event_date_kst > f.first_day and v.event_date_kst <= f.first_day+7
      ))::integer returned7,
    count(*) filter (where first_day <= (select today-30 from bounds)
      and first_day >= (select visitor_since from bounds))::integer eligible30,
    count(*) filter (where first_day <= (select today-30 from bounds)
      and exists (
        select 1 from public.service_analytics_events v
        where v.event_name='VISITOR_DAY' and v.visitor_id=f.visitor_id
          and v.event_date_kst > f.first_day and v.event_date_kst <= f.first_day+30
      ))::integer returned30
  from first_browser f
),
first_buy as (
  select user_id,min(paid_at) as first_paid
  from public.orders
  where status='paid' and paid_at is not null
  group by user_id
),
buyer_cohort as (
  select
    count(*) filter (where first_paid >= (select journey_since from bounds)
      and timezone('Asia/Seoul',first_paid)::date <= (select today-1 from bounds))::integer eligible1,
    count(*) filter (where first_paid >= (select journey_since from bounds)
      and timezone('Asia/Seoul',first_paid)::date <= (select today-1 from bounds)
      and exists (
        select 1 from public.customer_journey_events v
        where v.event_name='PAGE_VISIT' and v.account_id=b.user_id
          and v.event_date_kst=timezone('Asia/Seoul',b.first_paid)::date+1
      ))::integer returned1,
    count(*) filter (where first_paid >= (select journey_since from bounds)
      and timezone('Asia/Seoul',first_paid)::date <= (select today-7 from bounds))::integer eligible7,
    count(*) filter (where first_paid >= (select journey_since from bounds)
      and timezone('Asia/Seoul',first_paid)::date <= (select today-7 from bounds)
      and exists (
        select 1 from public.customer_journey_events v
        where v.event_name='PAGE_VISIT' and v.account_id=b.user_id
          and v.event_date_kst > timezone('Asia/Seoul',b.first_paid)::date
          and v.event_date_kst <= timezone('Asia/Seoul',b.first_paid)::date+7
      ))::integer returned7,
    count(*) filter (where first_paid >= (select journey_since from bounds)
      and timezone('Asia/Seoul',first_paid)::date <= (select today-30 from bounds))::integer eligible30,
    count(*) filter (where first_paid >= (select journey_since from bounds)
      and timezone('Asia/Seoul',first_paid)::date <= (select today-30 from bounds)
      and exists (
        select 1 from public.customer_journey_events v
        where v.event_name='PAGE_VISIT' and v.account_id=b.user_id
          and v.event_date_kst > timezone('Asia/Seoul',b.first_paid)::date
          and v.event_date_kst <= timezone('Asia/Seoul',b.first_paid)::date+30
      ))::integer returned30
  from first_buy b
),
first_free as (
  select user_id,min(completed_at) as first_free_completed
  from public.free_analysis_results
  where status='completed' and completed_at is not null
  group by user_id
),
free_to_first_purchase as (
  select
    count(*) filter (where first_free_completed <= now()-interval '7 days')::integer eligible,
    count(*) filter (where first_free_completed <= now()-interval '7 days'
      and b.first_paid >= f.first_free_completed
      and b.first_paid <= f.first_free_completed+interval '7 days')::integer purchased
  from first_free f left join first_buy b using(user_id)
),
second_paid_30 as (
  select
    count(*) filter (where first_paid <= now()-interval '30 days')::integer eligible,
    count(*) filter (where first_paid <= now()-interval '30 days' and exists (
      select 1 from public.orders o
      where o.user_id=b.user_id and o.status='paid' and o.paid_at is not null
        and o.paid_at>b.first_paid and o.paid_at<=b.first_paid+interval '30 days'
    ))::integer repeated
  from first_buy b
),
first_report_buy as (
  select user_id,min(paid_at) as first_report_paid
  from public.orders
  where status='paid' and paid_at is not null
    and coalesce(payment_provider,'') <> 'toss_ai_credit'
  group by user_id
),
report_funnel as (
  select
    count(*)::integer report_buyers,
    count(*) filter (where exists (
      select 1 from public.ai_consulting_messages m
      where m.user_id=r.user_id and m.role='user' and m.charged=true
        and m.created_at>=r.first_report_paid
    ))::integer consulting_buyers,
    count(*) filter (where exists (
      select 1 from public.orders o
      where o.user_id=r.user_id and o.status='paid' and o.paid_at>=r.first_report_paid
        and o.payment_provider='toss_ai_credit'
    ))::integer credit_buyers,
    count(*) filter (where (
      select count(*) from public.orders o
      where o.user_id=r.user_id and o.status='paid' and o.paid_at>=r.first_report_paid
        and o.payment_provider='toss_ai_credit'
    ) >= 2)::integer repeat_credit_buyers
  from first_report_buy r
),
selection_cohort as (
  select distinct on(account_id,product_id) account_id,product_id,occurred_at
  from public.customer_journey_events
  where event_name='PRODUCT_SELECTED' and account_id is not null
    and product_id is not null
    and occurred_at >= (select since30 from bounds)
    and occurred_at <= now()-interval '7 days'
  order by account_id,product_id,occurred_at
),
selection_conversion as (
  select count(*)::integer eligible,
    count(*) filter (where exists (
      select 1 from public.orders o
      where o.user_id=s.account_id and o.product_id=s.product_id
        and o.status='paid' and o.paid_at >= s.occurred_at
        and o.paid_at <= s.occurred_at+interval '7 days'
    ))::integer purchased
  from selection_cohort s
),
account_link as (
  select account_id,visitor_id,min(occurred_at) as linked_at
  from public.customer_journey_events
  where account_id is not null and visitor_id is not null
  group by account_id,visitor_id
),
account_attribution as (
  select distinct on(l.account_id)
    l.account_id,l.visitor_id,l.linked_at,
    a.acquisition_channel,a.acquisition_source,a.acquired_at
  from account_link l
  join first_acquisition a on a.visitor_id=l.visitor_id
  order by l.account_id,l.linked_at,a.acquired_at
),
acquisition_rollup as (
  select a.acquisition_channel,a.acquisition_source,
    count(*)::integer visitors,
    count(distinct aa.account_id)::integer linked_accounts,
    count(distinct aa.account_id) filter (
      where fb.first_paid is not null and fb.first_paid>=aa.linked_at
    )::integer acquired_buyers,
    coalesce(sum(o.amount) filter (
      where o.status='paid' and o.paid_at is not null and o.paid_at>=aa.linked_at
    ),0)::bigint
    - coalesce(sum(rf.requested_amount) filter (
      where rf.status='REFUND_COMPLETED' and o.paid_at is not null and o.paid_at>=aa.linked_at
    ),0)::bigint as net_revenue_krw
  from first_acquisition a
  left join account_attribution aa
    on aa.visitor_id=a.visitor_id
    and aa.acquisition_channel=a.acquisition_channel
    and aa.acquisition_source=a.acquisition_source
  left join first_buy fb on fb.user_id=aa.account_id
  left join public.orders o on o.user_id=aa.account_id
  left join public.refund_workflows rf on rf.order_id=o.id
  group by a.acquisition_channel,a.acquisition_source
),
buyer_window_revenue as (
  select b.user_id,b.first_paid,
    coalesce(sum(o.amount) filter (
      where o.status='paid' and o.paid_at>=b.first_paid
        and o.paid_at<=b.first_paid+interval '30 days'
    ),0)::bigint
    - coalesce(sum(rf.requested_amount) filter (
      where rf.status='REFUND_COMPLETED' and o.paid_at>=b.first_paid
        and o.paid_at<=b.first_paid+interval '30 days'
    ),0)::bigint as net30,
    coalesce(sum(o.amount) filter (
      where o.status='paid' and o.paid_at>=b.first_paid
        and o.paid_at<=b.first_paid+interval '90 days'
    ),0)::bigint
    - coalesce(sum(rf.requested_amount) filter (
      where rf.status='REFUND_COMPLETED' and o.paid_at>=b.first_paid
        and o.paid_at<=b.first_paid+interval '90 days'
    ),0)::bigint as net90
  from first_buy b
  left join public.orders o on o.user_id=b.user_id and o.status='paid' and o.paid_at is not null
  left join public.refund_workflows rf on rf.order_id=o.id
  group by b.user_id,b.first_paid
),
revenue_windows as (
  select
    count(*) filter (where first_paid<=now()-interval '30 days')::integer eligible30,
    coalesce(round(avg(net30) filter (where first_paid<=now()-interval '30 days')),0)::bigint avg30,
    count(*) filter (where first_paid<=now()-interval '90 days')::integer eligible90,
    coalesce(round(avg(net90) filter (where first_paid<=now()-interval '90 days')),0)::bigint avg90
  from buyer_window_revenue
),
ai_segment_rows as (
  select r.user_id,r.first_report_paid,
    exists (
      select 1 from public.ai_consulting_messages m
      where m.user_id=r.user_id and m.role='user' and m.charged=true
        and m.created_at>=r.first_report_paid
        and m.created_at<=r.first_report_paid+interval '30 days'
    ) as used_ai,
    exists (
      select 1 from public.customer_journey_events v
      where v.event_name='PAGE_VISIT' and v.account_id=r.user_id
        and v.occurred_at>r.first_report_paid
        and v.occurred_at<=r.first_report_paid+interval '30 days'
    ) as returned30,
    exists (
      select 1 from public.orders o
      where o.user_id=r.user_id and o.status='paid' and o.paid_at>r.first_report_paid
        and o.paid_at<=r.first_report_paid+interval '30 days'
        and coalesce(o.payment_provider,'') <> 'toss_ai_credit'
    ) as bought_second_report,
    coalesce((
      select sum(o.amount) from public.orders o
      where o.user_id=r.user_id and o.status='paid'
        and o.paid_at>=r.first_report_paid
        and o.paid_at<=r.first_report_paid+interval '30 days'
    ),0)::bigint
    - coalesce((
      select sum(rf.requested_amount)
      from public.refund_workflows rf
      join public.orders o on o.id=rf.order_id
      where o.user_id=r.user_id and rf.status='REFUND_COMPLETED'
        and o.paid_at>=r.first_report_paid
        and o.paid_at<=r.first_report_paid+interval '30 days'
    ),0)::bigint as net30
  from first_report_buy r
  where r.first_report_paid<=now()-interval '30 days'
),
ai_segment as (
  select
    count(*) filter(where used_ai)::integer ai_users,
    count(*) filter(where used_ai and returned30)::integer ai_returned,
    count(*) filter(where used_ai and bought_second_report)::integer ai_second_report,
    coalesce(round(avg(net30) filter(where used_ai)),0)::bigint ai_avg_net30,
    count(*) filter(where not used_ai)::integer non_ai_users,
    count(*) filter(where not used_ai and returned30)::integer non_ai_returned,
    count(*) filter(where not used_ai and bought_second_report)::integer non_ai_second_report,
    coalesce(round(avg(net30) filter(where not used_ai)),0)::bigint non_ai_avg_net30
  from ai_segment_rows
),
paid_buyers as (
  select count(*)::integer buyers from first_buy
),
consulting_buyers as (
  select count(*)::integer consulted
  from first_buy b
  where exists (
    select 1 from public.ai_consulting_messages m
    where m.user_id=b.user_id and m.role='user' and m.charged=true
      and m.created_at>=b.first_paid
  )
),
report_perf as (
  select count(*) filter (where status='completed')::integer completed,
    count(*) filter (where status='failed')::integer failed,
    round(avg(extract(epoch from (completed_at-created_at)))
       filter(where status='completed' and completed_at>=created_at))::integer avg_seconds
  from public.paid_reports
  where purchase_id is not null and created_at >= (select since30 from bounds)
),
generation_perf as (
  select count(*) filter (where retry_index>0)::integer retries,
    count(*) filter (where status='failed')::integer failed_attempts
  from public.paid_generation_attempts
  where started_at >= (select since30 from bounds)
)
select jsonb_build_object(
  'visitorSince',(select visitor_since from bounds),
  'journeySince',(select journey_since from bounds),
  'visitor1Eligible',(select eligible1 from browser_cohort),
  'visitor1Returned',(select returned1 from browser_cohort),
  'visitor7Eligible',(select eligible7 from browser_cohort),
  'visitor7Returned',(select returned7 from browser_cohort),
  'visitor30Eligible',(select eligible30 from browser_cohort),
  'visitor30Returned',(select returned30 from browser_cohort),
  'buyer1Eligible',(select eligible1 from buyer_cohort),
  'buyer1Returned',(select returned1 from buyer_cohort),
  'buyer7Eligible',(select eligible7 from buyer_cohort),
  'buyer7Returned',(select returned7 from buyer_cohort),
  'buyer30Eligible',(select eligible30 from buyer_cohort),
  'buyer30Returned',(select returned30 from buyer_cohort),
  'freeToFirstPurchaseEligible',(select eligible from free_to_first_purchase),
  'freeToFirstPurchase7',(select purchased from free_to_first_purchase),
  'secondPaid30Eligible',(select eligible from second_paid_30),
  'secondPaid30Repeated',(select repeated from second_paid_30),
  'selected7Eligible',(select eligible from selection_conversion),
  'selected7Purchased',(select purchased from selection_conversion),
  'productSelected',(select count(*) from public.customer_journey_events
    where event_name='PRODUCT_SELECTED' and occurred_at >= (select since30 from bounds)),
  'productDetailViewed',(select count(*) from public.customer_journey_events
    where event_name='PRODUCT_DETAIL_VIEWED' and occurred_at >= (select since30 from bounds)),
  'checkoutViewed',(select count(*) from public.customer_journey_events
    where event_name='CHECKOUT_VIEWED' and occurred_at >= (select since30 from bounds)),
  'reportPageOpened',(select count(*) from public.customer_journey_events
    where event_name='REPORT_PAGE_OPENED' and occurred_at >= (select since30 from bounds)),
  'paidOrders30',(select count(*) from public.orders
    where status='paid' and paid_at >= (select since30 from bounds)),
  'paidBuyers',(select buyers from paid_buyers),
  'consultingBuyers',(select consulted from consulting_buyers),
  'reportBuyers',(select report_buyers from report_funnel),
  'reportConsultingBuyers',(select consulting_buyers from report_funnel),
  'aiCreditBuyers',(select credit_buyers from report_funnel),
  'aiCreditRepeatBuyers',(select repeat_credit_buyers from report_funnel),
  'revenue30Eligible',(select eligible30 from revenue_windows),
  'averageNetRevenue30Krw',(select avg30 from revenue_windows),
  'revenue90Eligible',(select eligible90 from revenue_windows),
  'averageNetRevenue90Krw',(select avg90 from revenue_windows),
  'aiComparison',jsonb_build_object(
    'aiUsers',(select ai_users from ai_segment),
    'aiReturned30',(select ai_returned from ai_segment),
    'aiSecondReportBuyers30',(select ai_second_report from ai_segment),
    'aiAverageNetRevenue30Krw',(select ai_avg_net30 from ai_segment),
    'nonAiUsers',(select non_ai_users from ai_segment),
    'nonAiReturned30',(select non_ai_returned from ai_segment),
    'nonAiSecondReportBuyers30',(select non_ai_second_report from ai_segment),
    'nonAiAverageNetRevenue30Krw',(select non_ai_avg_net30 from ai_segment)
  ),
  'acquisitionSources',(select coalesce(jsonb_agg(jsonb_build_object(
      'channel',acquisition_channel,'source',acquisition_source,
      'visitors',visitors,'linkedAccounts',linked_accounts,
      'buyers',acquired_buyers,'netRevenueKrw',net_revenue_krw
    ) order by acquired_buyers desc,visitors desc),'[]'::jsonb) from acquisition_rollup),
  'reportsCompleted30',(select completed from report_perf),
  'reportsFailed30',(select failed from report_perf),
  'reportAverageSeconds30',(select avg_seconds from report_perf),
  'generationRetries30',(select retries from generation_perf),
  'generationFailedAttempts30',(select failed_attempts from generation_perf),
  'bySource',(select coalesce(jsonb_object_agg(source,n),'{}'::jsonb)
    from (select coalesce(source,'other') as source,count(*)::integer n
          from public.customer_journey_events
          where event_name='PRODUCT_SELECTED' and occurred_at >= (select since30 from bounds)
          group by 1) x)
);
$$;

revoke all on function public.get_admin_customer_journey_dashboard() from public,anon,authenticated;
grant execute on function public.get_admin_customer_journey_dashboard() to service_role;
