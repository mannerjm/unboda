-- STAGING ONLY. A private MP4 is not "stored" until the server has
-- downloaded it back and compared full SHA256/byte count.
-- This ledger is distinct from technical QA and cannot authorize SNS publishing.
CREATE TABLE IF NOT EXISTS social_automation.private_video_archive_receipts (
 sha256 text PRIMARY KEY REFERENCES social_automation.video_technical_evidence(sha256),
 bucket_id text NOT NULL DEFAULT 'unboda-social-private-review'
  CHECK(bucket_id='unboda-social-private-review'),
 object_key text NOT NULL UNIQUE CHECK(object_key ~ '^qa/[0-9a-f]{64}\.mp4$'),
 file_bytes bigint NOT NULL CHECK(file_bytes BETWEEN 1024 AND 45000000),
 readback_sha256 text NOT NULL CHECK(readback_sha256 ~ '^[0-9a-f]{64}$'),
 verified_at timestamptz NOT NULL DEFAULT now(),
 private_only boolean NOT NULL DEFAULT true CHECK(private_only=true),
 commercial_rights_approved boolean NOT NULL DEFAULT false CHECK(commercial_rights_approved=false),
 public_url text NULL CHECK(public_url IS NULL),
 publish_allowed boolean NOT NULL DEFAULT false CHECK(publish_allowed=false),
 CONSTRAINT archive_matches_hash CHECK(
   object_key='qa/'||sha256||'.mp4' AND readback_sha256=sha256)
);
ALTER TABLE social_automation.private_video_archive_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON social_automation.private_video_archive_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON social_automation.private_video_archive_receipts TO service_role;

CREATE OR REPLACE FUNCTION social_automation.record_private_video_readback(
 p_sha256 text,p_object_key text,p_bytes bigint,p_actual_readback_sha256 text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,social_automation AS $$
DECLARE
 evidence social_automation.video_technical_evidence%ROWTYPE;
 b storage.buckets%ROWTYPE; o storage.objects%ROWTYPE;
 old social_automation.private_video_archive_receipts%ROWTYPE;
BEGIN
 IF p_sha256 IS NULL OR p_sha256 !~ '^[a-f0-9]{64}$'
  OR p_object_key IS DISTINCT FROM 'qa/'||p_sha256||'.mp4'
  OR p_actual_readback_sha256 IS DISTINCT FROM p_sha256
  OR p_bytes IS NULL OR p_bytes NOT BETWEEN 1024 AND 45000000 THEN
  RAISE EXCEPTION 'INVALID_PRIVATE_ARCHIVE_READBACK' USING ERRCODE='23514';
 END IF;
 SELECT * INTO evidence FROM social_automation.video_technical_evidence
  WHERE sha256=p_sha256 FOR UPDATE;
 IF NOT FOUND OR evidence.file_bytes<>p_bytes
  OR evidence.qa_receipt->>'state'<>'PASS_TECHNICAL_ONLY'
  OR evidence.publish_allowed OR evidence.commercial_rights_approved
  THEN RAISE EXCEPTION 'APPROVED_TECHNICAL_QA_RECEIPT_REQUIRED' USING ERRCODE='23514';
 END IF;
 SELECT * INTO b FROM storage.buckets
  WHERE id='unboda-social-private-review';
 IF NOT FOUND OR b.public IS DISTINCT FROM false OR b.file_size_limit<>45000000
  THEN RAISE EXCEPTION 'PRIVATE_STORAGE_BUCKET_VERIFICATION_FAILED' USING ERRCODE='23514';
 END IF;
 SELECT * INTO o FROM storage.objects
  WHERE bucket_id=b.id AND name=p_object_key;
 IF NOT FOUND OR o.metadata IS NULL OR
  COALESCE(o.metadata->>'size','') !~ '^[0-9]+$' OR
  (o.metadata->>'size')::bigint<>p_bytes
  THEN RAISE EXCEPTION 'PRIVATE_OBJECT_MISSING_OR_SIZE_UNVERIFIED' USING ERRCODE='23514';
 END IF;
 IF o.metadata ? 'mimetype' AND o.metadata->>'mimetype'<>'video/mp4'
  THEN RAISE EXCEPTION 'UNEXPECTED_PRIVATE_MEDIA_CONTENT_TYPE' USING ERRCODE='23514';
 END IF;
 SELECT * INTO old FROM social_automation.private_video_archive_receipts
   WHERE sha256=p_sha256;
 IF FOUND THEN
  IF old.object_key<>p_object_key OR old.file_bytes<>p_bytes OR
     old.readback_sha256<>p_actual_readback_sha256
     THEN RAISE EXCEPTION 'CONFLICTING_PRIVATE_ARCHIVE_RECEIPT' USING ERRCODE='23505';
  END IF;
 ELSE
  INSERT INTO social_automation.private_video_archive_receipts
   (sha256,object_key,file_bytes,readback_sha256)
  VALUES(p_sha256,p_object_key,p_bytes,p_actual_readback_sha256);
 END IF;
 RETURN jsonb_build_object('state','PRIVATE_ARCHIVE_DB_RECORDED',
  'sha256',p_sha256,'bucket',b.id,'objectKey',p_object_key,'bytes',p_bytes,
  'actualReadbackSha256',p_actual_readback_sha256,
  'publicUrl',null,'publicationAllowed',false,
  'commercialRightsApproved',false,'socialPostCreated',false);
END;
$$;
REVOKE ALL ON FUNCTION social_automation.record_private_video_readback(text,text,bigint,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.record_private_video_readback(text,text,bigint,text)
 TO service_role;
