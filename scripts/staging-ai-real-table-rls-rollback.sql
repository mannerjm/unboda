-- ONLY run against isolated unboda-staging (xdiitqyysmhicjcytckm).
-- Uses the REAL AI consulting tables, with synthetic purchase/consultation data.
-- No API calls, payments, invoices, AI inference, or customer data changes.
-- Everything including temporary permissions is rolled back.
BEGIN;
SET LOCAL statement_timeout='25s';
DO $$
BEGIN
 IF (SELECT count(*) FROM public.profiles) <> 2
 OR (SELECT count(distinct user_id) FROM public.profiles) <> 2
 OR (SELECT count(*) FROM public.orders) <> 0
 OR (SELECT count(*) FROM public.purchases) <> 0
 OR (SELECT count(*) FROM public.ai_consulting_messages) <> 0
 OR (SELECT count(*) FROM public.ai_consulting_memories) <> 0
 THEN RAISE EXCEPTION 'STAGING_E2E_FIXTURE_PRECONDITION_FAILED'; END IF;
 PERFORM set_config('e2e.owner_a',(SELECT user_id::text FROM public.profiles ORDER BY user_id LIMIT 1),true);
 PERFORM set_config('e2e.owner_b',(SELECT user_id::text FROM public.profiles ORDER BY user_id LIMIT 1 OFFSET 1),true);
 PERFORM set_config('request.jwt.claim.sub',current_setting('e2e.owner_a'),true);
END $$;
INSERT INTO public.orders(user_id,profile_id,product_id,amount,status,paid_at,analysis_edition_key)
 SELECT user_id,id,'e2e_owner_boundary_fixture',0,'paid',now(),'e2e-staging-only'
 FROM public.profiles;
INSERT INTO public.purchases(user_id,profile_id,product_id,order_id,analysis_edition_key)
 SELECT user_id,profile_id,product_id,id,'e2e-staging-only'
 FROM public.orders WHERE product_id='e2e_owner_boundary_fixture';
INSERT INTO public.entitlements(user_id,profile_id,resource_id,resource_type,purchase_id,analysis_edition_key)
 SELECT user_id,profile_id,product_id,'paid_analysis',id,'e2e-staging-only'
 FROM public.purchases WHERE product_id='e2e_owner_boundary_fixture';
INSERT INTO public.ai_consulting_grants(user_id,profile_id,source_purchase_id,source_product_id,base_entitlement_id,base_product_id,analysis_edition_key,question_limit)
 SELECT e.user_id,e.profile_id,p.id,p.product_id,e.id,e.resource_id,e.analysis_edition_key,1
 FROM public.entitlements e JOIN public.purchases p ON p.id=e.purchase_id
 WHERE e.resource_id='e2e_owner_boundary_fixture';
INSERT INTO public.ai_consulting_threads(user_id,profile_id,grant_id,base_product_id,analysis_edition_key,title)
 SELECT user_id,profile_id,id,base_product_id,analysis_edition_key,'synthetic E2E'
 FROM public.ai_consulting_grants WHERE base_product_id='e2e_owner_boundary_fixture';
INSERT INTO public.ai_consulting_messages(thread_id,user_id,profile_id,role,content,scope_decision,charged,request_id)
 SELECT id,user_id,profile_id,'user','synthetic E2E','CLARIFY',false,gen_random_uuid()
 FROM public.ai_consulting_threads WHERE base_product_id='e2e_owner_boundary_fixture';
INSERT INTO public.ai_consulting_memories(user_id,profile_id,kind,provenance,content,source_thread_id)
 SELECT user_id,profile_id,'user_fact','USER_STATED','synthetic E2E',id
 FROM public.ai_consulting_threads WHERE base_product_id='e2e_owner_boundary_fixture';
GRANT SELECT ON public.ai_consulting_grants,public.ai_consulting_threads,public.ai_consulting_messages,public.ai_consulting_memories TO authenticated,anon;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.ai_consulting_threads) <> 1
 OR (SELECT count(*) FROM public.ai_consulting_messages) <> 1
 OR (SELECT count(*) FROM public.ai_consulting_memories) <> 1
 OR (SELECT count(*) FROM public.ai_consulting_messages WHERE user_id::text=current_setting('e2e.owner_b')) <> 0
 THEN RAISE EXCEPTION 'ACCOUNT_A_AI_RLS_FAILED'; END IF;
END $$;
DO $$ BEGIN PERFORM set_config('request.jwt.claim.sub',current_setting('e2e.owner_b'),true); END $$;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.ai_consulting_threads) <> 1
 OR (SELECT count(*) FROM public.ai_consulting_messages) <> 1
 OR (SELECT count(*) FROM public.ai_consulting_memories) <> 1
 OR (SELECT count(*) FROM public.ai_consulting_messages WHERE user_id::text=current_setting('e2e.owner_a')) <> 0
 THEN RAISE EXCEPTION 'ACCOUNT_B_AI_RLS_FAILED'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
 IF (SELECT count(*) FROM public.ai_consulting_threads) <> 0
 OR (SELECT count(*) FROM public.ai_consulting_messages) <> 0
 OR (SELECT count(*) FROM public.ai_consulting_memories) <> 0
 THEN RAISE EXCEPTION 'ANONYMOUS_AI_RLS_FAILED'; END IF;
END $$;
SELECT 'PASS: actual AI tables; both account boundaries and anonymous protected' AS result;
ROLLBACK;
