-- STAGING ONLY: deterministic 48-hour candidate ledger, NOT a publisher.
-- This function has no outbound network, no image/video provider, and no Metricool writes.
CREATE OR REPLACE FUNCTION social_automation.seed_future_candidates(
  p_clock timestamptz DEFAULT now(), p_hours integer DEFAULT 48
)
RETURNS TABLE(kind text, inserted integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog,social_automation
AS $$
DECLARE
  v record;
  n integer;
  at_time timestamptz;
  added integer;
  did_insert integer;
  job_key_hash text;
BEGIN
  IF p_clock IS NULL OR p_hours <> 48 THEN
    RAISE EXCEPTION 'FIXED_48H_WINDOW_REQUIRED';
  END IF;
  FOR v IN
    SELECT * FROM (VALUES
      ('text-image'::text, '2026-10-24T19:30:00+09:00'::timestamptz,10800,16),
      ('short-video'::text, '2026-10-24T20:00:00+09:00'::timestamptz,21600,8)
    ) AS t(kind,anchor,seconds_per_slot,maximum_slots)
  LOOP
    added := 0;
    FOR n IN 0..(v.maximum_slots-1) LOOP
      at_time := v.anchor + ((ceil(extract(epoch from (p_clock-v.anchor))/v.seconds_per_slot)::bigint+n)*v.seconds_per_slot)*interval '1 second';
      IF at_time >= p_clock AND at_time < p_clock + interval '48 hours' THEN
        job_key_hash := encode(sha256(convert_to(
          '7377653|' || v.kind || '|' ||
          to_char(at_time AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'UTF8')), 'hex');
        INSERT INTO social_automation.jobs(job_key,kind,topic_key,scheduled_for,content,status)
        VALUES (job_key_hash,v.kind,
          'staging-unassigned:' || v.kind || ':' || to_char(at_time AT TIME ZONE 'UTC','YYYYMMDDHH24MISS'),
          at_time,
          jsonb_build_object('origin','isolated-staging-only','ready',false,'mediaVerified',false,'editorialApproved',false,'canPublish',false),
          'PENDING')
        ON CONFLICT(job_key) DO NOTHING;
        GET DIAGNOSTICS did_insert = ROW_COUNT;
        added := added + did_insert;
      END IF;
    END LOOP;
    kind:=v.kind;inserted:=added;RETURN NEXT;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION social_automation.seed_future_candidates(timestamptz,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.seed_future_candidates(timestamptz,integer) TO service_role;
