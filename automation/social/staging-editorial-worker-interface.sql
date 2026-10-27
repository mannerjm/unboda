-- STAGING ONLY. Service-only JSONB canonical hashing, no caller-set approval flags.
CREATE OR REPLACE FUNCTION social_automation.save_video_storyboard_from_worker(
 p_job_key text, p_storyboard jsonb
) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER
SET search_path=pg_catalog,social_automation
AS $$
 SELECT social_automation.save_video_storyboard_draft(
  p_job_key,p_storyboard,
  encode(pg_catalog.sha256(pg_catalog.convert_to(p_storyboard::text,'UTF8')),'hex'),
  'offline-dry-run'
 )
$$;
REVOKE ALL ON FUNCTION social_automation.save_video_storyboard_from_worker(text,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.save_video_storyboard_from_worker(text,jsonb)
 TO service_role;

-- Source history is only staged review drafts, NOT the user's 90-day
-- published social feed. Caller MUST independently establish remote coverage.
CREATE OR REPLACE FUNCTION social_automation.get_staging_video_draft_history(
 p_at timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path=pg_catalog,social_automation
AS $$
 SELECT jsonb_build_object(
  'source','isolated-staging-review-ledger',
  'windowDays',90,
  'includesAllPublishedPlatforms',false,
  'verifiedRemoteHistory',false,
  'windowStart',p_at-interval '90 days',
  'windowEnd',p_at,
  'truncated',(SELECT count(*)>1500 FROM social_automation.jobs
   WHERE kind='short-video' AND content ? 'storyboard'
     AND updated_at>=p_at-interval '90 days' AND updated_at<=p_at),
  'items',(
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'topicKey',topic_key,
      'narrationDraft',content->'storyboard'->'narrationDraft',
      'createdAt',updated_at::text
    ) ORDER BY updated_at),'[]'::jsonb)
    FROM social_automation.jobs
    WHERE kind='short-video' AND content ? 'storyboard'
      AND updated_at>=p_at-interval '90 days' AND updated_at<=p_at
  )
 )
$$;
REVOKE ALL ON FUNCTION social_automation.get_staging_video_draft_history(timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.get_staging_video_draft_history(timestamptz)
 TO service_role;
