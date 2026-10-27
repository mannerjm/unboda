-- STAGING ONLY: detect tampered corpus content SHA-256 on every insert/update.
-- This table is not a complete public 90d history and must never authorize publishing.
CREATE OR REPLACE FUNCTION social_automation.require_observed_post_digest()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,social_automation
AS $$
BEGIN
 IF NEW.post_sha256 <> encode(
    pg_catalog.sha256(pg_catalog.convert_to(lower(btrim(NEW.post_content)),'UTF8')),'hex')
  THEN RAISE EXCEPTION 'PUBLIC_POST_TEXT_SHA256_MISMATCH' USING ERRCODE='23514';
 END IF;
 IF NEW.verified_full_90_day_coverage IS DISTINCT FROM false
  THEN RAISE EXCEPTION 'UNVERIFIED_SOURCE_CANNOT_ATTEST_HISTORY' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS remote_observed_post_integrity_guard ON social_automation.remote_post_observations;
CREATE TRIGGER remote_observed_post_integrity_guard
BEFORE INSERT OR UPDATE ON social_automation.remote_post_observations
FOR EACH ROW EXECUTE FUNCTION social_automation.require_observed_post_digest();
REVOKE ALL ON FUNCTION social_automation.require_observed_post_digest()
 FROM PUBLIC,anon,authenticated;
