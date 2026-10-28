-- Staging only: block unapproved old 02:00/14:00 KST 6h placeholders.
-- Keep all historical rows and all existing Metricool posts untouched.
UPDATE social_automation.jobs AS j
SET status='BLOCKED',error_code='SUPERSEDED_BY_FIXED_KST_VIDEO_TIMES',updated_at=now()
WHERE j.kind='short-video' AND j.status='PENDING'
 AND j.content->>'origin'='isolated-staging-only'
 AND j.rights_verified=false AND j.editorial_approved=false
 AND j.scheduled_for>now()
 AND extract(hour from (j.scheduled_for AT TIME ZONE 'Asia/Seoul')) NOT IN (0,8,12,20)
 AND NOT EXISTS (SELECT 1 FROM social_automation.deliveries d WHERE d.job_id=j.id);
