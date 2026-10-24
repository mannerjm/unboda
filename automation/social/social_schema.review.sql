-- DESIGN REVIEW ONLY. NOT a migration, NOT applied to Supabase production.
-- Generate a proper Supabase migration after isolated review and testing.
-- Private, unexposed marketing schema; nothing here touches orders, refunds or customers.
BEGIN;
CREATE SCHEMA IF NOT EXISTS social_automation;
REVOKE ALL ON SCHEMA social_automation FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA social_automation TO service_role;

CREATE TABLE IF NOT EXISTS social_automation.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('text-image','short-video')),
  topic_key text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  media_hash text,
  rights_verified boolean NOT NULL DEFAULT false,
  editorial_approved boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN
    ('PENDING','GENERATING','REVIEW','READY','BLOCKED','COMPLETED')),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS social_jobs_topic_scheduled_idx
  ON social_automation.jobs(topic_key,scheduled_for);

CREATE TABLE IF NOT EXISTS social_automation.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES social_automation.jobs(id) ON DELETE RESTRICT,
  network text NOT NULL CHECK (network IN
    ('instagram','facebook','threads','tiktok','youtube')),
  external_post_id text,
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN
    ('QUEUED','SUBMITTING','SCHEDULED','PENDING','PUBLISHED','FAILED','ESCALATED')),
  scheduled_for timestamptz NOT NULL,
  attempt_count smallint NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 3),
  next_attempt_at timestamptz,
  last_confirmed_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id,network)
);
CREATE UNIQUE INDEX IF NOT EXISTS social_delivery_remote_id_idx
  ON social_automation.deliveries(network,external_post_id)
  WHERE external_post_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS social_automation.delivery_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES social_automation.deliveries(id) ON DELETE RESTRICT,
  event text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE social_automation.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_automation.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_automation.delivery_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA social_automation FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA social_automation TO service_role;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA social_automation TO service_role;
-- No public policies. Backend service_role only.
COMMIT;
