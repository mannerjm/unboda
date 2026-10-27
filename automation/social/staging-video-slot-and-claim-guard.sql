-- STAGING ONLY. Preserve existing legacy blocked placeholders.
-- One eligible video candidate per exact scheduled UTC moment.
CREATE UNIQUE INDEX IF NOT EXISTS social_one_active_video_per_slot
ON social_automation.jobs(scheduled_for)
WHERE kind='short-video' AND status <> 'BLOCKED';

CREATE OR REPLACE FUNCTION social_automation.enforce_fixed_video_local_slot()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,social_automation AS $$
DECLARE
 local_stamp timestamp;
BEGIN
 IF NEW.kind='short-video' AND NEW.status <> 'BLOCKED' THEN
   local_stamp := NEW.scheduled_for AT TIME ZONE 'Asia/Seoul';
   IF extract(hour from local_stamp)::int NOT IN (0,8,12,20)
      OR extract(minute from local_stamp)::int <> 0
      OR extract(second from local_stamp) <> 0 THEN
      RAISE EXCEPTION 'VIDEO_ONLY_00_08_12_20_KST' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS social_video_slot_guard_v1 ON social_automation.jobs;
CREATE TRIGGER social_video_slot_guard_v1
BEFORE INSERT OR UPDATE OF kind,status,scheduled_for ON social_automation.jobs
FOR EACH ROW EXECUTE FUNCTION social_automation.enforce_fixed_video_local_slot();

CREATE OR REPLACE FUNCTION social_automation.claim_candidate_for_review(
 p_kind text, p_now timestamptz DEFAULT now()
) RETURNS TABLE(claimed_job_id uuid, claimed_job_key text, candidate_slot timestamptz)
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,social_automation
AS $$
 WITH candidate AS (
 SELECT id FROM social_automation.jobs
 WHERE kind=p_kind AND status='PENDING' AND rights_verified=false
  AND editorial_approved=false
  AND scheduled_for>=p_now AND scheduled_for<p_now + interval '48 hours'
  AND content->>'origin'='isolated-staging-only'
  AND content->>'canPublish'='false'
 ORDER BY scheduled_for,id FOR UPDATE SKIP LOCKED LIMIT 1
 ), claimed AS (
 UPDATE social_automation.jobs j SET status='GENERATING',updated_at=now()
 FROM candidate c WHERE j.id=c.id AND j.status='PENDING'
 RETURNING j.id,j.job_key,j.scheduled_for
 )
 SELECT id,job_key,scheduled_for FROM claimed
$$;
REVOKE ALL ON FUNCTION social_automation.claim_candidate_for_review(text,timestamptz)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.claim_candidate_for_review(text,timestamptz)
TO service_role;
