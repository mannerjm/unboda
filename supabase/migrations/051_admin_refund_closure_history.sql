-- Admin refund + account-closure reporting.
-- Adds explicit closure request/cancel timestamps and a service-role-only report RPC.
-- Historical closure request timestamps are intentionally not fabricated; counts begin when events are recorded.

alter table public.account_lifecycles
  add column if not exists closure_requested_at timestamptz,
  add column if not exists closure_canceled_at timestamptz;

create index if not exists account_lifecycles_closure_requested_idx
  on public.account_lifecycles (closure_requested_at desc)
  where closure_requested_at is not null;
create index if not exists account_lifecycles_finalized_idx
  on public.account_lifecycles (finalized_at desc)
  where finalized_at is not null;

alter table public.service_analytics_events
  drop constraint if exists service_analytics_event_name_valid;

alter table public.service_analytics_events
  add constraint service_analytics_event_name_valid check (
    event_name in (
      'VISITOR_DAY',
      'FREE_ANALYSIS_STARTED',
      'FREE_ANALYSIS_COMPLETED',
      'SIGNUP_COMPLETED',
      'FREE_ANALYSIS_REFRESH_COMPLETED',
      'ACCOUNT_CLOSURE_REQUESTED',
      'ACCOUNT_CLOSURE_CANCELED'
    )
  );

create or replace function public.stamp_account_closure_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status = 'ACTIVE' and new.status = 'DELETION_REQUESTED' then
    new.closure_requested_at := now();
    new.closure_canceled_at := null;
  elsif old.status = 'DELETION_REQUESTED' and new.status = 'ACTIVE' then
    new.closure_canceled_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.record_account_closure_transition_event()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status = 'ACTIVE' and new.status = 'DELETION_REQUESTED' then
    insert into public.service_analytics_events (event_name, actor_kind)
    values ('ACCOUNT_CLOSURE_REQUESTED', 'member');
  elsif old.status = 'DELETION_REQUESTED' and new.status = 'ACTIVE' then
    insert into public.service_analytics_events (event_name, actor_kind)
    values ('ACCOUNT_CLOSURE_CANCELED', 'member');
  end if;
  return null;
end;
$$;

drop trigger if exists account_closure_transition_stamp on public.account_lifecycles;
create trigger account_closure_transition_stamp
before update of status on public.account_lifecycles
for each row
when (old.status is distinct from new.status)
execute function public.stamp_account_closure_transition();

drop trigger if exists account_closure_transition_event on public.account_lifecycles;
create trigger account_closure_transition_event
after update of status on public.account_lifecycles
for each row
when (old.status is distinct from new.status)
execute function public.record_account_closure_transition_event();

revoke all on function public.stamp_account_closure_transition() from public, anon, authenticated;
revoke all on function public.record_account_closure_transition_event() from public, anon, authenticated;
grant execute on function public.stamp_account_closure_transition() to service_role;
grant execute on function public.record_account_closure_transition_event() to service_role;

create or replace function public.get_admin_refund_closure_dashboard(p_limit integer default 20)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with params as (
  select
    greatest(5, least(coalesce(p_limit, 20), 100))::integer as item_limit,
    (timezone('Asia/Seoul', now()))::date as today,
    date_trunc('week', timezone('Asia/Seoul', now()))::date as week_start,
    date_trunc('month', timezone('Asia/Seoul', now()))::date as month_start
),
periods as (
  select 'today'::text as name, today as start_day, today as end_day from params
  union all
  select 'week', week_start, today from params
  union all
  select 'month', month_start, today from params
),
refund_period as (
  select
    p.name,
    count(r.*) filter (where r.status = 'REFUND_COMPLETED' and r.completed_at is not null)::integer as completed_count,
    coalesce(sum(r.requested_amount) filter (where r.status = 'REFUND_COMPLETED' and r.completed_at is not null), 0)::bigint as completed_amount_krw
  from periods p
  left join public.refund_workflows r
    on r.completed_at is not null
   and (timezone('Asia/Seoul', r.completed_at))::date between p.start_day and p.end_day
  group by p.name
),
closure_event_period as (
  select
    p.name,
    count(e.*) filter (where e.event_name = 'ACCOUNT_CLOSURE_REQUESTED')::integer as requested_count,
    count(e.*) filter (where e.event_name = 'ACCOUNT_CLOSURE_CANCELED')::integer as canceled_count
  from periods p
  left join public.service_analytics_events e
    on e.event_date_kst between p.start_day and p.end_day
   and e.event_name in ('ACCOUNT_CLOSURE_REQUESTED', 'ACCOUNT_CLOSURE_CANCELED')
  group by p.name
),
closure_completed_period as (
  select
    p.name,
    count(a.*)::integer as completed_count
  from periods p
  left join public.account_lifecycles a
    on a.finalized_at is not null
   and (timezone('Asia/Seoul', a.finalized_at))::date between p.start_day and p.end_day
  group by p.name
),
period_json as (
  select jsonb_object_agg(
    p.name,
    jsonb_build_object(
      'startDate', p.start_day,
      'endDate', p.end_day,
      'refundCompleted', coalesce(r.completed_count, 0),
      'refundAmountKrw', coalesce(r.completed_amount_krw, 0),
      'closureRequested', coalesce(e.requested_count, 0),
      'closureCanceled', coalesce(e.canceled_count, 0),
      'closureCompleted', coalesce(c.completed_count, 0)
    )
  ) as value
  from periods p
  left join refund_period r on r.name = p.name
  left join closure_event_period e on e.name = p.name
  left join closure_completed_period c on c.name = p.name
),
recent_refunds as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'orderId', x.order_id,
    'productId', x.product_id,
    'requestedAmountKrw', x.requested_amount,
    'status', x.status,
    'providerStatus', x.provider_status,
    'requestedAt', x.requested_at,
    'completedAt', x.completed_at,
    'retryCount', x.retry_count,
    'ownerReviewRequired', x.status = 'OWNER_REVIEW_REQUIRED'
  ) order by x.requested_at desc), '[]'::jsonb) as value
  from (
    select order_id, product_id, requested_amount, status, provider_status, requested_at, completed_at, retry_count
    from public.refund_workflows
    order by requested_at desc
    limit (select item_limit from params)
  ) x
),
recent_closures as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'accountUserId', x.user_id,
    'generation', x.generation,
    'status', x.status,
    'requestedAt', x.closure_requested_at,
    'canceledAt', x.closure_canceled_at,
    'finalizationStartedAt', x.finalization_started_at,
    'finalizedAt', x.finalized_at,
    'retryCount', x.closure_retry_count,
    'ownerReviewRequired', x.closure_owner_review_required
  ) order by coalesce(x.closure_requested_at, x.finalized_at) desc), '[]'::jsonb) as value
  from (
    select user_id, generation, status, closure_requested_at, closure_canceled_at,
      finalization_started_at, finalized_at, closure_retry_count, closure_owner_review_required
    from public.account_lifecycles
    where closure_requested_at is not null or finalized_at is not null
    order by coalesce(closure_requested_at, finalized_at) desc
    limit (select item_limit from params)
  ) x
),
totals as (
  select jsonb_build_object(
    'refundCompleted', (select count(*)::integer from public.refund_workflows where status = 'REFUND_COMPLETED' and completed_at is not null),
    'refundAmountKrw', (select coalesce(sum(requested_amount), 0)::bigint from public.refund_workflows where status = 'REFUND_COMPLETED' and completed_at is not null),
    'closureRequestedTracked', (select count(*)::integer from public.service_analytics_events where event_name = 'ACCOUNT_CLOSURE_REQUESTED'),
    'closureCanceledTracked', (select count(*)::integer from public.service_analytics_events where event_name = 'ACCOUNT_CLOSURE_CANCELED'),
    'closureCompleted', (select count(*)::integer from public.account_lifecycles where finalized_at is not null),
    'currentClosurePending', (select count(*)::integer from public.account_lifecycles where status = 'DELETION_REQUESTED' and finalized_at is null),
    'closureOwnerReview', (select count(*)::integer from public.account_lifecycles where closure_owner_review_required = true and finalized_at is null)
  ) as value
)
select jsonb_build_object(
  'generatedAt', now(),
  'timezone', 'Asia/Seoul',
  'periods', coalesce((select value from period_json), '{}'::jsonb),
  'totals', coalesce((select value from totals), '{}'::jsonb),
  'recentRefunds', coalesce((select value from recent_refunds), '[]'::jsonb),
  'recentClosures', coalesce((select value from recent_closures), '[]'::jsonb)
);
$$;

revoke all on function public.get_admin_refund_closure_dashboard(integer) from public, anon, authenticated;
grant execute on function public.get_admin_refund_closure_dashboard(integer) to service_role;
