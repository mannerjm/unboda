-- STAGING ONLY. Future paid model calls must reserve an owner-approved KRW ceiling.
-- This does NOT call a provider or enable publishing.
-- No policy is approved by default; absent/zero budget blocks all paid work.
CREATE TABLE IF NOT EXISTS social_automation.media_cost_policies (
 month_kst date NOT NULL,
 provider text NOT NULL CHECK (provider IN ('openai','runway','elevenlabs','other-paid-ai')),
 hard_cap_krw bigint NOT NULL DEFAULT 0 CHECK (hard_cap_krw BETWEEN 0 AND 1000000),
 owner_approved boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(month_kst,provider),
 CONSTRAINT first_day_of_month CHECK (extract(day from month_kst)=1),
 CONSTRAINT explicit_cost_approval CHECK (owner_approved OR hard_cap_krw=0)
);
CREATE TABLE IF NOT EXISTS social_automation.media_cost_reservations (
 job_id uuid NOT NULL REFERENCES social_automation.jobs(id) ON DELETE RESTRICT,
 provider text NOT NULL,
 request_key text NOT NULL CHECK (request_key ~ '^[a-z0-9_-]{12,100}$'),
 month_kst date NOT NULL,
 reserved_krw bigint NOT NULL CHECK (reserved_krw>0),
 state text NOT NULL DEFAULT 'RESERVED' CHECK (state IN ('RESERVED','RECONCILE','SETTLED')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(job_id,provider,request_key),
 FOREIGN KEY(month_kst,provider) REFERENCES social_automation.media_cost_policies(month_kst,provider)
);
CREATE INDEX IF NOT EXISTS media_cost_reservation_month ON
 social_automation.media_cost_reservations(month_kst,provider);
ALTER TABLE social_automation.media_cost_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_automation.media_cost_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON social_automation.media_cost_policies FROM PUBLIC,anon,authenticated;
REVOKE ALL ON social_automation.media_cost_reservations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON social_automation.media_cost_policies TO service_role;
GRANT SELECT,INSERT ON social_automation.media_cost_reservations TO service_role;

CREATE OR REPLACE FUNCTION social_automation.reserve_paid_media_budget(
 p_job_key text,p_provider text,p_request_key text,p_max_krw bigint
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,social_automation
AS $$
DECLARE
 j social_automation.jobs%ROWTYPE;
 b social_automation.media_cost_policies%ROWTYPE;
 m date; total_krw bigint; prior bigint;
BEGIN
 IF p_job_key IS NULL OR p_job_key !~ '^[a-f0-9]{64}$' OR
    (p_provider IS NULL OR p_provider NOT IN ('openai','runway','elevenlabs','other-paid-ai')) OR
    p_request_key IS NULL OR p_request_key !~ '^[a-z0-9_-]{12,100}$' OR
    p_max_krw IS NULL OR p_max_krw NOT BETWEEN 1 AND 1000000 THEN
   RETURN jsonb_build_object('state','BLOCKED','reason','INVALID_BUDGET_REQUEST',
    'providerCallsAllowed',false,'publishingAllowed',false);
 END IF;
 SELECT * INTO j FROM social_automation.jobs WHERE job_key=p_job_key FOR UPDATE;
 IF NOT FOUND OR j.kind<>'short-video' OR j.status<>'GENERATING'
    OR j.rights_verified OR j.editorial_approved OR j.media_hash IS NOT NULL
    OR j.scheduled_for<=now() OR
    j.content->>'origin'<>'isolated-staging-only' OR
    j.content->>'canPublish'<>'false' OR
    j.content->>'remoteHistoryVerified' IS DISTINCT FROM 'true' THEN
   RETURN jsonb_build_object('state','BLOCKED','reason','VERIFIED_STAGING_GENERATION_LEASE_REQUIRED',
    'providerCallsAllowed',false,'publishingAllowed',false);
 END IF;
 m:=date_trunc('month',j.scheduled_for AT TIME ZONE 'Asia/Seoul')::date;
 SELECT * INTO b FROM social_automation.media_cost_policies
  WHERE month_kst=m AND provider=p_provider FOR UPDATE;
 IF NOT FOUND OR b.owner_approved IS DISTINCT FROM true OR b.hard_cap_krw<=0 THEN
   RETURN jsonb_build_object('state','BLOCKED','reason','OWNER_APPROVED_KRW_CAP_REQUIRED',
    'providerCallsAllowed',false,'publishingAllowed',false);
 END IF;
 SELECT reserved_krw INTO prior FROM social_automation.media_cost_reservations
  WHERE job_id=j.id AND provider=p_provider AND request_key=p_request_key;
 IF FOUND THEN
   RETURN jsonb_build_object('state','BLOCKED','reason','PAID_PROVIDER_REQUEST_ALREADY_RESERVED_RECONCILE',
    'reservedKrw',prior,'providerCallsAllowed',false,'publishingAllowed',false);
 END IF;
 SELECT coalesce(sum(reserved_krw),0) INTO total_krw
 FROM social_automation.media_cost_reservations
 WHERE month_kst=m AND provider=p_provider;
 IF total_krw + p_max_krw > b.hard_cap_krw THEN
   RETURN jsonb_build_object('state','BLOCKED','reason','PROVIDER_MONTHLY_HARD_CAP_REACHED',
    'reservedKrw',total_krw,'approvedMonthlyCapKrw',b.hard_cap_krw,
    'providerCallsAllowed',false,'publishingAllowed',false);
 END IF;
 INSERT INTO social_automation.media_cost_reservations(
    job_id,provider,request_key,month_kst,reserved_krw)
 VALUES(j.id,p_provider,p_request_key,m,p_max_krw);
 RETURN jsonb_build_object('state','BUDGET_RESERVED_ONLY','requestKey',p_request_key,
  'provider',p_provider,'monthKst',m,'reservedKrw',p_max_krw,
  'approvedMonthlyCapKrw',b.hard_cap_krw,'publishingAllowed',false,
  'providerCallsAllowed',false,'externalCallNotExecuted',true);
END;
$$;
REVOKE ALL ON FUNCTION social_automation.reserve_paid_media_budget(text,text,text,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.reserve_paid_media_budget(text,text,text,bigint)
 TO service_role;
