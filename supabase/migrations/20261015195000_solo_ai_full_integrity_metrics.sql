-- Exact 24h AI accounting: no 500-row sampling window, and no sensitive message contents returned.
create or replace function public.list_ai_charge_integrity_incidents_24h()
returns table(message_id uuid, message_created_at timestamptz)
language sql stable security definer set search_path=''
as $$
  select m.id, m.created_at
  from public.ai_consulting_messages m
  where m.role='user' and m.scope_decision='ALLOW'
    and m.created_at>=now()-interval '24 hours'
    and (
      (m.charged=true and (
        not exists(select 1 from public.ai_consulting_messages a where a.role='assistant' and a.reply_to_message_id=m.id)
        or not exists(select 1 from public.ai_consulting_credit_ledger l where l.entry_type='CONSUME' and l.related_message_id=m.id)
      ))
      or (m.charged=false and (
        exists(select 1 from public.ai_consulting_messages a where a.role='assistant' and a.reply_to_message_id=m.id)
        or exists(select 1 from public.ai_consulting_credit_ledger l where l.entry_type='CONSUME' and l.related_message_id=m.id)
      ))
      or (m.charged=false and m.reservation_token is not null and m.reservation_released_at is null
          and m.reservation_expires_at<=now())
      or (m.charged=false and m.reservation_released_at is not null and not exists(
        select 1 from public.ai_consulting_attempts a where a.user_message_id=m.id
      ))
    );
$$;
revoke all on function public.list_ai_charge_integrity_incidents_24h() from public,anon,authenticated;
grant execute on function public.list_ai_charge_integrity_incidents_24h() to service_role;

-- Thresholds use exact rows, not the previous top-500 sample. Estimated USD
-- matches the app's uncached token pricing reference and is NOT an invoice.
create or replace function public.get_ai_solo_operations_metrics_24h()
returns table(attempt_count integer,failed_count integer,duration_count integer,
  average_duration_ms numeric,estimated_cost_usd numeric,unknown_cost_count integer)
language sql stable security definer set search_path=''
as $$
with t as (
  select a.status,a.duration_ms,a.input_tokens,a.output_tokens,
    case
      when a.model='gpt-5' or a.model like 'gpt-5-2025-%' then 1.25
      when a.model='gpt-5.6-luna' or a.model like 'gpt-5.6-luna-%' then 0.2
      when a.model='gpt-5.6-terra' or a.model like 'gpt-5.6-terra-%' then 2.0
      when a.model='gpt-5.6-sol' or a.model like 'gpt-5.6-sol-%' then 4.0
      when a.model='gpt-5.6' then 4.0 else null end::numeric as input_rate,
    case
      when a.model='gpt-5' or a.model like 'gpt-5-2025-%' then 10.0
      when a.model='gpt-5.6-luna' or a.model like 'gpt-5.6-luna-%' then 1.2
      when a.model='gpt-5.6-terra' or a.model like 'gpt-5.6-terra-%' then 12.0
      when a.model='gpt-5.6-sol' or a.model like 'gpt-5.6-sol-%' then 20.0
      when a.model='gpt-5.6' then 20.0 else null end::numeric as output_rate
  from public.ai_consulting_attempts a
  where a.started_at>=now()-interval '24 hours'
)
select count(*)::integer,
  count(*) filter(where status in ('failed','timed_out'))::integer,
  count(duration_ms)::integer,
  coalesce(avg(duration_ms),0)::numeric,
  coalesce(sum((input_tokens*input_rate+output_tokens*output_rate)/1000000),0)::numeric,
  count(*) filter(where input_rate is null or output_rate is null or input_tokens is null or output_tokens is null)::integer
from t;
$$;
revoke all on function public.get_ai_solo_operations_metrics_24h() from public,anon,authenticated;
grant execute on function public.get_ai_solo_operations_metrics_24h() to service_role;