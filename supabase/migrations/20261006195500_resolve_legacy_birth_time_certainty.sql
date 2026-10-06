-- Resolve legacy birth-time certainty only where the old UI proves the
-- customer explicitly changed the required time away from its historical
-- 12:00 default. Never infer certainty for a legacy 12:00 row.
--
-- The old profile form required a time and defaulted to 12:00. Therefore a
-- non-noon legacy value is an explicit customer-entered clock time.
--
-- Keep an existing free-saju result current when it already contains an hour
-- pillar for that same explicit clock time by updating only its canonical
-- snapshot/fingerprint metadata. Paid reports and purchases remain frozen.

with legacy_explicit_time as (
  select
    p.id,
    p.user_id,
    p.birth_date,
    p.birth_time,
    p.gender,
    p.calendar_type,
    p.is_leap_month,
    encode(
      digest(
        convert_to(
          '{"birthDate":"' || to_char(p.birth_date, 'YYYY-MM-DD')
          || '","birthTime":"' || to_char(p.birth_time, 'HH24:MI')
          || '","birthTimeKnown":true'
          || ',"gender":"' || case p.gender when 'male' then '남성' else '여성' end
          || '","calendarType":"' || case p.calendar_type when 'solar' then '양력' else '음력' end
          || '","isLeapMonth":' || case when p.is_leap_month then 'true' else 'false' end
          || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as confirmed_fingerprint
  from public.profiles p
  where p.birth_time_known is null
    and p.birth_time <> time '12:00'
),
updated_free as (
  update public.free_analysis_results far
  set
    profile_snapshot = jsonb_set(
      coalesce(far.profile_snapshot, '{}'::jsonb),
      '{birthTimeKnown}',
      'true'::jsonb,
      true
    ),
    profile_fingerprint = legacy.confirmed_fingerprint,
    content = case
      when far.content is null then null
      when far.content->'profile' is null then far.content
      else jsonb_set(far.content, '{profile,birthTimeKnown}', 'true'::jsonb, true)
    end
  from legacy_explicit_time legacy
  where far.user_id = legacy.user_id
    and far.profile_id = legacy.id
    and far.profile_snapshot->>'birthTimeKnown' is null
    and far.profile_snapshot->>'birthTime' = to_char(legacy.birth_time, 'HH24:MI')
    and coalesce(far.content->'saju'->>'hourPillarHanja', '') <> ''
  returning far.id
)
update public.profiles p
set birth_time_known = true
where p.birth_time_known is null
  and p.birth_time <> time '12:00';

-- Do not silently infer legacy 12:00 rows. Runtime creation now requires an
-- explicit boolean, so null remains historical-only.
