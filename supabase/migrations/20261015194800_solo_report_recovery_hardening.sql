-- Hardening: conflict target is an explicit constraint, never an ambiguous RETURNS TABLE output name.
create or replace function public.claim_due_paid_report_recovery(p_limit integer default 1)
returns table(report_id uuid, user_id uuid, profile_id uuid, product_id text,
  purchase_id uuid, analysis_edition_key text, attempt_count integer)
language plpgsql security definer set search_path=''
as $$
declare r record; v_attempt integer;
begin
  if p_limit < 1 or p_limit > 2 then raise exception 'invalid recovery batch size'; end if;
  for r in
    select pr.id,pr.user_id,pr.profile_id,pr.product_id,pr.purchase_id,pr.analysis_edition_key
    from public.paid_reports pr
    join public.purchases p on p.id=pr.purchase_id and p.user_id=pr.user_id
      and p.profile_id=pr.profile_id and p.product_id=pr.product_id
      and p.analysis_edition_key=pr.analysis_edition_key
    join public.account_lifecycles a on a.user_id=pr.user_id and a.status='ACTIVE'
    join public.entitlements e on e.purchase_id=pr.purchase_id and e.user_id=pr.user_id
      and e.profile_id=pr.profile_id and e.resource_id=pr.product_id
      and e.analysis_edition_key=pr.analysis_edition_key and e.is_active=true
      and (e.service_expires_at is null or e.service_expires_at>now())
    left join public.paid_report_recovery_attempts s on s.report_id=pr.id
    where (pr.status='failed' or (pr.status='generating' and pr.updated_at<now()-interval '15 minutes'))
      and coalesce(pr.error_code,'') <> 'analysis_input_snapshot_invalid'
      and coalesce(s.attempt_count,0)<3
      and (s.next_retry_at is null or s.next_retry_at<=now())
    order by pr.updated_at
    for update of pr skip locked
    limit p_limit
  loop
    insert into public.paid_report_recovery_attempts(report_id,attempt_count,next_retry_at,last_attempt_at,last_outcome,updated_at)
    values(r.id,1,now()+interval '2 hours',now(),'CLAIMED',now())
    on conflict on constraint paid_report_recovery_attempts_pkey do update set
      attempt_count=public.paid_report_recovery_attempts.attempt_count+1,
      next_retry_at=now()+interval '2 hours',
      last_attempt_at=now(),last_outcome='CLAIMED',updated_at=now()
    where public.paid_report_recovery_attempts.attempt_count<3
      and public.paid_report_recovery_attempts.next_retry_at<=now()
    returning paid_report_recovery_attempts.attempt_count into v_attempt;
    if v_attempt is not null then
      report_id:=r.id; user_id:=r.user_id;profile_id:=r.profile_id;
      product_id:=r.product_id;purchase_id:=r.purchase_id;
      analysis_edition_key:=r.analysis_edition_key;attempt_count:=v_attempt;
      return next;
    end if;
    v_attempt:=null;
  end loop;
end;
$$;
revoke all on function public.claim_due_paid_report_recovery(integer) from public,anon,authenticated;
grant execute on function public.claim_due_paid_report_recovery(integer) to service_role;

create or replace function public.count_exhausted_paid_report_recoveries()
returns integer language sql stable security definer set search_path=''
as $$
select count(*)::integer from public.paid_report_recovery_attempts s
join public.paid_reports r on r.id=s.report_id
where s.attempt_count>=3
and (r.status='failed' or (r.status='generating' and r.updated_at<now()-interval '15 minutes'));
$$;
revoke all on function public.count_exhausted_paid_report_recoveries() from public,anon,authenticated;
grant execute on function public.count_exhausted_paid_report_recoveries() to service_role;
