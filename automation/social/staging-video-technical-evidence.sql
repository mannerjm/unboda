-- STAGING ONLY: durable TECHNICAL PROOF ledger, not media file storage.
-- No public video link, no SNS posting, no customer fields, no paid generation.
CREATE TABLE IF NOT EXISTS social_automation.video_technical_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sha256 text NOT NULL UNIQUE CHECK (sha256 ~ '^[0-9a-f]{64}$'),
 file_bytes bigint NOT NULL CHECK (file_bytes BETWEEN 1000 AND 100000000),
 qa_receipt jsonb NOT NULL,
 github_run_id bigint NOT NULL CHECK (github_run_id > 0),
 github_artifact_id bigint NOT NULL UNIQUE CHECK (github_artifact_id > 0),
 captured_at timestamptz NOT NULL DEFAULT now(),
 permanent_media_url text NULL CHECK (permanent_media_url IS NULL),
 storage_hash_verified boolean NOT NULL DEFAULT false CHECK (NOT storage_hash_verified),
 commercial_rights_approved boolean NOT NULL DEFAULT false CHECK (NOT commercial_rights_approved),
 korean_voice_human_approved boolean NOT NULL DEFAULT false CHECK (NOT korean_voice_human_approved),
 publish_allowed boolean NOT NULL DEFAULT false CHECK (NOT publish_allowed),
 CONSTRAINT video_evidence_tech_review_only CHECK (
  qa_receipt->>'state'='PASS_TECHNICAL_ONLY'
  AND qa_receipt->>'publicationAllowed'='false'
  AND qa_receipt->>'technicalChecksPassed'='true'
  AND qa_receipt->'video'->>'sha256'=sha256
  AND (qa_receipt->'video'->>'bytes')::bigint=file_bytes
  AND jsonb_typeof(qa_receipt->'reasons')='array'
  AND jsonb_array_length(qa_receipt->'reasons')=0
 )
);
ALTER TABLE social_automation.video_technical_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE social_automation.video_technical_evidence FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON social_automation.video_technical_evidence TO service_role;

CREATE OR REPLACE FUNCTION social_automation.record_video_technical_evidence(
 p_report jsonb, p_run_id bigint, p_artifact_id bigint
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,social_automation
AS $$
DECLARE v social_automation.video_technical_evidence%ROWTYPE;
        x text; n bigint;
BEGIN
 x:=p_report->'video'->>'sha256';
 BEGIN
  n:=(p_report->'video'->>'bytes')::bigint;
 EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'INVALID_TECHNICAL_VIDEO_BYTES' USING ERRCODE='23514';
 END;
 IF x IS NULL OR x !~ '^[a-f0-9]{64}$' OR n IS NULL
  OR p_run_id IS NULL OR p_run_id<=0
  OR p_artifact_id IS NULL OR p_artifact_id<=0 THEN
   RAISE EXCEPTION 'INVALID_VIDEO_PROOF_IDENTITY' USING ERRCODE='23514';
 END IF;
 INSERT INTO social_automation.video_technical_evidence(
  sha256,file_bytes,qa_receipt,github_run_id,github_artifact_id)
 VALUES(x,n,p_report,p_run_id,p_artifact_id)
 ON CONFLICT (sha256) DO NOTHING;
 SELECT * INTO v FROM social_automation.video_technical_evidence WHERE sha256=x;
 IF NOT FOUND OR v.github_run_id<>p_run_id OR v.github_artifact_id<>p_artifact_id THEN
  RAISE EXCEPTION 'CONFLICTING_VIDEO_PROOF_REGISTRATION' USING ERRCODE='23505';
 END IF;
 RETURN jsonb_build_object(
  'state','TECHNICAL_EVIDENCE_ONLY','sha256',v.sha256,
  'githubArtifactId',v.github_artifact_id,'fileBytes',v.file_bytes,
  'videoInPermanentStorage',false,'commercialRightsApproved',false,
  'koreanVoiceHumanApproved',false,'readyToPublish',false);
END;
$$;
REVOKE ALL ON FUNCTION social_automation.record_video_technical_evidence(jsonb,bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.record_video_technical_evidence(jsonb,bigint,bigint)
 TO service_role;
