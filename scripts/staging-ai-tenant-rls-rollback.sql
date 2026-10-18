-- STAGING ONLY: mirrored AI-consulting RLS ownership smoke test.
-- Mirrors Production's auth.uid()=user_id SELECT policies for threads/messages/memories.
-- Does NOT install the real AI schema and is NOT an HTTP/browser login E2E.
-- Requires two pre-existing dedicated staging users with one profile each.
-- Every table, policy and synthetic row is rolled back.
BEGIN;
SET LOCAL statement_timeout='20s';
DO $$ BEGIN
 IF (SELECT count(DISTINCT user_id) FROM public.profiles)<>2
    OR (SELECT count(*) FROM public.profiles)<>2 THEN
    RAISE EXCEPTION 'TWO_DEDICATED_STAGING_PROFILES_REQUIRED';
 END IF;
 PERFORM set_config('e2e.owner_a',(SELECT user_id::text FROM public.profiles ORDER BY user_id LIMIT 1),true);
 PERFORM set_config('e2e.owner_b',(SELECT user_id::text FROM public.profiles ORDER BY user_id LIMIT 1 OFFSET 1),true);
 PERFORM set_config('request.jwt.claim.sub',current_setting('e2e.owner_a'),true);
END $$;
CREATE SCHEMA e2e_ai_rls_probe;
GRANT USAGE ON SCHEMA e2e_ai_rls_probe TO authenticated,anon;
CREATE TABLE e2e_ai_rls_probe.threads(id uuid primary key default gen_random_uuid(),user_id uuid not null,profile_id uuid not null);
CREATE TABLE e2e_ai_rls_probe.messages(id uuid primary key default gen_random_uuid(),user_id uuid not null,profile_id uuid not null,thread_id uuid references e2e_ai_rls_probe.threads(id),body text);
CREATE TABLE e2e_ai_rls_probe.memories(id uuid primary key default gen_random_uuid(),user_id uuid not null,profile_id uuid not null,body text);
ALTER TABLE e2e_ai_rls_probe.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2e_ai_rls_probe.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2e_ai_rls_probe.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_threads ON e2e_ai_rls_probe.threads FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE POLICY own_messages ON e2e_ai_rls_probe.messages FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE POLICY own_memories ON e2e_ai_rls_probe.memories FOR SELECT TO authenticated USING(auth.uid()=user_id);
INSERT INTO e2e_ai_rls_probe.threads(user_id,profile_id) SELECT user_id,id FROM public.profiles;
INSERT INTO e2e_ai_rls_probe.messages(user_id,profile_id,thread_id,body)
 SELECT user_id,profile_id,id,'synthetic' FROM e2e_ai_rls_probe.threads;
INSERT INTO e2e_ai_rls_probe.memories(user_id,profile_id,body) SELECT user_id,id,'synthetic' FROM public.profiles;
GRANT SELECT ON ALL TABLES IN SCHEMA e2e_ai_rls_probe TO authenticated,anon;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM e2e_ai_rls_probe.threads)<>1
 OR (SELECT count(*) FROM e2e_ai_rls_probe.messages)<>1
 OR (SELECT count(*) FROM e2e_ai_rls_probe.memories)<>1
 OR (SELECT count(*) FROM e2e_ai_rls_probe.messages WHERE user_id::text=current_setting('e2e.owner_b'))<>0
 THEN RAISE EXCEPTION 'ACCOUNT_A_AI_ISOLATION_FAILED'; END IF;
END $$;
DO $$ BEGIN PERFORM set_config('request.jwt.claim.sub',current_setting('e2e.owner_b'),true); END $$;
DO $$ BEGIN
 IF (SELECT count(*) FROM e2e_ai_rls_probe.threads)<>1
 OR (SELECT count(*) FROM e2e_ai_rls_probe.messages)<>1
 OR (SELECT count(*) FROM e2e_ai_rls_probe.memories)<>1
 OR (SELECT count(*) FROM e2e_ai_rls_probe.messages WHERE user_id::text=current_setting('e2e.owner_a'))<>0
 THEN RAISE EXCEPTION 'ACCOUNT_B_AI_ISOLATION_FAILED'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF (SELECT count(*) FROM e2e_ai_rls_probe.threads)<>0
 OR (SELECT count(*) FROM e2e_ai_rls_probe.messages)<>0
 OR (SELECT count(*) FROM e2e_ai_rls_probe.memories)<>0
 THEN RAISE EXCEPTION 'ANONYMOUS_AI_ISOLATION_FAILED'; END IF;
END $$;
SELECT 'PASS - production AI policy shape mirrored, all rolled back' AS result;
ROLLBACK;
