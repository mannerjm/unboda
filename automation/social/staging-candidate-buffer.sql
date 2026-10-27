-- STAGING ONLY. Plan 48h guaranteed candidate slots with 3h overlapping lookahead; no Metricool writes or paid generations.
-- Seed extra 3h beyond 48h so the 3-hourly cron can refill without a 15-of-16 photo gap.
-- p_hours stays 48 for compatibility; actual provisional lookahead is 51h.
-- Video clock: 00 08 12 20 local KST. 24:00 means next-day midnight.
CREATE OR REPLACE FUNCTION social_automation.seed_future_candidates(
 p_clock timestamptz DEFAULT now(),p_hours integer DEFAULT 48
) RETURNS TABLE(kind text,inserted integer)
LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,social_automation
AS $$
DECLARE
 k text; at_time timestamptz; n integer; d integer; h integer;
 origin timestamptz; seconds_per_slot integer; first_index bigint;
 added integer; affected integer; hash_key text;
BEGIN
 IF p_clock IS NULL OR p_hours<>48 THEN RAISE EXCEPTION 'FIXED_48H_WINDOW_REQUIRED'; END IF;
 -- Every existing 3h staging seed also reclaims stalled unpaid candidates.
 -- Recovery is bounded (max 30/scan), can never publish, and enforces retries.
 PERFORM social_automation.recover_stale_candidate_reviews(p_clock);
 FOR k IN SELECT unnest(ARRAY['text-image','short-video']) LOOP
  added:=0;
  IF k='text-image' THEN
   origin:='2026-10-24T19:30:00+09:00'::timestamptz;
   seconds_per_slot:=10800;
   first_index:=greatest(0,ceil(extract(epoch from (p_clock-origin))/seconds_per_slot)::bigint);
   FOR n IN 0..16 LOOP
    at_time:=origin+(first_index+n)*seconds_per_slot*interval '1 second';
    IF at_time>=p_clock AND at_time<p_clock+interval '51 hours' THEN
     hash_key:=encode(sha256(convert_to('7377653|'||k||'|'||
      to_char(at_time AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'UTF8')),'hex');
     INSERT INTO social_automation.jobs(job_key,kind,topic_key,scheduled_for,content,status)
     VALUES(hash_key,k,'staging-unassigned:'||k||':'||to_char(at_time AT TIME ZONE 'UTC','YYYYMMDDHH24MISS'),
      at_time,jsonb_build_object('origin','isolated-staging-only','ready',false,'canPublish',false), 'PENDING')
     ON CONFLICT(job_key) DO NOTHING;
     GET DIAGNOSTICS affected=ROW_COUNT;added:=added+affected;
    END IF;
   END LOOP;
  ELSE
   -- Evaluate four local wall-clock times across four dates. Exactly eight fall within 48h.
   FOR d IN 0..3 LOOP
    FOREACH h IN ARRAY ARRAY[0,8,12,20] LOOP
     at_time:=(((p_clock AT TIME ZONE 'Asia/Seoul')::date+d)
       +make_interval(hours=>h)) AT TIME ZONE 'Asia/Seoul';
     IF at_time>=p_clock AND at_time<p_clock+interval '51 hours' THEN
      hash_key:=encode(sha256(convert_to('7377653|'||k||'|'||
       to_char(at_time AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'UTF8')),'hex');
      INSERT INTO social_automation.jobs(job_key,kind,topic_key,scheduled_for,content,status)
      VALUES(hash_key,k,'staging-unassigned:'||k||':'||to_char(at_time AT TIME ZONE 'UTC','YYYYMMDDHH24MISS'),
       at_time,jsonb_build_object('origin','isolated-staging-only','ready',false,'canPublish',false), 'PENDING')
      ON CONFLICT(job_key) DO NOTHING;
      GET DIAGNOSTICS affected=ROW_COUNT;added:=added+affected;
     END IF;
    END LOOP;
   END LOOP;
  END IF;
  kind:=k;inserted:=added;RETURN NEXT;
 END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION social_automation.seed_future_candidates(timestamptz,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION social_automation.seed_future_candidates(timestamptz,integer)
 TO service_role;
