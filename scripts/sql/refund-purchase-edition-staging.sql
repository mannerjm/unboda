-- Staging-only RPC regression. The runner injects settings at the marker.
-- All fixture rows and all their effects are uncommitted and rolled back.
-- Never run this through a payment/reconciliation HTTP endpoint.
begin;
-- STAGING_TEST_SETUP

create temporary table refund_scope_results (
  scenario text primary key,
  passed boolean not null
) on commit drop;

create function pg_temp.refund_scope_assert(scenario text, passed boolean)
returns void language plpgsql as $$
begin
  if passed is not true then raise exception 'Refund scope regression: %', scenario; end if;
  insert into pg_temp.refund_scope_results values (scenario, true);
end;
$$;

do $$
declare
  user_a uuid := current_setting('unboda.e2e_user_a', true)::uuid;
  profile_a uuid := current_setting('unboda.e2e_profile_a', true)::uuid;
  user_b uuid := current_setting('unboda.e2e_user_b', true)::uuid;
  profile_b uuid := current_setting('unboda.e2e_profile_b', true)::uuid;
  order_ids uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  purchase_ids uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  entitlement_ids uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  payment_id uuid := gen_random_uuid();
  legacy_payment_id uuid := gen_random_uuid();
  workflow_id uuid := gen_random_uuid();
  legacy_workflow_id uuid := gen_random_uuid();
  claim_a uuid := gen_random_uuid();
  claim_b uuid := gen_random_uuid();
  legacy_claim uuid := gen_random_uuid();
  changed integer;
  other_edition_before jsonb;
  other_user_before jsonb;
  profiles_before text;
begin
  if current_setting('unboda.e2e_project_ref', true) is distinct from 'xdiitqyysmhicjcytckm'
    or user_a is null or profile_a is null or user_b is null or profile_b is null
    or user_a = user_b or profile_a = profile_b then
    raise exception 'Explicit staging project and independent existing test identities are required';
  end if;
  if not exists(select 1 from public.profiles where id=profile_a and user_id=user_a)
    or not exists(select 1 from public.profiles where id=profile_b and user_id=user_b) then
    raise exception 'Existing staging test profiles do not match their owners';
  end if;
  select md5(jsonb_agg(to_jsonb(p) order by p.id)::text) into profiles_before
    from public.profiles p where id in (profile_a,profile_b);

  -- Unique future editions avoid touching or overwriting any existing test data.
  -- The custom provider, terminal synthetic record and uncommitted transaction
  -- ensure these can never become a real Toss transaction or scheduled refund.
  insert into public.orders (id,user_id,profile_id,product_id,amount,status,payment_provider,paid_at,analysis_edition_key)
  values
    (order_ids[1],user_a,profile_a,'career',1,'paid','STAGING_SYNTHETIC_ROLLBACK_ONLY',now(),'YEAR:2091'),
    (order_ids[2],user_a,profile_a,'career',1,'paid','STAGING_SYNTHETIC_ROLLBACK_ONLY',now(),'YEAR:2092'),
    (order_ids[3],user_b,profile_b,'career',1,'paid','STAGING_SYNTHETIC_ROLLBACK_ONLY',now(),'YEAR:2091'),
    (order_ids[4],user_a,profile_a,'career',1,'paid','STAGING_SYNTHETIC_ROLLBACK_ONLY',now(),null),
    (order_ids[5],user_a,profile_a,'career',1,'paid','STAGING_SYNTHETIC_ROLLBACK_ONLY',now(),null);
  insert into public.purchases (id,order_id,user_id,profile_id,product_id,analysis_edition_key)
  values
    (purchase_ids[1],order_ids[1],user_a,profile_a,'career','YEAR:2091'),
    (purchase_ids[2],order_ids[2],user_a,profile_a,'career','YEAR:2092'),
    (purchase_ids[3],order_ids[3],user_b,profile_b,'career','YEAR:2091'),
    (purchase_ids[4],order_ids[4],user_a,profile_a,'career',null),
    (purchase_ids[5],order_ids[5],user_a,profile_a,'career',null);
  insert into public.entitlements (id,user_id,profile_id,resource_id,resource_type,purchase_id,source,is_active,analysis_edition_key)
  values
    (entitlement_ids[1],user_a,profile_a,'career','paid_analysis',purchase_ids[1],'purchase',true,'YEAR:2091'),
    (entitlement_ids[2],user_a,profile_a,'career','paid_analysis',purchase_ids[2],'purchase',true,'YEAR:2092'),
    (entitlement_ids[3],user_b,profile_b,'career','paid_analysis',purchase_ids[3],'purchase',true,'YEAR:2091'),
    (entitlement_ids[4],user_a,profile_a,'career','paid_analysis',purchase_ids[4],'purchase',true,null),
    (entitlement_ids[5],user_a,profile_a,'career','staging_test_only',purchase_ids[1],'purchase',true,'YEAR:2091');
  insert into public.toss_payment_records (id,order_id,payment_key,provider_order_id,expected_amount,confirmed_amount,currency,provider_status,reconciliation_status)
  values
    (payment_id,order_ids[1],'SYNTHETIC_NEVER_USE_'||payment_id,order_ids[1]::text,1,1,'KRW','DONE','paid'),
    (legacy_payment_id,order_ids[4],'SYNTHETIC_NEVER_USE_'||legacy_payment_id,order_ids[4]::text,1,1,'KRW','DONE','paid');
  insert into public.refund_workflows (id,order_id,payment_record_id,user_id,profile_id,product_id,requested_amount,
    currency,reason_category,reason_text,status,reconciliation_claim_token,reconciliation_claimed_at,reconciliation_claim_expires_at)
  values
    (workflow_id,order_ids[1],payment_id,user_a,profile_a,'career',1,'KRW','CONTENT_NOT_PROVIDED',
      'STAGING_SYNTHETIC_ROLLBACK_ONLY','REFUND_PROCESSING',claim_a,now(),now()+interval '1 hour'),
    (legacy_workflow_id,order_ids[4],legacy_payment_id,user_a,profile_a,'career',1,'KRW','CONTENT_NOT_PROVIDED',
      'STAGING_SYNTHETIC_ROLLBACK_ONLY','REFUND_PROCESSING',legacy_claim,now(),now()+interval '1 hour');

  select to_jsonb(e) into other_edition_before from public.entitlements e where id=entitlement_ids[2];
  select to_jsonb(e) into other_user_before from public.entitlements e where id=entitlement_ids[3];

  select count(*) into changed from public.revoke_refund_entitlement(order_ids[1],null,'SYNTHETIC_NO_CLAIM');
  perform pg_temp.refund_scope_assert('missing claim cannot revoke',changed=0);
  select count(*) into changed from public.revoke_refund_entitlement(order_ids[1],gen_random_uuid(),'SYNTHETIC_STALE_CLAIM');
  perform pg_temp.refund_scope_assert('stale claim cannot revoke',changed=0);

  update public.refund_workflows set profile_id=profile_b where id=workflow_id;
  select count(*) into changed from public.revoke_refund_entitlement(order_ids[1],claim_a,'SYNTHETIC_BAD_WORKFLOW');
  perform pg_temp.refund_scope_assert('workflow ownership mismatch cannot revoke',changed=0);
  update public.refund_workflows set profile_id=profile_a where id=workflow_id;

  update public.purchases set analysis_edition_key='YEAR:2099' where id=purchase_ids[1];
  select count(*) into changed from public.revoke_refund_entitlement(order_ids[1],claim_a,'SYNTHETIC_BAD_PURCHASE');
  perform pg_temp.refund_scope_assert('purchase edition mismatch cannot revoke',changed=0);
  update public.purchases set analysis_edition_key='YEAR:2091' where id=purchase_ids[1];

  select count(*) into changed from public.revoke_refund_entitlement(order_ids[1],claim_a,'SYNTHETIC_EXPECTED_REFUND');
  perform pg_temp.refund_scope_assert('exact original purchase is revoked',changed=1 and
    not (select is_active from public.entitlements where id=entitlement_ids[1]));
  perform pg_temp.refund_scope_assert('different edition stays byte-for-byte unchanged',
    (select to_jsonb(e)=other_edition_before from public.entitlements e where id=entitlement_ids[2]));
  perform pg_temp.refund_scope_assert('other account and profile stay byte-for-byte unchanged',
    (select to_jsonb(e)=other_user_before from public.entitlements e where id=entitlement_ids[3]));
  perform pg_temp.refund_scope_assert('unrelated resource type stays active',
    (select is_active from public.entitlements where id=entitlement_ids[5]));
  perform pg_temp.refund_scope_assert('original purchase has no remaining active report entitlement',
    not exists(select 1 from public.entitlements where purchase_id=purchase_ids[1]
      and resource_type='paid_analysis' and is_active));

  select count(*) into changed from public.revoke_refund_entitlement(order_ids[1],claim_a,'SYNTHETIC_REPLAY');
  perform pg_temp.refund_scope_assert('replaying revocation is idempotent',changed=0);

  update public.entitlements set is_active=true where id=entitlement_ids[1];
  update public.refund_workflows set reconciliation_claim_token=claim_b where id=workflow_id;
  select count(*) into changed from public.revoke_refund_entitlement(order_ids[1],claim_a,'SYNTHETIC_RECLAIMED');
  perform pg_temp.refund_scope_assert('previous worker cannot revoke after reclaim',changed=0 and
    (select is_active from public.entitlements where id=entitlement_ids[1]));
  select count(*) into changed from public.revoke_refund_entitlement(order_ids[1],claim_b,'SYNTHETIC_CURRENT_WORKER');
  perform pg_temp.refund_scope_assert('current worker can finish the exact purchase',changed=1);

  update public.entitlements set is_active=true where id=entitlement_ids[1];
  update public.refund_workflows set status='REFUND_COMPLETED' where id=workflow_id;
  select count(*) into changed from public.revoke_refund_entitlement(order_ids[1],claim_b,'SYNTHETIC_TERMINAL');
  perform pg_temp.refund_scope_assert('terminal workflow cannot revoke',changed=0);

  select count(*) into changed from public.revoke_refund_entitlement(order_ids[4],legacy_claim,'SYNTHETIC_LEGACY');
  perform pg_temp.refund_scope_assert('legacy null edition is matched precisely',changed=1 and
    not (select is_active from public.entitlements where id=entitlement_ids[4]));
  update public.entitlements set is_active=true,purchase_id=purchase_ids[5] where id=entitlement_ids[4];
  select count(*) into changed from public.revoke_refund_entitlement(order_ids[4],legacy_claim,'SYNTHETIC_OLD_PURCHASE');
  perform pg_temp.refund_scope_assert('replacement purchase of the same legacy edition stays active',changed=0 and
    (select is_active from public.entitlements where id=entitlement_ids[4]));

  perform pg_temp.refund_scope_assert('anonymous users cannot execute the privileged RPC',
    not has_function_privilege('anon','public.revoke_refund_entitlement(uuid,uuid,text)','execute'));
  perform pg_temp.refund_scope_assert('authenticated customers cannot execute the privileged RPC',
    not has_function_privilege('authenticated','public.revoke_refund_entitlement(uuid,uuid,text)','execute'));
  perform pg_temp.refund_scope_assert('only server role retains execution',
    has_function_privilege('service_role','public.revoke_refund_entitlement(uuid,uuid,text)','execute'));
  perform pg_temp.refund_scope_assert('existing profiles are unchanged',profiles_before=
    (select md5(jsonb_agg(to_jsonb(p) order by p.id)::text) from public.profiles p where id in (profile_a,profile_b)));
end;
$$;

select jsonb_build_object('passed',count(*),'scenarios',jsonb_agg(scenario order by scenario),
  'cleanup','ROLLBACK follows; fixtures never committed') as refund_scope_result
from pg_temp.refund_scope_results;
rollback;
