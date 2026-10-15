-- Atomic closure of verified EXPIRED, never-paid Toss checkouts.
alter table public.toss_payment_records drop constraint toss_payment_records_status_valid;
alter table public.toss_payment_records add constraint toss_payment_records_status_valid
check (reconciliation_status in ('pending','confirmation_started','externally_confirmed','paid','reconciliation_required','reconciliation_failed','terminal_mismatch','expired_unpaid'));

create or replace function public.close_expired_unpaid_toss_order(
 p_order_id uuid,p_provider_order_id text,p_provider_amount integer,
 p_provider_currency text,p_provider_status text
) returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_order public.orders%rowtype; v_payment public.toss_payment_records%rowtype;
begin
 if p_provider_status is distinct from 'EXPIRED' or p_provider_order_id is distinct from p_order_id::text
    or p_provider_currency is distinct from 'KRW' then return false; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.payment_provider is distinct from 'toss'
    or v_order.status is distinct from 'pending' or v_order.paid_at is not null
    or v_order.transaction_id is not null or v_order.amount is distinct from p_provider_amount then return false; end if;
 select * into v_payment from public.toss_payment_records where order_id=p_order_id for update;
 if not found or v_payment.payment_key is not null or v_payment.confirmed_at is not null
    or v_payment.confirmed_amount is not null
    or (v_payment.provider_status is not null and v_payment.provider_status <> 'EXPIRED')
    or v_payment.reconciliation_status in ('paid','externally_confirmed','terminal_mismatch','expired_unpaid')
    or exists(select 1 from public.purchases where order_id=p_order_id)
    or exists(select 1 from public.refund_workflows where order_id=p_order_id)
 then return false; end if;
 update public.orders set status='canceled' where id=p_order_id and status='pending';
 update public.toss_payment_records
   set reconciliation_status='expired_unpaid',provider_status='EXPIRED',provider_order_id=p_provider_order_id,
       last_reconciliation_result='Toss EXPIRED: unpaid checkout safely closed',last_reconciled_at=now(),updated_at=now()
   where order_id=p_order_id;
 return true;
end;
$$;
revoke all on function public.close_expired_unpaid_toss_order(uuid,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.close_expired_unpaid_toss_order(uuid,text,integer,text,text) to service_role;

-- Only prior provider-EXPIRED evidence with no approval, captured funds or purchase.
-- Preserve all orders and payment evidence; never invent a paid purchase.
do $$
declare r record;
begin
 for r in select t.order_id,t.expected_amount
 from public.toss_payment_records t join public.orders o on o.id=t.order_id
 where t.last_reconciliation_result='provider status EXPIRED is not DONE'
  and t.reconciliation_status='reconciliation_failed' and t.retry_count>=t.max_retry_count
  and o.status='pending' and o.payment_provider='toss'
  and o.paid_at is null and o.transaction_id is null
  and t.payment_key is null and t.confirmed_at is null and t.confirmed_amount is null
  and not exists(select 1 from public.purchases p where p.order_id=t.order_id)
 loop
   perform public.close_expired_unpaid_toss_order(r.order_id,r.order_id::text,r.expected_amount,'KRW','EXPIRED');
 end loop;
end;
$$;