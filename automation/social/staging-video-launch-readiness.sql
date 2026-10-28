-- STAGING-ONLY READ MODEL: display true progress, never unlock publishing.
-- No incomplete SNS provider history or static QA video can become 'ready'.
CREATE OR REPLACE FUNCTION social_automation.inspect_video_launch_readiness(
 p_at timestamptz DEFAULT now()
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path=pg_catalog,social_automation AS $$
DECLARE
 buffer jsonb;
 proofs bigint;
 four_proofs bigint;
 archives bigint;
 approved_rights bigint;
 approved_editorial bigint;
 evidence_missing bigint;
 available_observations bigint;
 mismatched_digests bigint;
 paid_approved bigint;
BEGIN
 buffer:=social_automation.inspect_candidate_buffer(p_at);
 SELECT count(*), count(*) FILTER (WHERE github_run_id=40521381382),
        count(*) FILTER (WHERE commercial_rights_approved)
 INTO proofs,four_proofs,approved_rights
 FROM social_automation.video_technical_evidence;
 SELECT count(*) INTO archives FROM social_automation.private_video_archive_receipts;
 SELECT count(*) INTO approved_editorial
 FROM social_automation.editorial_candidates WHERE publish_ready;
 SELECT count(*) INTO evidence_missing
 FROM social_automation.private_video_archive_receipts a
 LEFT JOIN storage.objects o ON o.bucket_id=a.bucket_id AND o.name=a.object_key
 WHERE o.id IS NULL;
 SELECT count(*),count(*) FILTER (WHERE post_sha256 IS DISTINCT FROM
   encode(pg_catalog.sha256(pg_catalog.convert_to(post_content,'UTF8')),'hex'))
 INTO available_observations,mismatched_digests
 FROM social_automation.remote_post_observations;
 SELECT count(*) INTO paid_approved FROM social_automation.media_cost_policies
 WHERE owner_approved AND hard_cap_krw>0;
 RETURN jsonb_build_object(
  'source','isolated-unboda-staging-only','observedAt',p_at,
  'state','NOT_AUTHORIZED_FOR_AUTO_PUBLICATION',
  'targetDailyVideos',4,'timesKst',jsonb_build_array('00:00','08:00','12:00','20:00'),
  'next48hVideoSlots',(buffer->>'videoCandidates')::int,
  'slotClockHealthy',(buffer->>'candidateBufferHealthy')::boolean,
  'fourSourceVideosPassedTechnicalQA',four_proofs=4,
  'totalTechnicalEvidence',proofs,
  'fourRunTechnicalEvidence',four_proofs,
  'archiveReceiptCount',archives,
  'verifiedArchiveObjectMissing',evidence_missing,
  'fourVideosStoredAndIndependentlyVerified',archives>=4 AND evidence_missing=0,
  'humanReviewedCommercialRightsCount',approved_rights,
  'approvedEditorialCount',approved_editorial,
  'socialObservedPostCount',available_observations,
  'rawSourcePostHashMismatchCount',mismatched_digests,
  'allChannels90dHistoryVerified',false,
  'continuousAIModelGeneratorVerified',false,
  'allChannelsPublicationE2EProved',false,
  'authorizedPaidModelBudgetPolicies',paid_approved,
  'paidProviderCallsAllowed',false,
  'commercialPublicationAllowed',false,
  'automaticPublishingEnabled',false,
  'remainingGates',jsonb_build_array(
    'COMPLETE_90_DAY_MULTI_CHANNEL_PUBLISHED_HISTORY',
    'OWNER_VERIFIED_MODEL_CREDENTIALS_AND_PRIVACY_BUDGET',
    'ORIGINAL_KOREAN_SCRIPTS_DAILY_LIVE_GENERATION',
    'PRIVATE_MP4_STORAGE_FULL_READBACK_SHA256',
    'COMMERCIAL_VOICE_AND_CREATIVE_RIGHTS_HUMAN_REVIEW',
    'INDEPENDENT_PER_CHANNEL_PUBLIC_URL_E2E',
    'FOUR_PER_DAY_WORKER_ACTIVATION_APPROVAL'
  )
 );
END $$;
REVOKE ALL ON FUNCTION social_automation.inspect_video_launch_readiness(timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.inspect_video_launch_readiness(timestamptz)
 TO service_role;
