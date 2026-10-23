-- ONLY staging: xdiitqyysmhicjcytckm. A+B existing testing users.
-- This test must be a single transaction; never commit fixtures or execute against production.
BEGIN;
SET LOCAL statement_timeout='25s';
DO $$
BEGIN
 IF (SELECT COUNT(*) FROM auth.users)<>2
   OR (SELECT COUNT(*) FROM public.profiles)<>2
   OR (SELECT COUNT(DISTINCT user_id) FROM public.profiles)<>2
   OR (SELECT COUNT(*) FROM public.orders)<>0
   OR (SELECT COUNT(*) FROM public.purchases)<>0
   OR (SELECT COUNT(*) FROM public.entitlements)<>0
   OR (SELECT COUNT(*) FROM public.paid_reports)<>0
   OR (SELECT COUNT(*) FROM public.ai_consulting_memories)<>0
 THEN RAISE EXCEPTION 'STAGING_PRECONDITION_CHANGED'; END IF;
 PERFORM set_config('fixture.a', (SELECT user_id::text FROM public.profiles ORDER BY user_id LIMIT 1),true);
 PERFORM set_config('fixture.b', (SELECT user_id::text FROM public.profiles ORDER BY user_id OFFSET 1 LIMIT 1),true);
 PERFORM set_config('fixture.self_profile', (SELECT id::text FROM public.profiles ORDER BY user_id LIMIT 1),true);
 PERFORM set_config('fixture.b_profile', (SELECT id::text FROM public.profiles ORDER BY user_id OFFSET 1 LIMIT 1),true);
END $$;
INSERT INTO public.profiles(user_id,label,relationship_type,birth_date,birth_time,birth_time_known,gender,calendar_type,is_leap_month)
 SELECT user_id,'TEMP_E2E_SPOUSE_ROLLBACK','spouse',DATE '2001-01-01',TIME '12:00:00',true,'female','solar',false
 FROM public.profiles WHERE id::text=current_setting('fixture.self_profile');
DO $$
BEGIN
 PERFORM set_config('fixture.spouse_profile',(SELECT id::text FROM public.profiles WHERE label='TEMP_E2E_SPOUSE_ROLLBACK' AND user_id::text=current_setting('fixture.a')),true);
 IF current_setting('fixture.spouse_profile',true) IS NULL THEN RAISE EXCEPTION 'NO_SYNTHETIC_SPOUSE'; END IF;
END $$;
-- The self profile buys product career, the spouse does not. A second user also does not.
INSERT INTO public.orders(user_id,profile_id,product_id,amount,status,paid_at,analysis_edition_key)
 SELECT user_id,id,'career',0,'paid',now(),'e2e-multiprofile-rollback'
 FROM public.profiles WHERE id::text=current_setting('fixture.self_profile');
INSERT INTO public.purchases(user_id,profile_id,product_id,order_id,analysis_edition_key)
 SELECT user_id,profile_id,product_id,id,analysis_edition_key
 FROM public.orders WHERE analysis_edition_key='e2e-multiprofile-rollback';
INSERT INTO public.entitlements(user_id,profile_id,resource_id,resource_type,purchase_id,analysis_edition_key)
 SELECT user_id,profile_id,product_id,'paid_analysis',id,analysis_edition_key
 FROM public.purchases WHERE analysis_edition_key='e2e-multiprofile-rollback';
INSERT INTO public.paid_reports(user_id,profile_id,product_id,purchase_id,status,content,completed_at,analysis_edition_key)
 SELECT user_id,profile_id,product_id,id,'completed','{"test":"synthetic-multiprofile-rollback"}'::jsonb,now(),analysis_edition_key
 FROM public.purchases WHERE analysis_edition_key='e2e-multiprofile-rollback';
INSERT INTO public.ai_consulting_memories(user_id,profile_id,kind,provenance,content)
 SELECT user_id,id,'user_fact','USER_STATED',CASE WHEN id::text=current_setting('fixture.self_profile') THEN 'SELF_ONLY_E2E' ELSE 'SPOUSE_ONLY_E2E' END
 FROM public.profiles WHERE user_id::text=current_setting('fixture.a');
INSERT INTO public.ai_consulting_memories(user_id,profile_id,kind,provenance,content)
 SELECT user_id,id,'user_fact','USER_STATED','OTHER_ACCOUNT_ONLY_E2E'
 FROM public.profiles WHERE id::text=current_setting('fixture.b_profile');
-- End-user RLS is account-scoped, not profile-scoped; the app MUST add profile_id filters.
-- Temporary grants only live inside this transaction and roll back.
GRANT SELECT ON public.profiles,public.orders,public.purchases,public.entitlements,
 public.paid_reports,public.ai_consulting_memories TO authenticated,anon;
DO $$
BEGIN
 PERFORM set_config('request.jwt.claim.sub',current_setting('fixture.a'),true);
END $$;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
 IF (SELECT COUNT(*) FROM public.profiles)<>2
   OR (SELECT COUNT(*) FROM public.entitlements)<>1
   OR (SELECT COUNT(*) FROM public.entitlements WHERE profile_id::text=current_setting('fixture.self_profile') AND resource_id='career' AND is_active)<>1
   OR (SELECT COUNT(*) FROM public.entitlements WHERE profile_id::text=current_setting('fixture.spouse_profile') AND resource_id='career' AND is_active)<>0
   OR (SELECT COUNT(*) FROM public.paid_reports WHERE profile_id::text=current_setting('fixture.self_profile') AND status='completed')<>1
   OR (SELECT COUNT(*) FROM public.paid_reports WHERE profile_id::text=current_setting('fixture.spouse_profile'))<>0
   OR (SELECT COUNT(*) FROM public.ai_consulting_memories WHERE profile_id::text=current_setting('fixture.self_profile') AND content='SELF_ONLY_E2E')<>1
   OR (SELECT COUNT(*) FROM public.ai_consulting_memories WHERE profile_id::text=current_setting('fixture.spouse_profile') AND content='SPOUSE_ONLY_E2E')<>1
   OR (SELECT COUNT(*) FROM public.ai_consulting_memories WHERE profile_id::text=current_setting('fixture.self_profile') AND content='SPOUSE_ONLY_E2E')<>0
   OR (SELECT COUNT(*) FROM public.ai_consulting_memories WHERE profile_id::text=current_setting('fixture.spouse_profile') AND content='SELF_ONLY_E2E')<>0
   OR (SELECT COUNT(*) FROM public.ai_consulting_memories WHERE content='OTHER_ACCOUNT_ONLY_E2E')<>0
 THEN RAISE EXCEPTION 'SAME_OWNER_PROFILE_SCOPING_FAILED'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN PERFORM set_config('request.jwt.claim.sub',current_setting('fixture.b'),true); END $$;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
 IF (SELECT COUNT(*) FROM public.profiles)<>1
   OR (SELECT COUNT(*) FROM public.entitlements)<>0
   OR (SELECT COUNT(*) FROM public.paid_reports)<>0
   OR (SELECT COUNT(*) FROM public.ai_consulting_memories)<>1
 THEN RAISE EXCEPTION 'OTHER_ACCOUNT_RLS_FAILED'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
 IF (SELECT COUNT(*) FROM public.profiles)<>0 OR (SELECT COUNT(*) FROM public.entitlements)<>0
   OR (SELECT COUNT(*) FROM public.paid_reports)<>0 OR (SELECT COUNT(*) FROM public.ai_consulting_memories)<>0
 THEN RAISE EXCEPTION 'ANON_RLS_FAILED'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: same-owner self/spouse purchase-entitlement-report-memory profile filters; other owner and anon hidden' AS result;
ROLLBACK;