# UNBODA Social Automation — isolated implementation (NOT production)

## Goal and ownership
- 365-day **candidate** pipeline for high-quality Korean traditional saju, zodiac, dream-symbol folklore, compatibility, five-elements and practical reflection content. Substantive educational material first, brand promotion naturally, never false scientific certainty.
- **Text + original image:** 3-hour candidate slots (8 originals/day).
- **Original 15–45 second vertical video:** 6-hour candidate slots (4 originals/day).
- **Long videos are disabled.**
- Distribution: 1 verified eligible Instagram/Facebook/Threads image destination per creative; up to 2 Instagram/Facebook/YouTube/TikTok video destinations, selected based on available slots and last posting time, **not randomly**.
- 70% educational / 20% interactive / 10% explicit branded marketing is an initial editorial goal, not a guaranteed realized output mix.
- Instagram, Facebook, Threads, YouTube and TikTok Business @unboda.kr were verified in Metricool brand 7377653 via connected ChatGPT plugin on 2026-10-24. TikTok first video booked for 2026-10-25 11:00 KST (PENDING then), not proof of actual publishing.

## What was implemented in this review branch
- `creative.mjs` & tests: 7 distinct Korean editorial pillar families, topic-key exclusion, strict JSON brief/scene output contract, plagiarism-favorable copy and disclaimer requirements, fail-closed generation when no LLM provider. All generated drafts are **NEEDS_EDITORIAL_QA**: never an auto-approved authoritative claim.
- `render.mjs` & tests: ready-to-run FFmpeg 1080x1920, 30fps H.264/AAC **narrated** 30sec video assembly from four legally verified image assets and one real licensed voice file, scene transitions, loudness treatment and ffprobe verification. **No image generation API, Korean TTS provider, or high-end video generation API is connected**, so this is an engineering renderer, NOT a complete cinematic source video generator. No silent or copyright-unknown videos may be posted.
- `cadence.mjs` & tests: 3h/6h candidate slot timing, a deterministic least-recently-used supported channel selector, explicitly verified account quotas, all-network cumulative last/next 30-day 500-post conservative guard, topical/fingerprint checks, durable history and lock prerequisites.
- `recovery.mjs` & tests: classify authentication, content rights, rate limits and transient faults; verify remote published state before retry, bounded 5/30/120-minute backoff, max three retries, pause and notify for manual problems. Stateless: needs a durable worker to execute decisions.
- `metricool.mjs` & tests: network payload planning includes Instagram, Facebook, Threads, TikTok Business and YouTube. Network I/O remains OFF unless multiple deliberate environment gates are enabled. Metricool REST request schema and response MUST be verified with subscribed Advanced/Custom account, even if a ChatGPT Metricool connected-plugin booking succeeded.
- `social_schema.review.sql`: **draft, not a migration or deployed schema** for an isolated private-service-role-only job ledger, delivery records, retries and idempotency keys.
- `.github/workflows/unboda-social-safety-dry-run.yml`: mock-only PR tests. It has no cloud secrets and performs no platform writes.

## What is **not done** (blocking unattended launch)
1. Actual autonomous 365-day host/worker/scheduler and secure deployment: **not implemented or enabled**.
2. Real LLM/image/TTS/cinematic-video credentials, approved cost caps and original asset storage: **not connected**. A high-resolution motion-slide renderer alone is not cinematic AI video.
3. Human-initially-reviewed source material and a reliable automated fact/brand QA + license provenance pipeline: **not complete**.
4. The private ledger proposal has not been migrated to Supabase, tested with real transactions or wired to a worker. Orders, refunds, purchase entitlement and customer records must stay untouched.
5. Metricool Advanced/Custom plan/token and production independent REST POST/GET posted URL E2E: **not available/verified**. User does not need to buy a plan until the other local pieces and video sample quality are accepted.
6. Reliable 48-hour prebuilt buffer (16 images + 8 videos), notifications, remote post confirmation, failure reconciliation and monitoring: **design/logic only, not running**.
7. Regulatory/platform monthly and daily practical account limits must be confirmed for the actual subscription and networks. 500/30-day is an **internal safety target**, not an official contractual quota.

## Operational prerequisites for a future release
- Keep `SOCIAL_PUBLISH_ENABLED=false` by default and never configure tokens in code, GitHub issues, or chat messages.
- Securely provide `METRICOOL_API_TOKEN`, `METRICOOL_USER_ID`, `METRICOOL_BLOG_ID` plus **true durable ledger, account quota and media URL verification** after deployment and approved operator review.
- Approval of real AI spending ceilings including retries; provider terms for commercial use, AI labels and sound/music are mandatory.
- Prepare rights-proven audio and four or more original scene images per film; run `renderShortVideo`, then check independent factual and audiovisual editorial quality before scheduling.
- Publish one controlled live E2E per network and verify **PUBLISHED** and actual public page, not just **PENDING**.
- Confirm lifecycle: create -> render -> fact/licensing QA -> persistent lock -> schedule -> remote verify -> only then completion; on unknown outcome do not blindly retry.
- Once independent worker is live, disable or deconflict the separate ChatGPT recurrent attempt tasks to prevent duplication.

## Validation
```bash
node --test automation/social/*.test.mjs
```

Run tests without Metricool secrets. They use synthetic posts and mocked network responses, never real uploads.

The separate ChatGPT automations currently attempt 3h image and 6h short video *if original media is available*; neither these attempt schedules nor this PR guarantee content creation or unattended publishing. No payments, production deployment, refund processing, real customer data or third-party paid subscriptions have been changed by this branch.
