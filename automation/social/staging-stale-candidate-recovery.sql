-- STAGING ONLY. Reclaim abandoned CANDIDATE-ONLY generating attempts safely.
-- No publication, generation/provider calls, customer/payment tables or token access.
CREATE OR REPLACE FUNCTION social_automation.recover_stale_candidate_reviews(
 p_clock timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, social_automation
AS $$
DECLARE
 queued integer:=0; stopped integer:=0;
BEGIN
 IF p_clock IS NULL THEN RAISE EXCEPTION 'CLOCK_REQUIRED'; END IF;
 WITH locked AS (
  SELECT id, CASE WHEN content->>'recoveryAttempts' ~ '^[0-2]$'
                  THEN (content->>'recoveryAttempts')::int ELSE 0 END AS previous_attempts
  FROM social_automation.jobs
  WHERE kind IN ('text-image','short-video') AND status='GENERATING'
    AND updated_at < p_clock-interval '45 minutes'
    AND rights_verified=false AND editorial_approved=false
    AND content->>'origin'='isolated-staging-only'
    AND content->>'canPublish'='false'
  ORDER BY updated_at,id FOR UPDATE SKIP LOCKED LIMIT 30
 ), changed AS (
  UPDATE social_automation.jobs j SET
   status=CASE WHEN x.previous_attempts>=2 OR j.scheduled_for<p_clock
               THEN 'BLOCKED' ELSE 'PENDING' END,
   error_code=CASE WHEN x.previous_attempts>=2 OR j.scheduled_for<p_clock
                   THEN 'STAGING_RETRY_EXHAUSTED_OR_EXPIRED' ELSE 'STAGING_REQUEUED_STALE' END,
   content=jsonb_set(j.content,'{recoveryAttempts}',
     to_jsonb(x.previous_attempts+1),true),
   updated_at=p_clock
  FROM locked x WHERE j.id=x.id AND j.status='GENERATING'
  RETURNING j.status
 )
 SELECT count(*) FILTER (WHERE status='PENDING'),
        count(*) FILTER (WHERE status='BLOCKED')
 INTO queued,stopped FROM changed;
 RETURN jsonb_build_object('source','staging-only','requeued',coalesce(queued,0),
   'blocked',coalesce(stopped,0),'publicationEnabled',false,
   'paidGenerationEnabled',false);
END $$;
REVOKE ALL ON FUNCTION social_automation.recover_stale_candidate_reviews(timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.recover_stale_candidate_reviews(timestamptz)
 TO service_role;
