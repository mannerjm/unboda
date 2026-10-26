-- STAGING-ONLY automatic 48-hour slot planning, NOT public SNS publishing.
-- Requires pg_cron 1.6.4; runs each three hours ~15m before the image-slot boundary.
-- The command contains no secrets and cannot publish or spend money.
SELECT cron.schedule(
 'unboda_staging_social_candidate_buffer_v1',
 '15 1,4,7,10,13,16,19,22 * * *',
 $$SELECT * FROM social_automation.seed_future_candidates(now(),48)$$
);
