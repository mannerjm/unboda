-- STAGING ONLY: fix scheduled Metricool observation import failure.
-- Exact Unicode source text is preserved; hashes are of original UTF8 bytes.
-- No SNS writes or automated publishing; existing observations remain private.
CREATE OR REPLACE FUNCTION social_automation.require_observed_post_digest()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,social_automation AS $$
DECLARE expected text;
BEGIN
 expected := encode(pg_catalog.sha256(pg_catalog.convert_to(NEW.post_content,'UTF8')),'hex');
 IF NEW.post_sha256 IS DISTINCT FROM expected THEN
  RAISE EXCEPTION 'PUBLIC_POST_RAW_TEXT_SHA256_MISMATCH' USING ERRCODE='23514';
 END IF;
 IF NEW.verified_full_90_day_coverage IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'UNVERIFIED_SOURCE_CANNOT_ATTEST_HISTORY' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
-- Trigger remains enabled: update BOTH content-bound raw digest and existing
-- normalized digests in one statement; duplicate keys, timestamps and text stay unchanged.
UPDATE social_automation.remote_post_observations
 SET post_sha256=encode(pg_catalog.sha256(pg_catalog.convert_to(post_content,'UTF8')),'hex')
 WHERE post_sha256 IS DISTINCT FROM
  encode(pg_catalog.sha256(pg_catalog.convert_to(post_content,'UTF8')),'hex');
