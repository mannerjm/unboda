# UNBODA social safe-automation POC (not in production)
- Verify: `node --test automation/social/safety.test.mjs`.
- The tests use synthetic content, mocked scheduling and no platform write; default API path is fail-closed.
- Video rendering and complete local 9:16 demo are packaged separately in the chat artifact (`unboda_social_automation_poc.zip`); do not publish the demo as-is (no audio and low editorial value).
- Production account has Instagram @unboda.kr, Facebook, Threads, YouTube connected in Metricool brandId 7377653 and account userId 5729495.
- Metricool REST API requires Advanced/Custom plan and token; installed ChatGPT Metricool plugin alone does not provide a token to scheduled backend.
- The current prototype does not contain cron jobs, billing changes, API secrets, permanent media hosting, speech generation, persistent dedupe or monitoring. It never auto-posts unless BOTH the server flag and direct opt-in are true.
- For commercial automation: independent original scripts/visuals, licensed media, narration, explicit AI labelling, privacy and accuracy QA, platform warning alerts, persistent idempotency lock, queue/backoff and daily spend/post count guard are mandatory before unattended mode.
- Never merge/enable on production without verified account API permission and posted-video E2E.

## 2026-10-24 integration check
- Existing Metricool connections: Facebook Page, Instagram @unboda.kr, Threads @unboda.kr, YouTube channel.
- Facebook and Threads text POST scheduling already runs through the ChatGPT Metricool integration, independently of this prototype.
- Instagram and Facebook image STORY pilot scheduled via the connected Metricool tool for 2026-10-27 10:00 KST; still PENDING until the scheduled time and not proof of publication.
- Added **mock-only** payload coverage for Facebook REEL, Facebook STORY, Instagram STORY and Instagram POST alongside Instagram REEL and YouTube Short.
- The pilot MP4 was verified locally as 1080x1920, 18-second H.264/AAC, but has no independently verified public media URL; NO Instagram Reel, Facebook Reel, or YouTube Short has been scheduled here.
- No service token, customer data, hosting bucket, or production publisher has been configured. Account OAuth and Metricool's separate REST API plan are not equivalent to ChatGPT plugin connectivity.
- Do not assume sandbox/local video paths work as media URLs. Publish only after a genuine externally accessible, appropriately licensed video file is hosted and per-network E2E passes.
- No production activation or merge authorization implied by these draft changes.

## 2026-10-24 editorial cadence expansion (still NOT production)
The owner requested 365-day, 24-hour, fully original saju-first educational content:
- Text+**new photo**: every 2 hours, 12 candidate slots/day.
- Original 9:16 Reel/Short: every 4 hours, 6 candidate slots/day.
- Substantive 4-8 minute YouTube teaching video: every 6 hours, 4 candidate slots/day.
- Total: 22 candidate originals/day, 8,030 candidates/year, **before** cross-posting to individual platforms.
- Distinct topic/day is different from genuine non-repetition between posts: vary actual teaching substance, not merely changing title/intro.
- Intent: teach traditional concepts accurately, note limits of divination, invite free saju experience, measure real acquisition → checkout conversion. Do NOT flood platforms with promotional or barely varied content.

**Production readiness status**:
- Existing ChatGPT/Metricool scheduling, 2026-10-24 educational image/photo post, and 2026-10-29 one cross-channel pilot Reel/Short are real, but do not prove indefinite unattended generation.
- ChatGPT recurring tasks have been registered for cadence evaluation with fail-closed safeguards, separate from the app repo.
- Persistent topic+creative ledger, durable scheduling locks, server-side LLM/image/video generation with reproducible Korean QA, a confirmed Metricool Advanced/Custom API token/plan, a rights-verified media archive and end-to-end published media checks remain **unimplemented** in the production system.
- `cadence.mjs` models conservative per-slot go/no-go decisions and may ONLY be used in mocked/unit tests until server-side durable history and current per-provider account quota exist.
- Metricool fair-use policy: monthly base **600 posts/brand** triggers manual review above threshold and may temporarily stop publishing. This is a review threshold, not guaranteed allowed unlimited publishing. Prototype guard uses 500 posts/rolling 30d across channel deliveries as an internal conservative safety limit.
- Metricool platform reference limits: Instagram 50/24h, Facebook 30 Reels/24h, YouTube Free 10/24h or paid 20/24h, Threads 250/24h; always verify real effective account and plan before write (limits may change).
- Even one social post on multiple networks may count as multiple deliveries; 22 originals x 30 days already exceeds the 600 review threshold before cross-posting.
- Never bypass provider limits by opening substitute accounts, serially rotating identities, or auto-generating low-effort similar videos. No automated purchases/paid ads/production payment changes.
- First production step is plan/permission audit and scoped pilot with real published URL checks; until then publishing remains fail-closed.

**Original information themes** (examples): the four pillars and calendar basics; 천간과 지지; 오행 interactions and interpretations; day master explained carefully; seasonal traditional perspectives; common misconceptions; birth hour unknown; why identical birth date does not guarantee identical fate; ethical interpretation; compatibility communication; work habits; money habits; mindful reflection; differences between traditional concepts and evidence-based prediction. Attach author-reviewed explanations before publication. Cite/validate serious factual claims, and never imply saju can guarantee money, health, marriage, or jobs.
