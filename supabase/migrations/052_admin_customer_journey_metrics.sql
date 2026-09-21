-- Customer journey aggregates are service-role only and contain no birth data, report content,
-- consultation text, emails, IP addresses, or payment credentials.
create table if not exists public.customer_journey_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in (
    'PAGE_VISIT', 'PRODUCT_SELECTED', 'PRODUCT_DETAIL_VIEWED',
    'CHECKOUT_VIEWED', 'REPORT_PAGE_OPENED', 'AI_CHAT_PAGE_OPENED'
  )),
  visitor_id uuid,
  account_id uuid,
  product_id text,
  source text check (source is null or source in ('recommendations','deep-analysis','compatibility','other')),
  event_date_kst date not null default (timezone('Asia/Seoul',now())::date),
  occurred_at timestamptz not null default now(),
  constraint customer_journey_has_actor check (visitor_id is not null or account_id is not null),
  constraint customer_journey_product_required check (
    event_name not in ('PRODUCT_SELECTED','PRODUCT_DETAIL_VIEWED','CHECKOUT_VIEWED') or product_id is not null
  )
);
create index if not exists customer_journey_events_type_date_idx
  on public.customer_journey_events(event_name,event_date_kst);
create index if not exists customer_journey_events_account_date_idx
  on public.customer_journey_events(account_id,occurred_at)
  where account_id is not null;
create index if not exists customer_journey_events_visitor_date_idx
  on public.customer_journey_events(visitor_id,event_date_kst)
  where visitor_id is not null;
create unique index if not exists customer_journey_daily_account_visit_unique
  on public.customer_journey_events(account_id,event_date_kst)
  where event_name='PAGE_VISIT' and account_id is not null;
alter table public.customer_journey_events enable row level security;
revoke all on public.customer_journey_events from public,anon,authenticated;
grant select,insert on public.customer_journey_events to service_role;
grant usage,select on sequence public.customer_journey_events_id_seq to service_role;

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
), first_browser as (
  select visitor_id,min(event_date_kst) first_day
  from public.service_analytics_events
  where event_name='VISITOR_DAY' and visitor_id is not null
  group by visitor_id
), browser_cohort as (
  select count(*) filter (where first_day <= (select today-7 from bounds)
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
), first_buy as (
  select p.user_id, min(o.paid_at) as first_paid
  from public.purchases p join public.orders o on o.id=p.order_id
  where o.status='paid' and o.paid_at is not null
  group by p.user_id
), buyer_cohort as (
  select count(*) filter (where first_paid >= (select journey_since from bounds)
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
), selection_cohort as (
  -- Conversion is an authenticated account/product cohort, NOT an unrelated daily-count ratio.
  select distinct on(account_id,product_id) account_id,product_id,occurred_at
  from public.customer_journey_events
  where event_name='PRODUCT_SELECTED' and account_id is not null
    and product_id is not null
    and occurred_at >= (select since30 from bounds)
    and occurred_at <= now()-interval '7 days'
  order by account_id,product_id,occurred_at
), selection_conversion as (
  select count(*)::integer eligible,
    count(*) filter (where exists (
      select 1 from public.orders o
      where o.user_id=s.account_id and o.product_id=s.product_id
        and o.status='paid' and o.paid_at >= s.occurred_at
        and o.paid_at <= s.occurred_at+interval '7 days'
    ))::integer purchased
  from selection_cohort s
), paid_buyers as (
  select count(distinct p.user_id)::integer buyers
  from public.purchases p join public.orders o on o.id=p.order_id
  where o.status='paid' and o.paid_at is not null
), consulting_buyers as (
  select count(distinct p.user_id)::integer consulted
  from public.purchases p join public.orders o on o.id=p.order_id
  where o.status='paid' and o.paid_at is not null
    and exists (
      select 1 from public.ai_consulting_messages m
      where m.user_id=p.user_id and m.role='user' and m.charged=true
        and m.created_at>=o.paid_at
    )
), report_perf as (
  select count(*) filter (where status='completed')::integer completed,
    count(*) filter (where status='failed')::integer failed,
    round(avg(extract(epoch from (completed_at-created_at)))
       filter(where status='completed' and completed_at>=created_at))::integer avg_seconds
  from public.paid_reports
  where purchase_id is not null and created_at >= (select since30 from bounds)
), generation_perf as (
  select count(*) filter (where retry_index>0)::integer retries,
    count(*) filter (where status='failed')::integer failed_attempts
  from public.paid_generation_attempts
  where started_at >= (select since30 from bounds)
)
select jsonb_build_object(
  'visitorSince',(select visitor_since from bounds),
  'journeySince',(select journey_since from bounds),
  'visitor7Eligible',(select eligible7 from browser_cohort),
  'visitor7Returned',(select returned7 from browser_cohort),
  'visitor30Eligible',(select eligible30 from browser_cohort),
  'visitor30Returned',(select returned30 from browser_cohort),
  'buyer7Eligible',(select eligible7 from buyer_cohort),
  'buyer7Returned',(select returned7 from buyer_cohort),
  'buyer30Eligible',(select eligible30 from buyer_cohort),
  'buyer30Returned',(select returned30 from buyer_cohort),
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
  'paidOrders30',(select count(distinct o.id) from public.purchases p
    join public.orders o on o.id=p.order_id
    where o.status='paid' and o.paid_at >= (select since30 from bounds)),
  'paidBuyers',(select buyers from paid_buyers),
  'consultingBuyers',(select consulted from consulting_buyers),
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

-- Remove new account-linked analytics in the same DB transaction as the existing account scrub.
create or replace function public.remove_closed_account_journey()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if old.data_scrubbed_at is null and new.data_scrubbed_at is not null then
    delete from public.customer_journey_events where account_id = new.user_id;
  end if;
  return new;
end;
$$;
revoke all on function public.remove_closed_account_journey() from public,anon,authenticated;
drop trigger if exists remove_closed_account_journey on public.account_lifecycles;
create trigger remove_closed_account_journey
after update of data_scrubbed_at on public.account_lifecycles
for each row
when (old.data_scrubbed_at is null and new.data_scrubbed_at is not null)
execute function public.remove_closed_account_journey();

-- Existing authenticated scheduler periodically removes event-level journey rows after 90 days.
create index if not exists customer_journey_events_occurred_idx
  on public.customer_journey_events(occurred_at);
create or replace function public.prune_customer_journey_events(p_limit integer default 2000)
returns integer language plpgsql security invoker
set search_path = public
as $$
declare removed integer;
begin
  with expired as (
    select id from public.customer_journey_events
    where occurred_at < now() - interval '90 days'
    order by occurred_at
    limit greatest(1,least(coalesce(p_limit,2000),2000))
  )
  delete from public.customer_journey_events e
  using expired x
  where e.id = x.id;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.prune_customer_journey_events(integer) from public,anon,authenticated;
grant execute on function public.prune_customer_journey_events(integer) to service_role;
grant delete on public.customer_journey_events to service_role;
