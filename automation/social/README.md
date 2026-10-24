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
