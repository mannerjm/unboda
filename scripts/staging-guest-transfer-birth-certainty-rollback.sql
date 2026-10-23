-- STAGING ONLY: xdiitqyysmhicjcytckm. Synthetic data, no AI/provider calls.
-- Every fixture and active-profile change is rolled back. Do not remove ROLLBACK.
BEGIN;
DO $test$
DECLARE
 v_user uuid; v_other_user uuid; v_guest uuid; v_profile uuid; v_status text;
 v_run text := 'LAUNCH_GUEST_TRANSFER_20261024_'||substr(gen_random_uuid()::text,1,8);
 v_known boolean; v_expected boolean; v_snapshot jsonb; v_content jsonb;
 v_ids uuid[] := ARRAY[]::uuid[]; v_original_ids uuid[]; v_original_hash text;
 v_before_content_hash text; v_after_content_hash text; v_blocked boolean;
 v_checks jsonb := '{}'::jsonb; i integer;
BEGIN
 IF (SELECT count(*) FROM auth.users) <> 2
 OR (SELECT count(*) FROM auth.users WHERE lower(email) IN ('mannerjm@naver.com','staging-test@unboda.local')) <> 2
 THEN RAISE EXCEPTION 'STAGING_ONLY_ACCOUNT_GUARD'; END IF;
 SELECT id INTO STRICT v_user FROM auth.users WHERE lower(email)='mannerjm@naver.com';
 SELECT id INTO STRICT v_other_user FROM auth.users WHERE lower(email)='staging-test@unboda.local';
 SELECT array_agg(id ORDER BY id), md5(jsonb_agg(to_jsonb(p) ORDER BY id)::text)
 INTO v_original_ids,v_original_hash FROM public.profiles p;

 FOR i IN 1..3 LOOP
  v_expected := CASE i WHEN 1 THEN true WHEN 2 THEN false ELSE null END;
  v_guest := gen_random_uuid();
  INSERT INTO public.guest_free_analyses(id,secret_hash,status,profile_input,profile_fingerprint,content,expires_at)
  VALUES(v_guest,md5(v_run||i),'completed',
   jsonb_build_object('label',v_run||i,'relationshipType','other','birthDate','2000-01-02','birthTime','03:04','birthTimeKnown',v_expected,'gender','남성','calendarType','양력','isLeapMonth',false),
   v_run||'_case'||i,jsonb_build_object('synthetic',true,'run',v_run,'case',i),now()+interval '1 hour');
  SELECT resolved_profile_id,transfer_status INTO v_profile,v_status
  FROM public.complete_guest_analysis_transfer(v_guest,md5(v_run||i),v_user,v_run||'_case'||i);
  v_ids := array_append(v_ids,v_profile);
  SELECT p.birth_time_known,f.profile_snapshot,f.content
   INTO v_known,v_snapshot,v_content
   FROM public.profiles p JOIN public.free_analysis_results f ON f.profile_id=p.id AND f.user_id=p.user_id
   WHERE p.id=v_profile AND p.user_id=v_user;
  v_checks := v_checks || jsonb_build_object(
   'case_'||i||'_profile_certainty',v_known IS NOT DISTINCT FROM v_expected,
   'case_'||i||'_snapshot_certainty',v_snapshot->'birthTimeKnown'=coalesce(to_jsonb(v_expected),'null'::jsonb),
   'case_'||i||'_content_certainty',v_content#>'{profile,birthTimeKnown}'=coalesce(to_jsonb(v_expected),'null'::jsonb));
 END LOOP;
 v_checks := v_checks || jsonb_build_object('certainty_variants_use_distinct_profiles',(SELECT count(DISTINCT x)=3 FROM unnest(v_ids) x));
 SELECT md5(content::text) INTO v_before_content_hash FROM public.free_analysis_results WHERE profile_id=v_ids[1] AND user_id=v_user;

 -- Reuse an exact canonical identity and preserve the first completed result.
 v_guest := gen_random_uuid();
 INSERT INTO public.guest_free_analyses(id,secret_hash,status,profile_input,profile_fingerprint,content,expires_at)
 VALUES(v_guest,md5(v_run||'_reuse'),'completed',
  jsonb_build_object('label',v_run||'_reuse','relationshipType','other','birthDate','2000-01-02','birthTime','03:04','birthTimeKnown',true,'gender','남성','calendarType','양력','isLeapMonth',false),
  v_run||'_case1',jsonb_build_object('synthetic',true,'run',v_run,'candidate','must not overwrite'),now()+interval '1 hour');
 SELECT resolved_profile_id,transfer_status INTO v_profile,v_status
 FROM public.complete_guest_analysis_transfer(v_guest,md5(v_run||'_reuse'),v_user,v_run||'_case1');
 SELECT md5(content::text) INTO v_after_content_hash FROM public.free_analysis_results WHERE profile_id=v_ids[1] AND user_id=v_user;
 v_checks := v_checks || jsonb_build_object('exact_identity_reuses_profile',v_profile=v_ids[1],'existing_completed_result_preserved',v_before_content_hash=v_after_content_hash);
 SELECT resolved_profile_id,transfer_status INTO v_profile,v_status
 FROM public.complete_guest_analysis_transfer(v_guest,md5(v_run||'_reuse'),v_user,v_run||'_case1');
 v_checks := v_checks || jsonb_build_object('same_transfer_replay_idempotent',v_profile=v_ids[1] AND v_status='already_transferred');

 v_blocked:=false;
 BEGIN PERFORM * FROM public.complete_guest_analysis_transfer(v_guest,md5(v_run||'_reuse'),v_other_user,v_run||'_case1');
 EXCEPTION WHEN SQLSTATE 'P0001' THEN v_blocked:=sqlerrm='GUEST_ANALYSIS_ALREADY_CONSUMED'; END;
 v_checks := v_checks || jsonb_build_object('cross_account_consumed_transfer_blocked',v_blocked);

 -- An incompatible self result cannot overwrite the existing self Profile.
 v_guest := gen_random_uuid();
 INSERT INTO public.guest_free_analyses(id,secret_hash,status,profile_input,profile_fingerprint,content,expires_at)
 VALUES(v_guest,md5(v_run||'_self'),'completed',
  jsonb_build_object('label',v_run||'_self','relationshipType','self','birthDate','2000-01-02','birthTime','03:04','birthTimeKnown',true,'gender','남성','calendarType','양력','isLeapMonth',false),
  v_run||'_self',jsonb_build_object('synthetic',true,'run',v_run),now()+interval '1 hour');
 v_blocked:=false;
 BEGIN PERFORM * FROM public.complete_guest_analysis_transfer(v_guest,md5(v_run||'_self'),v_user,v_run||'_self');
 EXCEPTION WHEN SQLSTATE 'P0001' THEN v_blocked:=sqlerrm='SELF_PROFILE_CONFLICT'; END;
 v_checks := v_checks || jsonb_build_object('existing_self_profile_overwrite_blocked',v_blocked);

 v_blocked:=false;
 BEGIN PERFORM * FROM public.complete_guest_analysis_transfer(v_guest,md5(v_run||'_wrong'),v_user,v_run||'_self');
 EXCEPTION WHEN SQLSTATE 'P0001' THEN v_blocked:=sqlerrm='GUEST_ANALYSIS_NOT_FOUND'; END;
 v_checks := v_checks || jsonb_build_object('wrong_guest_proof_blocked',v_blocked);

 v_checks := v_checks || jsonb_build_object(
  'original_profiles_unchanged',v_original_hash=(SELECT md5(jsonb_agg(to_jsonb(p) ORDER BY id)::text) FROM public.profiles p WHERE id=ANY(v_original_ids)),
  'anon_execute_denied',NOT has_function_privilege('anon','public.complete_guest_analysis_transfer(uuid,text,uuid,text)','EXECUTE'),
  'authenticated_execute_denied',NOT has_function_privilege('authenticated','public.complete_guest_analysis_transfer(uuid,text,uuid,text)','EXECUTE'),
  'service_role_execute_allowed',has_function_privilege('service_role','public.complete_guest_analysis_transfer(uuid,text,uuid,text)','EXECUTE'));
 IF EXISTS(SELECT 1 FROM jsonb_each(v_checks) e WHERE e.value IS DISTINCT FROM 'true'::jsonb)
 THEN RAISE EXCEPTION 'GUEST_TRANSFER_REGRESSION_FAILED: %',v_checks; END IF;
 PERFORM set_config('unboda.e2e_result',v_checks::text,true);
END $test$;
SELECT current_setting('unboda.e2e_result')::jsonb AS checks;
ROLLBACK;

