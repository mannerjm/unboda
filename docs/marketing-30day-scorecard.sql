-- UNBODA marketing: read-only 30-day cohort scorecard (KST).
-- Run only through an authorized administrator/DB connection.
-- No visitor_id, session_id, birthday, IP, names or report text in output.
-- Source: public.marketing_funnel_events (90-day retention, RLS protected).
-- This is an observation query, NOT a public API view, NOT a write.
-- A source may remain social/other when an in-app browser strips referrers.
WITH e AS (
  SELECT
    event_date_kst AS day_kst,
    coalesce(current_channel, 'other') AS channel,
    coalesce(current_source, 'other') AS source,
    coalesce(campaign, '(none)') AS campaign,
    session_id,
    event_name
  FROM public.marketing_funnel_events
  WHERE is_internal = false
    AND event_date_kst BETWEEN
      (now() AT TIME ZONE 'Asia/Seoul')::date - 29
      AND (now() AT TIME ZONE 'Asia/Seoul')::date
)
SELECT
  day_kst, channel, source, campaign,
  count(DISTINCT session_id) FILTER (WHERE event_name = 'SITE_PAGE_VIEWED') AS visit_sessions,
  count(DISTINCT session_id) FILTER (WHERE event_name = 'FREE_CTA_CLICKED') AS free_cta_sessions,
  count(DISTINCT session_id) FILTER (WHERE event_name = 'FREE_PAGE_VIEWED') AS free_page_sessions,
  count(DISTINCT session_id) FILTER (WHERE event_name = 'FREE_FORM_STARTED') AS free_form_sessions,
  count(DISTINCT session_id) FILTER (WHERE event_name = 'FREE_SUBMIT_CLICKED') AS free_submit_sessions,
  count(DISTINCT session_id) FILTER (WHERE event_name = 'FREE_ANALYSIS_STARTED') AS free_started_sessions,
  count(DISTINCT session_id) FILTER (WHERE event_name = 'FREE_ANALYSIS_COMPLETED') AS free_completed_sessions,
  count(DISTINCT session_id) FILTER (WHERE event_name = 'FREE_ANALYSIS_FAILED') AS free_failed_sessions,
  count(DISTINCT session_id) FILTER (WHERE event_name = 'FREE_RESULT_VIEWED') AS free_result_sessions,
  round(100.0 * count(DISTINCT session_id) FILTER (WHERE event_name = 'FREE_RESULT_VIEWED')
    / nullif(count(DISTINCT session_id) FILTER (WHERE event_name = 'FREE_PAGE_VIEWED'), 0), 1)
    AS result_from_free_page_pct
FROM e
GROUP BY day_kst, channel, source, campaign
ORDER BY day_kst DESC, visit_sessions DESC, channel, source, campaign;
