-- Database-only rehearsal; never claim browser/API success from this script.
-- Supply project ref, existing owner/self profile IDs and a parser-validated
-- synthetic stored report through STAGING_TEST_SETUP. No permanent grants/DDL.
begin;
set local statement_timeout = '25s';
-- STAGING_TEST_SETUP

create temporary table profile_scope_results (scenario text primary key, passed boolean);
create function pg_temp.profile_scope_assert(scenario text, passed boolean)
returns void language plpgsql as $$
begin
  if passed is distinct from true then raise exception 'PROFILE_SCOPE_FAILED: %', scenario; end if;
  insert into pg_temp.profile_scope_results values (scenario, true);
end;
$$;

do $$
declare
  owner_id uuid := current_setting('unboda.e2e_user_a', true)::uuid;
  self_id uuid := current_setting('unboda.e2e_profile_a', true)::uuid;
  spouse_id uuid := gen_random_uuid();
  order_a uuid := gen_random_uuid(); order_b uuid := gen_random_uuid();
  purchase_a uuid := gen_random_uuid(); purchase_b uuid := gen_random_uuid();
  report_a uuid := gen_random_uuid(); report_b uuid := gen_random_uuid();
  edition text := 'YEAR:2026';
  marker text := 'STAGING_SYNTHETIC_PROFILE_' || spouse_id;
  base_content jsonb := current_setting('unboda.e2e_report', true)::jsonb;
  canary_path text[] := case when base_content->>'schemaVersion'='v4'
    then array['conclusion','headline'] else array['heroSummary','headline'] end;
  input_a jsonb; input_b jsonb;
  original_self jsonb; original_active jsonb; a_before jsonb;
  finance_before jsonb;
begin
  if current_setting('unboda.e2e_project_ref', true) is distinct from 'xdiitqyysmhicjcytckm'
    or owner_id is null or self_id is null or base_content is null then
    raise exception 'Explicit staging project, owner/self IDs and validated report are required';
  end if;
  select to_jsonb(p) into original_self from public.profiles p
    where p.id=self_id and p.user_id=owner_id and p.relationship_type='self';
  select to_jsonb(a) into original_active from public.active_profiles a where a.user_id=owner_id;
  if original_self is null or original_active is null then raise exception 'Original self/active profile missing'; end if;
  if exists(select 1 from public.orders where user_id=owner_id and profile_id=self_id
      and product_id='career' and analysis_edition_key=edition and status in ('pending','paid'))
    or exists(select 1 from public.entitlements where user_id=owner_id and profile_id=self_id
      and resource_id='career' and analysis_edition_key=edition)
    or exists(select 1 from public.paid_reports where user_id=owner_id and profile_id=self_id
      and product_id='career' and analysis_edition_key=edition) then
    raise exception 'Existing commercial rows must not be modified';
  end if;
  select jsonb_build_array((select count(*) from public.toss_payment_records),
    (select count(*) from public.refund_workflows),(select count(*) from public.ai_consulting_credit_ledger),
    (select count(*) from public.ai_credit_lots),(select count(*) from public.ai_credit_refund_requests),
    (select count(*) from public.ai_consulting_grants),(select count(*) from public.paid_generation_attempts),
    (select count(*) from public.paid_report_recovery_attempts)) into finance_before;

  insert into public.profiles(id,user_id,label,relationship_type,birth_date,birth_time,birth_time_known,gender,calendar_type,is_leap_month)
  values(spouse_id,owner_id,marker,'spouse',date '1992-06-15',time '10:30',true,'female','solar',false);
  perform pg_temp.profile_scope_assert('self and spouse share one owner, with different IDs',
    spouse_id<>self_id and (select user_id=owner_id and relationship_type='spouse' from public.profiles where id=spouse_id));
  select jsonb_build_object('version',1,'birthData',jsonb_build_object(
    'birthDate',birth_date::text,'birthTime',to_char(birth_time,'HH24:MI'),'birthTimeKnown',birth_time_known,
    'calendarType',case calendar_type when 'solar' then '양력' else '음력' end,
    'isLeapMonth',is_leap_month,'gender',case gender when 'male' then '남성' else '여성' end))
    into input_a from public.profiles where id=self_id;
  select jsonb_build_object('version',1,'birthData',jsonb_build_object(
    'birthDate',birth_date::text,'birthTime',to_char(birth_time,'HH24:MI'),'birthTimeKnown',birth_time_known,
    'calendarType','양력','isLeapMonth',false,'gender','여성')) into input_b from public.profiles where id=spouse_id;

  insert into public.orders(id,user_id,profile_id,product_id,amount,status,payment_provider,paid_at,analysis_edition_key,analysis_input_snapshot)
    values(order_a,owner_id,self_id,'career',0,'paid',marker,now(),edition,input_a);
  insert into public.purchases(id,order_id,user_id,profile_id,product_id,analysis_edition_key,analysis_input_snapshot)
    values(purchase_a,order_a,owner_id,self_id,'career',edition,input_a);
  insert into public.entitlements(user_id,profile_id,resource_id,resource_type,purchase_id,source,is_active,analysis_edition_key)
    values(owner_id,self_id,'career','paid_analysis',purchase_a,'purchase',true,edition);
  insert into public.paid_reports(id,user_id,profile_id,product_id,purchase_id,status,content,completed_at,analysis_edition_key)
    values(report_a,owner_id,self_id,'career',purchase_a,'completed',
      jsonb_set(base_content,canary_path,to_jsonb(marker || ' SELF_A_ONLY')),now(),edition);
  update public.active_profiles set profile_id=self_id where user_id=owner_id;
  perform pg_temp.profile_scope_assert('A exact profile/product/edition owns an active entitlement',
    (select count(*)=1 from public.entitlements where user_id=owner_id and profile_id=self_id
      and resource_id='career' and resource_type='paid_analysis' and analysis_edition_key=edition and is_active
      and (service_expires_at is null or service_expires_at>now())));
  perform pg_temp.profile_scope_assert('A completed persisted report contains only A canary',
    (select status='completed' and content#>>canary_path=marker || ' SELF_A_ONLY' from public.paid_reports where id=report_a));
  select jsonb_build_array(to_jsonb(o),to_jsonb(p),to_jsonb(e),to_jsonb(r)) into a_before
    from public.orders o join public.purchases p on p.order_id=o.id
    join public.entitlements e on e.purchase_id=p.id join public.paid_reports r on r.purchase_id=p.id where o.id=order_a;

  update public.active_profiles set profile_id=spouse_id where user_id=owner_id;
  perform pg_temp.profile_scope_assert('database active-profile selection can switch to spouse B',
    (select profile_id=spouse_id from public.active_profiles where user_id=owner_id));
  perform pg_temp.profile_scope_assert('B has no inherited purchase before its separate purchase',
    not exists(select 1 from public.purchases where user_id=owner_id and profile_id=spouse_id and product_id='career'));
  perform pg_temp.profile_scope_assert('B has no inherited entitlement before its separate purchase',
    not exists(select 1 from public.entitlements where user_id=owner_id and profile_id=spouse_id and resource_id='career' and is_active));
  perform pg_temp.profile_scope_assert('B exact-profile report lookup cannot return A report',
    not exists(select 1 from public.paid_reports where user_id=owner_id and profile_id=spouse_id and product_id='career' and analysis_edition_key=edition));

  insert into public.orders(id,user_id,profile_id,product_id,amount,status,payment_provider,paid_at,analysis_edition_key,analysis_input_snapshot)
    values(order_b,owner_id,spouse_id,'career',0,'paid',marker,now(),edition,input_b);
  insert into public.purchases(id,order_id,user_id,profile_id,product_id,analysis_edition_key,analysis_input_snapshot)
    values(purchase_b,order_b,owner_id,spouse_id,'career',edition,input_b);
  insert into public.entitlements(user_id,profile_id,resource_id,resource_type,purchase_id,source,is_active,analysis_edition_key)
    values(owner_id,spouse_id,'career','paid_analysis',purchase_b,'purchase',true,edition);
  insert into public.paid_reports(id,user_id,profile_id,product_id,purchase_id,status,content,completed_at,analysis_edition_key)
    values(report_b,owner_id,spouse_id,'career',purchase_b,'completed',
      jsonb_set(base_content,canary_path,to_jsonb(marker || ' SPOUSE_B_ONLY')),now(),edition);
  perform pg_temp.profile_scope_assert('same product and edition coexist for self and spouse',
    (select count(*)=2 and count(distinct profile_id)=2 from public.orders where id in(order_a,order_b) and product_id='career' and analysis_edition_key=edition));
  perform pg_temp.profile_scope_assert('B has its own purchase ID and B-only stored report',
    purchase_a<>purchase_b and (select purchase_id=purchase_b and content#>>canary_path=marker || ' SPOUSE_B_ONLY' from public.paid_reports where id=report_b));
  perform pg_temp.profile_scope_assert('all four layers retain matching owner/profile/product/edition',
    (select count(*)=2 from public.orders o
      join public.purchases p on p.order_id=o.id and p.user_id=o.user_id and p.profile_id=o.profile_id
        and p.product_id=o.product_id and p.analysis_edition_key=o.analysis_edition_key and p.analysis_input_snapshot=o.analysis_input_snapshot
      join public.entitlements e on e.purchase_id=p.id and e.user_id=p.user_id and e.profile_id=p.profile_id
        and e.resource_id=p.product_id and e.resource_type='paid_analysis' and e.analysis_edition_key=p.analysis_edition_key
      join public.paid_reports r on r.purchase_id=p.id and r.user_id=p.user_id and r.profile_id=p.profile_id
        and r.product_id=p.product_id and r.analysis_edition_key=p.analysis_edition_key where o.id in(order_a,order_b)));
  perform pg_temp.profile_scope_assert('B lookup cannot reuse A purchase ID',
    not exists(select 1 from public.entitlements where user_id=owner_id and profile_id=spouse_id and purchase_id=purchase_a));
  perform pg_temp.profile_scope_assert('another edition cannot reuse either active entitlement',
    not exists(select 1 from public.entitlements where purchase_id in(purchase_a,purchase_b) and analysis_edition_key='YEAR:2025'));
  update public.active_profiles set profile_id=self_id where user_id=owner_id;
  perform pg_temp.profile_scope_assert('switching back to A preserves its four rows byte-for-byte',
    a_before=(select jsonb_build_array(to_jsonb(o),to_jsonb(p),to_jsonb(e),to_jsonb(r))
      from public.orders o join public.purchases p on p.order_id=o.id
      join public.entitlements e on e.purchase_id=p.id join public.paid_reports r on r.purchase_id=p.id where o.id=order_a));
  perform pg_temp.profile_scope_assert('all synthetic orders are zero-value and have no provider transaction',
    (select bool_and(amount=0 and payment_provider=marker and transaction_id is null and status='paid') from public.orders where id in(order_a,order_b)));
  perform pg_temp.profile_scope_assert('completed reports are excluded from failed/stale report recovery',
    not exists(select 1 from public.paid_reports where id in(report_a,report_b)
      and (status='failed' or (status='generating' and updated_at<now()-interval '15 minutes'))));
  perform pg_temp.profile_scope_assert('no payment/refund/credit/grant/generation rows were created by triggers',
    finance_before=jsonb_build_array((select count(*) from public.toss_payment_records),
      (select count(*) from public.refund_workflows),(select count(*) from public.ai_consulting_credit_ledger),
      (select count(*) from public.ai_credit_lots),(select count(*) from public.ai_credit_refund_requests),
      (select count(*) from public.ai_consulting_grants),(select count(*) from public.paid_generation_attempts),
      (select count(*) from public.paid_report_recovery_attempts)));
  perform pg_temp.profile_scope_assert('original self profile remains byte-for-byte unchanged',
    original_self=(select to_jsonb(p) from public.profiles p where p.id=self_id));
end;
$$;
select jsonb_build_object('passed',count(*),'scenarios',jsonb_agg(scenario order by scenario),
  'scope','DATABASE ONLY; not browser or HTTP evidence','cleanup','ROLLBACK; no fixture commits') as profile_scope_result
from pg_temp.profile_scope_results;
rollback;
