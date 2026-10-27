-- STAGING ONLY. Service-only atomic draft handoff.
-- No paid generation, posting, credentials, media upload, customer/order fields.
-- This is NOT a verified 90-day public post history ledger.
CREATE OR REPLACE FUNCTION social_automation.save_video_storyboard_draft(
 p_job_key text, p_storyboard jsonb, p_draft_hash text,
 p_source text DEFAULT 'offline-dry-run'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog,social_automation
AS $$
DECLARE
 j social_automation.jobs%ROWTYPE;
 topic text; hook text; situation text; thumbnail text;
 narr jsonb; visuals jsonb; narration text;
 n integer; t text; result jsonb;
BEGIN
 IF p_source <> 'offline-dry-run' OR p_source IS NULL THEN
  RAISE EXCEPTION 'UNAPPROVED_EDITORIAL_PROVENANCE' USING ERRCODE='23514';
 END IF;
 IF p_job_key IS NULL OR length(p_job_key) <> 64 OR p_job_key !~ '^[0-9a-f]{64}$'
  OR p_draft_hash IS NULL OR p_draft_hash !~ '^[0-9a-f]{64}$'
  OR jsonb_typeof(p_storyboard) <> 'object' THEN
  RAISE EXCEPTION 'INVALID_STAGING_DRAFT_INPUT' USING ERRCODE='23514';
 END IF;
 SELECT * INTO j FROM social_automation.jobs
 WHERE job_key=p_job_key FOR UPDATE;
 IF NOT FOUND OR j.kind<>'short-video' OR j.status<>'GENERATING'
  OR j.rights_verified OR j.editorial_approved OR j.media_hash IS NOT NULL
  OR j.scheduled_for<=now()
  OR j.content->>'origin'<>'isolated-staging-only'
  OR j.content->>'canPublish'<>'false' THEN
  RAISE EXCEPTION 'UNCLAIMED_OR_UNSAFE_DRAFT_JOB' USING ERRCODE='23514';
 END IF;
 topic:=p_storyboard->>'topicKey';
 hook:=p_storyboard->>'hook';
 situation:=p_storyboard->>'situation';
 thumbnail:=p_storyboard->>'thumbnailTitle';
 narr:=p_storyboard->'narrationDraft';
 visuals:=p_storyboard->'visualConcepts';
 IF topic IS NULL OR topic !~ '^[a-z0-9][a-z0-9:_-]{7,99}$'
  OR hook IS NULL OR length(hook) NOT BETWEEN 12 AND 90
  OR situation IS NULL OR length(situation) NOT BETWEEN 7 AND 150
  OR thumbnail IS NULL OR length(thumbnail) NOT BETWEEN 5 AND 26
  OR jsonb_typeof(narr)<>'array' OR jsonb_array_length(narr)<>4
  OR jsonb_typeof(visuals)<>'array' OR jsonb_array_length(visuals)<>4 THEN
  RAISE EXCEPTION 'EDITORIAL_STORYBOARD_CONTRACT_INVALID' USING ERRCODE='23514';
 END IF;
 FOR n IN 0..3 LOOP
  IF jsonb_typeof(narr->n)<>'string'
   OR length(narr->>n) NOT BETWEEN 15 AND 240
   OR jsonb_typeof(visuals->n)<>'string'
   OR length(visuals->>n) NOT BETWEEN 12 AND 160 THEN
   RAISE EXCEPTION 'EDITORIAL_SCENES_INVALID' USING ERRCODE='23514';
  END IF;
 END LOOP;
 IF position(situation in (narr->>0))<>1 OR position(hook in (narr->>0))=0 THEN
  RAISE EXCEPTION 'OPENING_DOES_NOT_MATCH_HOOK' USING ERRCODE='23514';
 END IF;
 -- Serialized across concurrent workers. A topic is unique in current
 -- editorial_candidates, plus blocked while present in 90-day job history.
 PERFORM pg_catalog.pg_advisory_xact_lock(64251,pg_catalog.hashtext(topic));
 IF EXISTS(SELECT 1 FROM social_automation.jobs
           WHERE topic_key=topic AND id<>j.id
            AND scheduled_for >= now()-interval '90 days'
            AND status<>'BLOCKED')
 OR EXISTS(SELECT 1 FROM social_automation.editorial_candidates WHERE topic_key=topic)
 OR EXISTS(SELECT 1 FROM social_automation.jobs
           WHERE content->>'draftHash'=p_draft_hash AND id<>j.id
            AND scheduled_for>=now()-interval '90 days') THEN
  RAISE EXCEPTION 'DUPLICATE_STAGING_EDITORIAL_DRAFT' USING ERRCODE='23505';
 END IF;
 narration:=(narr->>0)||E'\n'||(narr->>1)||E'\n'||(narr->>2)||E'\n'||(narr->>3);
 INSERT INTO social_automation.editorial_candidates(
  job_id,topic_key,hook,narration_draft,source,
  visually_reviewed,korean_voice_reviewed,rights_approved,owner_approved,publish_ready)
 VALUES(j.id,topic,hook,narration,'offline_staging_draft_not_published',
  false,false,false,false,false);
 UPDATE social_automation.jobs SET
  topic_key=topic,
  content=j.content||jsonb_build_object(
   'topicKey',topic,'storyboard',p_storyboard,'draftHash',p_draft_hash,
   'editorialSource','offline-staging-only','canPublish',false,
   'realMediaReady',false,'userApprovalGranted',false),
  rights_verified=false, editorial_approved=false,
  media_hash=NULL, status='REVIEW',error_code=NULL,updated_at=now()
 WHERE id=j.id AND status='GENERATING';
 RETURN jsonb_build_object(
   'state','STAGING_REVIEW_ONLY','jobKey',j.job_key,'scheduledFor',j.scheduled_for,
   'topicKey',topic,'draftHash',p_draft_hash,
   'rightsVerified',false,'editorialApproved',false,'mediaReady',false,
   'publicationAllowed',false,'providerCostIncurred',false);
END;
$$;
REVOKE ALL ON FUNCTION social_automation.save_video_storyboard_draft(text,jsonb,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.save_video_storyboard_draft(text,jsonb,text,text)
 TO service_role;
