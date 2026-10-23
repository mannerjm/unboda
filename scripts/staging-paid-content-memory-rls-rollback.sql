-- Only staging xdiitqyysmhicjcytckm. Synthetic, zero-KRW, ROLLBACK-only test.
-- Never execute in production. No customer accounts, real payment or API calls.
BEGIN;
SET LOCAL statement_timeout = '25s';
DO $$
BEGIN
  IF (SELECT count(*) FROM auth.users) <> 2
    OR (SELECT count(*) FROM public.profiles) <> 2
    OR (SELECT count(distinct user_id) FROM public.profiles) <> 2
    OR (SELECT count(*) FROM public.orders) <> 0
    OR (SELECT count(*) FROM public.purchases) <> 0
    OR (SELECT count(*) FROM public.entitlements) <> 0
    OR (SELECT count(*) FROM public.paid_reports) <> 0
    OR (SELECT count(*) FROM public.ai_consulting_memories) <> 0
    OR (SELECT count(*) FROM public.ai_consulting_messages) <> 0
    OR (SELECT count(*) FROM public.ai_consulting_threads) <> 0
  THEN RAISE EXCEPTION 'STAGING_TWO_TEST_ACCOUNT_PRECONDITIONS_NOT_MET'; END IF;
  PERFORM set_config('e2e.owner_a',(SELECT user_id::text FROM public.profiles ORDER BY user_id LIMIT 1),true);
  PERFORM set_config('e2e.owner_b',(SELECT user_id::text FROM public.profiles ORDER BY user_id LIMIT 1 OFFSET 1),true);
  PERFORM set_config('request.jwt.claim.sub',current_setting('e2e.owner_a'),true);
END $$;

-- A only: synthetic order -> purchase -> paid entitlement -> completed paid report.
-- The zero-cost fixture is never committed or visible to an external worker.
INSERT INTO public.orders(user_id,profile_id,product_id,amount,status,paid_at,analysis_edition_key)
 SELECT user_id,id,'career',0,'paid',now(),'e2e-only-rollback-20261019'
 FROM public.profiles WHERE user_id::text=current_setting('e2e.owner_a');
INSERT INTO public.purchases(user_id,profile_id,product_id,order_id,analysis_edition_key)
 SELECT user_id,profile_id,product_id,id,analysis_edition_key
 FROM public.orders WHERE analysis_edition_key='e2e-only-rollback-20261019';
INSERT INTO public.entitlements(user_id,profile_id,resource_id,resource_type,purchase_id,analysis_edition_key)
 SELECT user_id,profile_id,product_id,'paid_analysis',id,analysis_edition_key
 FROM public.purchases WHERE analysis_edition_key='e2e-only-rollback-20261019';
INSERT INTO public.paid_reports(user_id,profile_id,product_id,purchase_id,status,content,completed_at,analysis_edition_key)
 SELECT user_id,profile_id,product_id,id,'completed',
 '{"test_marker":"rollback-only","summary":"Synthetic security test, not a customer report"}'::jsonb,
 now(),analysis_edition_key
 FROM public.purchases WHERE analysis_edition_key='e2e-only-rollback-20261019';

-- A only: synthetic consultation message and linked user-stated memory.
INSERT INTO public.ai_consulting_grants(user_id,profile_id,source_purchase_id,source_product_id,base_entitlement_id,base_product_id,analysis_edition_key,question_limit)
 SELECT e.user_id,e.profile_id,p.id,p.product_id,e.id,e.resource_id,e.analysis_edition_key,1
 FROM public.entitlements e JOIN public.purchases p ON p.id=e.purchase_id
 WHERE e.analysis_edition_key='e2e-only-rollback-20261019';
INSERT INTO public.ai_consulting_threads(user_id,profile_id,grant_id,base_product_id,analysis_edition_key,title)
 SELECT user_id,profile_id,id,base_product_id,analysis_edition_key,'Synthetic security test'
 FROM public.ai_consulting_grants WHERE analysis_edition_key='e2e-only-rollback-20261019';
INSERT INTO public.ai_consulting_messages(thread_id,user_id,profile_id,role,content,scope_decision,charged,request_id)
 SELECT id,user_id,profile_id,'user','Synthetic test question','CLARIFY',false,gen_random_uuid()
 FROM public.ai_consulting_threads WHERE analysis_edition_key='e2e-only-rollback-20261019';
INSERT INTO public.ai_consulting_memories(user_id,profile_id,kind,provenance,content,source_thread_id,source_message_id)
 SELECT m.user_id,m.profile_id,'user_fact','USER_STATED','A-only synthetic saved memory',m.thread_id,m.id
 FROM public.ai_consulting_messages m JOIN public.ai_consulting_threads t ON t.id=m.thread_id
 WHERE t.analysis_edition_key='e2e-only-rollback-20261019';
-- B: independent user memory with NO purchased entitlement.
INSERT INTO public.ai_consulting_memories(user_id,profile_id,kind,provenance,content)
 SELECT user_id,id,'user_fact','USER_STATED','B-only synthetic saved memory'
 FROM public.profiles WHERE user_id::text=current_setting('e2e.owner_b');

-- Relational constraint must block B from referencing A's consultation message.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.ai_consulting_memories(user_id,profile_id,kind,provenance,content,source_message_id)
    SELECT b.user_id,b.id,'user_fact','USER_STATED','Should never link A message',m.id
    FROM public.profiles b CROSS JOIN public.ai_consulting_messages m
    WHERE b.user_id::text=current_setting('e2e.owner_b');
  EXCEPTION WHEN foreign_key_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'CROSS_ACCOUNT_MESSAGE_REFERENCE_NOT_BLOCKED'; END IF;
END $$;

-- TEMPORARY SELECT grants allow RLS to be exercised independently.
GRANT SELECT ON public.orders,public.purchases,public.entitlements,public.paid_reports,
 public.ai_consulting_grants,public.ai_consulting_threads,public.ai_consulting_messages,
 public.ai_consulting_memories TO authenticated,anon;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.orders)<>1
     OR (SELECT count(*) FROM public.purchases)<>1
     OR (SELECT count(*) FROM public.entitlements)<>1
     OR (SELECT count(*) FROM public.paid_reports WHERE status='completed' AND content->>'test_marker'='rollback-only')<>1
     OR (SELECT count(*) FROM public.ai_consulting_threads)<>1
     OR (SELECT count(*) FROM public.ai_consulting_messages WHERE charged=false)<>1
     OR (SELECT count(*) FROM public.ai_consulting_memories)<>1
     OR (SELECT count(*) FROM public.ai_consulting_memories WHERE content LIKE 'B-only%')<>0
  THEN RAISE EXCEPTION 'ACCOUNT_A_OWN_CONTENT_VISIBILITY_FAILED'; END IF;
END $$;
DO $$ BEGIN PERFORM set_config('request.jwt.claim.sub',current_setting('e2e.owner_b'),true); END $$;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.orders)<>0
     OR (SELECT count(*) FROM public.purchases)<>0
     OR (SELECT count(*) FROM public.entitlements)<>0
     OR (SELECT count(*) FROM public.paid_reports)<>0
     OR (SELECT count(*) FROM public.ai_consulting_threads)<>0
     OR (SELECT count(*) FROM public.ai_consulting_messages)<>0
     OR (SELECT count(*) FROM public.ai_consulting_memories)<>1
     OR (SELECT count(*) FROM public.ai_consulting_memories WHERE content LIKE 'A-only%')<>0
  THEN RAISE EXCEPTION 'ACCOUNT_B_FOREIGN_CONTENT_DENIAL_FAILED'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.orders)<>0
     OR (SELECT count(*) FROM public.purchases)<>0
     OR (SELECT count(*) FROM public.entitlements)<>0
     OR (SELECT count(*) FROM public.paid_reports)<>0
     OR (SELECT count(*) FROM public.ai_consulting_threads)<>0
     OR (SELECT count(*) FROM public.ai_consulting_messages)<>0
     OR (SELECT count(*) FROM public.ai_consulting_memories)<>0
  THEN RAISE EXCEPTION 'ANONYMOUS_PAID_OR_AI_CONTENT_VISIBLE'; END IF;
END $$;
SELECT 'PASS: A paid report + saved memory, B own memory, cross-owner/anon blocked, invalid A-message link rejected' AS result;
ROLLBACK;
