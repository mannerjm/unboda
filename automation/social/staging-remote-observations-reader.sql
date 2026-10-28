-- STAGING ONLY: service-only read of previously observed public posts.
-- This is not a complete 90-day feed proof: explicitly false in receipt.
CREATE OR REPLACE FUNCTION social_automation.get_observed_public_post_corpus(
 p_as_of timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,social_automation
AS $$
 SELECT jsonb_build_object(
  'source','isolated-staging-public-post-observations',
  'verified90DayCoverage',false,
  'allProviderPagesVerified',false,
  'truncated',(SELECT count(*)>1500 FROM social_automation.remote_post_observations),
  'items',(
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'network',network,'kind',media_kind,'providerId',provider_id,
      'rawProviderDate',provider_datetime,'postText',post_content,
      'postSha256',post_sha256
    ) ORDER BY provider_datetime,network,media_kind),'[]'::jsonb)
    FROM (SELECT network,media_kind,provider_id,provider_datetime,
                 post_content,post_sha256
     FROM social_automation.remote_post_observations
     ORDER BY provider_datetime,network,media_kind
     LIMIT 1501) t
  )
 )
$$;
REVOKE ALL ON FUNCTION social_automation.get_observed_public_post_corpus(timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.get_observed_public_post_corpus(timestamptz)
 TO service_role;
