-- Credit checkout scope, provenance and atomic no-money closure.
alter table public.toss_payment_records add column if not exists checkout_route_fingerprint text;
alter table public.toss_payment_records add column if not exists credit_approval_started_at timestamptz;
alter table public.operator_audit_events drop constraint operator_audit_events_action_valid;
alter table public.operator_audit_events add constraint operator_audit_events_action_valid check (action in ('CUSTOMER_LOOKUP','ORDER_LOOKUP','FAILURE_QUEUE_VIEW','SUPPORT_REQUEST_VIEW','SUPPORT_REQUEST_UPDATE','REVIEW_MODERATE','PAYMENT_RECHECK','UNPAID_ORDER_CLOSE'));

create or replace function public.begin_ai_credit_confirmation(p_order_id uuid,p_user_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.user_id<>p_user_id or v_order.payment_provider<>'toss_ai_credit' or v_order.status<>'pending' then return false; end if;
 update public.toss_payment_records set credit_approval_started_at=coalesce(credit_approval_started_at,now()), confirmation_started_at=now(), reconciliation_status='confirmation_started', updated_at=now(),last_attempt_at=now()
 where order_id=p_order_id and reconciliation_status not in ('paid','externally_confirmed','expired_unpaid','terminal_mismatch');
 return found;
end; $$;
revoke all on function public.begin_ai_credit_confirmation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.begin_ai_credit_confirmation(uuid,uuid) to service_role;

create or replace function public.close_verified_unpaid_ai_credit_order(p_order_id uuid,p_provider_status text,p_expected_amount integer,p_route_fingerprint text,p_legacy_dashboard_confirmed boolean default false)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype; t public.toss_payment_records%rowtype;
begin
 if p_provider_status is null or p_provider_status not in ('EXPIRED','ABORTED','NOT_FOUND_PAYMENT') or p_route_fingerprint is null or length(p_route_fingerprint)<>64 then return false; end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.payment_provider is distinct from 'toss_ai_credit' or o.product_id not in ('ai-consulting-3','ai-consulting-5','ai-consulting-10') or o.status is distinct from 'pending' or o.paid_at is not null or o.transaction_id is not null or o.amount is distinct from p_expected_amount or o.created_at>now()-interval '1 hour' then return false; end if;
 select * into t from public.toss_payment_records where order_id=p_order_id for update;
 if not found or t.expected_amount is distinct from o.amount or t.payment_key is not null or t.confirmed_at is not null or t.confirmed_amount is not null or t.credit_approval_started_at is not null or t.last_confirmation_attempt_at is not null
 or (t.provider_status is not null and t.provider_status not in ('READY','IN_PROGRESS','EXPIRED','ABORTED'))
 or t.reconciliation_status in ('paid','externally_confirmed','expired_unpaid')
 or (t.reconciliation_status='terminal_mismatch' and t.last_reconciliation_result is distinct from 'internal Toss order was not found' and t.last_reconciliation_result is distinct from 'Legacy credit checkout needs original merchant verification')
 or (t.checkout_route_fingerprint is not null and t.checkout_route_fingerprint is distinct from p_route_fingerprint)
 or (p_provider_status='NOT_FOUND_PAYMENT' and t.checkout_route_fingerprint is null and p_legacy_dashboard_confirmed is distinct from true)
 or exists(select 1 from public.purchases where order_id=p_order_id)
 or exists(select 1 from public.refund_workflows where order_id=p_order_id)
 or exists(select 1 from public.ai_credit_refund_requests where order_id=p_order_id)
 then return false; end if;
 update public.orders set status='canceled' where id=p_order_id;
 update public.toss_payment_records set reconciliation_status='expired_unpaid',
 provider_status=case when p_provider_status='NOT_FOUND_PAYMENT' then null else p_provider_status end,
 last_reconciliation_result='Verified unpaid credit checkout closed: '||p_provider_status,
 last_reconciled_at=now(),updated_at=now(),last_attempt_at=now()
 where order_id=p_order_id;
 return true;
end; $$;
revoke all on function public.close_verified_unpaid_ai_credit_order(uuid,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.close_verified_unpaid_ai_credit_order(uuid,text,integer,text,boolean) to service_role;
