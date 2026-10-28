-- Staging-only editorial candidates. Not AI output or licensed production assets.
CREATE TABLE IF NOT EXISTS social_automation.editorial_candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL UNIQUE REFERENCES social_automation.jobs(id) ON DELETE RESTRICT,
 topic_key text NOT NULL UNIQUE,
 hook text NOT NULL,
 narration_draft text NOT NULL,
 source text NOT NULL DEFAULT 'reference_template_only',
 visually_reviewed boolean NOT NULL DEFAULT false,
 korean_voice_reviewed boolean NOT NULL DEFAULT false,
 rights_approved boolean NOT NULL DEFAULT false,
 owner_approved boolean NOT NULL DEFAULT false,
 publish_ready boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT editorial_can_publish_only_if_approved CHECK (
  publish_ready=false OR (visually_reviewed AND korean_voice_reviewed
   AND rights_approved AND owner_approved))
);
ALTER TABLE social_automation.editorial_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON social_automation.editorial_candidates FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON social_automation.editorial_candidates TO service_role;
INSERT INTO social_automation.editorial_candidates(job_id,topic_key,hook,narration_draft)
SELECT j.id,v.topic_key,v.hook,v.script FROM (
 VALUES
 ('2026-10-28T08:00:00+09:00'::timestamptz,'20261028-08-work-commute',
 '출근길에 이미 기운이 빠지는 날, 왜 그럴까요?',
 '출근길에 이미 기운이 빠지는 날이 있죠. 일이 너무 많아서인지, 나에게 맞지 않는 환경인지 생각해 보세요. 사주는 나의 성향을 돌아보는 전통적 관점일 뿐, 실제 선택은 내 상황에 맞게 결정하는 게 중요해요.'),
 ('2026-10-28T12:00:00+09:00'::timestamptz,'20261028-12-love-messages',
 '연락은 오는데 왜 자꾸 서운할까요?',
 '분명 답장은 오는데 서운할 때가 있죠. 연락 횟수보다 서로 기대하는 방식이 다른 건 아닌지 살펴보세요. 사주는 관계를 돌아보는 하나의 시선이에요. 서로의 마음은 대화로 확인하는 게 더 중요하겠죠.'),
 ('2026-10-28T20:00:00+09:00'::timestamptz,'20261028-20-money-payday',
 '월급날이 지났는데 왜 늘 돈이 부족할까요?',
 '열심히 일했는데 월말엔 돈이 남지 않는다면, 작은 지출부터 확인해 보세요. 돈을 대하는 습관을 알아보는 게 시작입니다. 사주는 성향을 돌아보는 참고일 뿐, 재정 결정은 실제 수입과 지출을 근거로 하세요.'),
 ('2026-10-29T00:00:00+09:00'::timestamptz,'20261029-00-night-reflection',
 '하루가 끝났는데 마음은 왜 바쁠까요?',
 '하루 종일 잘 버텼는데 밤에 생각이 많아질 때가 있죠. 오늘 마음에 남은 감정을 한 가지 적어 보세요. 사주가 말하는 성향도 나를 이해하는 하나의 참고일 뿐, 오늘의 마음을 스스로 돌보는 시간이 중요합니다.')
) v(slot,topic_key,hook,script)
JOIN social_automation.jobs j ON j.scheduled_for=v.slot
 AND j.kind='short-video' AND j.status='PENDING'
ON CONFLICT DO NOTHING;
