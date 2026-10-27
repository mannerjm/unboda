-- STAGING ONLY; read-only aggregate inspection. No exposed public API, no post creation.
-- Do NOT apply to unboda or unboda-prod.
CREATE OR REPLACE FUNCTION social_automation.inspect_candidate_buffer(
 p_clock timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path=pg_catalog
AS $$
 WITH upcoming AS (
  SELECT kind,status,scheduled_for,updated_at,media_hash,
         rights_verified,editorial_approved,content->>'canPublish' as can_publish
  FROM social_automation.jobs
  WHERE scheduled_for>=p_clock
    AND scheduled_for<p_clock+interval '48 hours'
    AND status<>'BLOCKED'
 ), summary AS (
  SELECT
    count(*) FILTER (WHERE kind='short-video') AS video_candidates,
    count(*) FILTER (WHERE kind='text-image') AS image_candidates,
    count(DISTINCT scheduled_for) FILTER (WHERE kind='short-video') AS unique_video_slots,
    count(DISTINCT scheduled_for) FILTER (WHERE kind='text-image') AS unique_image_slots,
    count(*) FILTER (WHERE kind='short-video' AND status='READY'
      AND rights_verified AND editorial_approved AND media_hash IS NOT NULL
      AND can_publish='true') AS verified_ready_video,
    count(*) FILTER (WHERE kind='text-image' AND status='READY'
      AND rights_verified AND editorial_approved AND media_hash IS NOT NULL
      AND can_publish='true') AS verified_ready_image,
    count(*) FILTER (WHERE status='GENERATING'
      AND updated_at<p_clock-interval '45 minutes') AS stale_generating,
    count(*) FILTER (WHERE kind='short-video' AND
      to_char(scheduled_for AT TIME ZONE 'Asia/Seoul','HH24:MI')
      NOT IN ('00:00','08:00','12:00','20:00')) AS invalid_video_clock
  FROM upcoming
 )
 SELECT jsonb_build_object(
  'source','unboda-staging-read-only',
  'observedAt',p_clock,
  'windowHours',48,
  'expectedVideoCandidates',8,
  'expectedTextImageCandidates',16,
  'videoCandidates',video_candidates,
  'textImageCandidates',image_candidates,
  'uniqueVideoSlots',unique_video_slots,
  'uniqueTextImageSlots',unique_image_slots,
  'videoMediaReady',verified_ready_video,
  'textImageMediaReady',verified_ready_image,
  'staleGenerating',stale_generating,
  'invalidVideoClock',invalid_video_clock,
  'candidateBufferHealthy',(video_candidates>=8 AND image_candidates>=16
   AND unique_video_slots>=8 AND unique_image_slots>=16
   AND stale_generating=0 AND invalid_video_clock=0),
  'realMedia48hReady',(verified_ready_video>=8 AND verified_ready_image>=16),
  'canAuthorizePublishing',false,
  'publishingEnabled',false
 ) FROM summary
$$;
REVOKE ALL ON FUNCTION social_automation.inspect_candidate_buffer(timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.inspect_candidate_buffer(timestamptz)
 TO service_role;
