-- Run ONLY in unboda-staging (xdiitqyysmhicjcytckm).
-- Transaction-local synthetic orders/purchases/reports/entitlements and grants.
-- No real payment, email, API session, or user data changes. Rollback always.
-- This is DB-level RLS integration, NOT a browser/session E2E test.
BEGIN;
SET LOCAL statement_timeout='20s';
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM auth.users)<>2
     OR (SELECT COUNT(*) FROM public.profiles)<>2
     OR (SELECT COUNT(DISTINCT user_id) FROM public.profiles)<>2
     OR (SELECT COUNT(*) FROM public.orders)<>0
     OR (SELECT COUNT(*) FROM public.purchases)<>0
     OR (SELECT COUNT(*) FROM public.paid_reports)<>0
     OR (SELECT COUNT(*) FROM public.entitlements)<>0 THEN
    RAISE EXCEPTION 'STAGING_PREREQUISITES_NOT_MET';
  END IF;
  PERFORM set_config('e2e.owner_a',(SELECT user_id::text FROM public.profiles ORDER BY user_id LIMIT 1),true);
  PERFORM set_config('e2e.owner_b',(SELECT user_id::text FROM public.profiles ORDER BY user_id LIMIT 1 OFFSET 1),true);
  PERFORM set_config('request.jwt.claim.sub',current_setting('e2e.owner_a'),true);
END $$;
INSERT INTO public.orders(user_id,profile_id,product_id,amount,status,paid_at)
 SELECT user_id,id,'e2e_rls_temp_purchase',0,'paid',now()
 FROM public.profiles WHERE user_id::text IN (current_setting('e2e.owner_a'),current_setting('e2e.owner_b'));
INSERT INTO public.purchases(user_id,profile_id,product_id,order_id)
 SELECT user_id,profile_id,product_id,id FROM public.orders WHERE product_id='e2e_rls_temp_purchase';
INSERT INTO public.paid_reports(user_id,profile_id,product_id,purchase_id,status,content)
 SELECT user_id,profile_id,product_id,id,'completed','{"staging_probe":true}'::jsonb
 FROM public.purchases WHERE product_id='e2e_rls_temp_purchase';
INSERT INTO public.entitlements(user_id,profile_id,resource_id,purchase_id)
 SELECT user_id,profile_id,product_id,id FROM public.purchases WHERE product_id='e2e_rls_temp_purchase';
-- Temporary grants make the RLS layer independently testable; none survives ROLLBACK.
GRANT SELECT ON public.profiles,public.orders,public.purchases,public.paid_reports,public.entitlements TO authenticated;
GRANT SELECT ON public.profiles TO anon;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
 IF (SELECT COUNT(*) FROM public.profiles)<>1
   OR (SELECT COUNT(*) FROM public.profiles WHERE user_id::text=current_setting('e2e.owner_b'))<>0
   OR (SELECT COUNT(*) FROM public.orders)<>1
   OR (SELECT COUNT(*) FROM public.purchases)<>1
   OR (SELECT COUNT(*) FROM public.paid_reports)<>1
   OR (SELECT COUNT(*) FROM public.entitlements)<>1 THEN
  RAISE EXCEPTION 'TENANT_A_RLS_BOUNDARY_FAILED';
 END IF;
END $$;
DO $$ BEGIN PERFORM set_config('request.jwt.claim.sub',current_setting('e2e.owner_b'),true); END $$;
DO $$
BEGIN
 IF (SELECT COUNT(*) FROM public.profiles)<>1
   OR (SELECT COUNT(*) FROM public.profiles WHERE user_id::text=current_setting('e2e.owner_a'))<>0
   OR (SELECT COUNT(*) FROM public.orders)<>1
   OR (SELECT COUNT(*) FROM public.purchases)<>1
   OR (SELECT COUNT(*) FROM public.paid_reports)<>1
   OR (SELECT COUNT(*) FROM public.entitlements)<>1 THEN
  RAISE EXCEPTION 'TENANT_B_RLS_BOUNDARY_FAILED';
 END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
 IF (SELECT COUNT(*) FROM public.profiles)<>0 THEN
  RAISE EXCEPTION 'ANONYMOUS_PROFILE_BOUNDARY_FAILED';
 END IF;
END $$;
SELECT 'PASS - both users own-only; anonymous none; all changes rolled back' AS test_result;
ROLLBACK;