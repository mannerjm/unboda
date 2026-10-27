-- STAGING ONLY. Records read-only external post observations to reduce duplicates.
-- Observations do NOT prove a complete 90-day posting history.
-- No posting, provider credentials, customer information, or paid generation.
CREATE TABLE IF NOT EXISTS social_automation.remote_post_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 network text NOT NULL CHECK (network IN ('facebook','instagram','threads','tiktok','youtube')),
 media_kind text NOT NULL CHECK (media_kind IN ('feed','reels','stories','video')),
 provider_id text NOT NULL CHECK(length(provider_id) BETWEEN 4 AND 255),
 provider_datetime text NOT NULL CHECK(provider_datetime ~ '^[0-9]{14}$'),
 post_content text NOT NULL CHECK(length(post_content)<=12000),
 post_sha256 text NOT NULL CHECK(post_sha256 ~ '^[a-f0-9]{64}
 source text NOT NULL DEFAULT 'metricool_analytics_observation'
   CHECK(source='metricool_analytics_observation'),
 observed_at timestamptz NOT NULL DEFAULT now(),
 first_observed_at timestamptz NOT NULL DEFAULT now(),
 verified_full_90_day_coverage boolean NOT NULL DEFAULT false
    CHECK(verified_full_90_day_coverage=false),
 UNIQUE(network,media_kind,provider_id)
);
CREATE INDEX IF NOT EXISTS remote_observation_provider_date
 ON social_automation.remote_post_observations(network,provider_datetime);
ALTER TABLE social_automation.remote_post_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON social_automation.remote_post_observations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON social_automation.remote_post_observations TO service_role;

CREATE OR REPLACE FUNCTION social_automation.inspect_remote_observations(
 p_at timestamptz DEFAULT now()
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER
SET search_path=pg_catalog,social_automation
AS $$
 SELECT jsonb_build_object(
  'source','metricool_analytics_observation',
  'observedChannels',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'network',network,'kind',media_kind,'count',n)),'[]'::jsonb)
    FROM (SELECT network,media_kind,count(*) AS n FROM social_automation.remote_post_observations
      GROUP BY network,media_kind ORDER BY network,media_kind) x),
  'totalObservedPosts',(SELECT count(*) FROM social_automation.remote_post_observations),
  'verifiedRemoteHistory',false,'allProviderPagesVerified',false,
  'postingOrPaidCallsPerformed',false,'publishingEnabled',false
 )
$$;
REVOKE ALL ON FUNCTION social_automation.inspect_remote_observations(timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.inspect_remote_observations(timestamptz)
 TO service_role;
),
 source text NOT NULL DEFAULT 'metricool_analytics_observation'
   CHECK(source='metricool_analytics_observation'),
 observed_at timestamptz NOT NULL DEFAULT now(),
 first_observed_at timestamptz NOT NULL DEFAULT now(),
 verified_full_90_day_coverage boolean NOT NULL DEFAULT false
    CHECK(verified_full_90_day_coverage=false),
 UNIQUE(network,media_kind,provider_id)
);
CREATE INDEX IF NOT EXISTS remote_observation_provider_date
 ON social_automation.remote_post_observations(network,provider_datetime);
ALTER TABLE social_automation.remote_post_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON social_automation.remote_post_observations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON social_automation.remote_post_observations TO service_role;

CREATE OR REPLACE FUNCTION social_automation.inspect_remote_observations(
 p_at timestamptz DEFAULT now()
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER
SET search_path=pg_catalog,social_automation
AS $$
 SELECT jsonb_build_object(
  'source','metricool_analytics_observation',
  'observedChannels',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'network',network,'kind',media_kind,'count',n)),'[]'::jsonb)
    FROM (SELECT network,media_kind,count(*) AS n FROM social_automation.remote_post_observations
      GROUP BY network,media_kind ORDER BY network,media_kind) x),
  'totalObservedPosts',(SELECT count(*) FROM social_automation.remote_post_observations),
  'verifiedRemoteHistory',false,'allProviderPagesVerified',false,
  'postingOrPaidCallsPerformed',false,'publishingEnabled',false
 )
$$;
REVOKE ALL ON FUNCTION social_automation.inspect_remote_observations(timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.inspect_remote_observations(timestamptz)
 TO service_role;
