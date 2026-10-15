-- Solo-operator health and bounded paid-report recovery. No existing purchase/order/refund rows are modified.
create table if not exists public.internal_job_heartbeats (
  job_name text primary key check (job_name in ('reconcile', 'paid_report_recovery')),
  last_attempt_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_error_code text,
  updated_at timestamptz not null default now()
);
alter table public.internal_job_heartbeats enable row level security;
revoke all on public.internal_job_heartbeats from anon, authenticated;
grant select,insert,update on public.internal_job_heartbeats to service_role;

create or replace function public.record_internal_job_heartbeat(
  p_job_name text, p_ok boolean, p_error_code text default null
) returns void language plpgsql security definer set search_path=''
as $$
begin
  if p_job_name not in ('reconcile','paid_report_recovery') or p_ok is null then
    raise exception 'invalid internal job';
  end if;
  insert into public.internal_job_heartbeats(job_name,last_attempt_at,last_success_at,last_error_code,updated_at)
  values(p_job_name,now(),case when p_ok then now() else null end,
     case when p_ok then null else coalesce(left(p_error_code,80),'JOB_FAILED') end,now())
  on conflict(job_name) do update set
    last_attempt_at=excluded.last_attempt_at,
    last_success_at=case when p_ok then now() else internal_job_heartbeats.last_success_at end,
    last_error_code=excluded.last_error_code,
    updated_at=now();
end;
$$;
revoke all on function public.record_internal_job_heartbeat(text,boolean,text) from public,anon,authenticated;
grant execute on function public.record_internal_job_heartbeat(text,boolean,text) to service_role;

create table if not exists public.paid_report_recovery_attempts (
  report_id uuid primary key references public.paid_reports(id) on delete cascade,
  attempt_count integer not null default 0 check(attempt_count between 0 and 3),
  next_retry_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  last_outcome text not null default 'NEW',
  updated_at timestamptz not null default now()
);
alter table public.paid_report_recovery_attempts enable row level security;
revoke all on public.paid_report_recovery_attempts from anon,authenticated;
grant select,insert,update on public.paid_report_recovery_attempts to service_role;
create index if not exists paid_report_recovery_due_idx on public.paid_report_recovery_attempts(next_retry_at, attempt_count);

-- Fully server-side, bounded, skip-locked claiming; no duplicate paid work.
-- Only exact active paid entitlements can be claimed. Invalid immutable snapshots
-- are deliberately excluded and remain visible for representative intervention.
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
    on conflict (report_id) do update set
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