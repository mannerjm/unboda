# UNBODA social safe-automation POC (not in production)
- Verify: `node --test automation/social/safety.test.mjs`.
- The tests use synthetic content, mocked scheduling and no platform write; default API path is fail-closed.
- Video rendering and complete local 9:16 demo are packaged separately in the chat artifact (`unboda_social_automation_poc.zip`); do not publish the demo as-is (no audio and low editorial value).
- Production account has Instagram @unboda.kr, Facebook, Threads, YouTube connected in Metricool brandId 7377653 and account userId 5729495.
- Metricool REST API requires Advanced/Custom plan and token; installed ChatGPT Metricool plugin alone does not provide a token to scheduled backend.
- The current prototype does not contain cron jobs, billing changes, API secrets, permanent media hosting, speech generation, persistent dedupe or monitoring. It never auto-posts unless BOTH the server flag and direct opt-in are true.
- For commercial automation: independent original scripts/visuals, licensed media, narration, explicit AI labelling, privacy and accuracy QA, platform warning alerts, persistent idempotency lock, queue/backoff and daily spend/post count guard are mandatory before unattended mode.
- Never merge/enable on production without verified account API permission and posted-video E2E.
