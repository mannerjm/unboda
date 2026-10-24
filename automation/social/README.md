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


## 2026-10-24 real MP4 integration + 48h buffer (review branch only)
- A previously mock-only video renderer failed during a real local FFmpeg run: combining `trim` and `setpts` caused xfade to receive an invalid nominal framerate. Fixed by preserving explicit 30-fps timebase across each scene. The local smoke now renders a 30-second 1080x1920 H.264/AAC MP4 and `ffprobe` confirms both streams.
- `render.integration.test.mjs` generates FOUR synthetic colored scene PNG files and ONE synthetic test tone (no natural speech), runs FFmpeg for real and checks actual MP4 metadata. These fixtures are NOT commercial-ready media. GitHub Actions installs FFmpeg explicitly and runs the integration test in isolation with no Metricool or paid AI token.
- `buffer.mjs`: deterministic local-KST 48-hour candidate schedule; 16 text+image and 8 short-video candidates for a full 48h window, stable per-brand job keys and explicit media+rights+editorial readiness criteria. **It does not fill the buffer with actual created content.**
- `worker.mjs`: mockable orchestration interface for durable claims and unapproved editorial candidates; production must implement a real atomic database claim and budget reservation before executing the interface. A mock ledger can prove a second call does not regenerate a test candidate.
- `budget.mjs`: fails closed unless a future provider's cost, monthly USD-cent budget, reserved spend, budget lock and subscription validation are all known and approved; **no purchased service, charge, or vendor is configured**.
- Browser access, paid-plan upgrades, production migrations, remote Metricool REST posts and server Cron activation have NOT occurred.
- This test establishes an audiovisual **format baseline**, NOT premium cinematic motion, factual accuracy, natural Korean TTS quality, or public SNS delivery. A high-quality Korean commercial demo must be approved and its original assets/rights documented before launch.


## 2026-10-24 phase: Paid-provider adapters, still OFF
The user approved continuing **development only**, not new provider spending/subscriptions.
- `narration.mjs`: production-shaped ElevenLabs `POST /v1/text-to-speech/{voice_id}` request for `eleven_multilingual_v2`, Korean script checks, voice license and editorial approvals, budget reservation, opt-in and API key gates, binary audio response QA. Model's Korean support independently checked against official docs. A successful API response STILL needs spoken-Korean pronunciation/loudness/editorial review, file storage and transcoding.
- `motion.mjs`: Runway `POST /v1/image_to_video` (`gen4_turbo`, 720:1280, 10 sec default) and `GET /v1/tasks/{id}` state lookup. Valid source image license, approved prompts, estimated cost reservations, actual credential and explicit paid toggle are required. Task acceptance is NOT finished video; fetch and independently probe downloaded output, never repeatedly POST when remote status is unclear.
- `motion-assembly.mjs`: ffmpeg sequence of four distinct, editorial/rights-approved actual MP4 clips plus licensed narration, 1080x1920 30-sec final MP4. Independently ffprobe each source for at least 8 seconds and vertical dimensions, and confirm narration stream duration between 20 and 31 seconds. The included integration uses moving synthetic FFmpeg test footage and a test tone ONLY: not quality Korean speech and not a commercial video.
- `cost-estimate.mjs`: Runway gen4_turbo at official price snapshot $0.05/sec (5 credits/sec, $0.01/credit), and ElevenLabs multilingual v2 about 1 credit/input character. At 4 short videos/day × 30 days, one 10 sec high-end segment/video costs **approximately $60/mo for Runway generation only**, and sample 300 Korean chars/video about 36,000 ElevenLabs TTS credits/month (excludes model provider TTS subscription cost, source images, retry, LLM, rendering, Metricool, tax). These figures are NOT a subscription purchase, and must be rechecked before launch.
- Need actual approved Runway developer API credits and ElevenLabs account/API key with confirmed commercial rights; **no credentials or provider purchase were added**. As of this PR the adapters are exercised with mocked provider responses and independent synthetic FFmpeg videos, not actual remote generative media.
- High-quality creative guidance: focus useful information about 사주, 띠, 오행, 절기, 궁합, 꿈의 전통적 상징. Distinguish dream folklore from saju functionality. Make an educational hook + substantive insight + brief invitation to free UNBODA saju, NOT repeated low-value promotional images. Voice must speak natural, understandable Korean, with subtitles and a content fact review.
- Before any live activation: provision production secrets in a dedicated environment, approve strict monthly spend, set source-video & voice provenance, implement atomic budget reservations/ledger, verify remote tasks, generate a real Korean TTS + premium moving scene test, confirm output publicly accessible, and obtain owner's sample quality approval. No SNS publishing until these are satisfied.

## 2026-10-24 first real episode creative preproduction (not a publishable video)
- Owner direction: useful saju information and zodiac/dream/fortune topics **first**; UNBODA CTA is brief and at the end.
- Episode 001: `episodes/001-zodiac-vs-saju.json`: "띠만 보면 사주를 알 수 있을까요?" shows how zodiac animals relate to traditional birth-year classification whereas four pillars traditionally examine year/month/day/hour; traditional explanation is informational, not certain prediction. The episode has **no fact/audiovisual/site approval** yet.
- Produced a local 30-sec 1080×1920 H.264/AAC animated visual concept with four original procedural story frames and 100% self-generated ambient audio. File remains a conversation artifact; it is NOT committed to GitHub and NOT scheduled to any SNS. No commercial Korean TTS or third-party cinematic AI clip is included. The visual is a sample of concept and typography rather than finalized motion/commercial quality.
- `hybrid.mjs` & tests: enforce cost-aware design **one 10-sec premium Runway scene maximum + three original locally made motion-graphic video clips**, never four paid clips while claiming one-clip costs. Rights and quality, spending reservation and explicit enable gates required. Default remains OFF.
- Official API review: Runway API credits are separate from Runway's web app plan (https://help.runwayml.com/hc/en-us/articles/21668552945171-Runway-API-FAQs); gen4_turbo 5 credits/sec × $0.01/credit = $0.50 per 10-sec attempt (https://docs.dev.runwayml.com/guides/pricing/). Actual credit purchase minimum, taxes, failed attempts and re-generations are not included. Runway claims generated content can be used commercially, subject to original source/media rights.
- ElevenLabs `eleven_multilingual_v2` supports Korean and needs a **paid commercial-use plan** to license output. Monthly Starter $6/30k credits; Creator $22/121k credits (intro discounts ignored). For 120 videos x ~300 characters ~36k credits BEFORE retries, Creator is a safer starting plan than Starter unless a cheaper supported model or shorter script is chosen. https://elevenlabs.io/ko/pricing
- Pilot testing should be limited to one approved Korean TTS read and one approved 10-sec premium image-to-video call. Because these calls create account charges, neither is executed without explicit subscription/account setup, isolated API keys and a new owner-approved pilot budget. NEVER request API secrets as chat messages; store in a restricted server environment when provisioned.
- All SNS posting, payment/refunds/customer records and production Vercel/Supabase remain unchanged. Legacy ChatGPT 3h/6h tasks are independent and must not be mistaken for a deployed 365-day server.

## 2026-10-24 visual redesign V2 after owner rejected the first reel
- Owner reviewed the first video and rejected its crowded Korean copy, line spacing, overlay/cropping and overall visual quality. **Previous file is NOT APPROVED FOR PUBLICATION.**
- Rebuilt the first educational episode's 30s 1080×1920 MP4 with a new editorial grid; four scenes with only two headline lines and one small informative sentence each:
  1. "띠만 알면 / 사주도 알 수 있을까?" — simple 12-sign illustration
  2. "띠는 태어난 해의 / 동물 상징이에요" — cultural information
  3. "사주는 네 기둥을 / 함께 살펴봐요" — 년주·월주·일주·시주 illustration
  4. "사주 해석은 / 참고로 살펴보세요" — disclosure and a single "운보다 무료 사주" CTA
- Drawn with available Korean NanumSquare text layout, coherent deep navy/gold visuals, wider spacing and text-free platform controls zone. Explicit bounding-box check keeps ALL **30 programmatically placed text elements** in [104,220] to [976,1515] pixels, leaving top 220px and bottom 405px no text.
- `layout.mjs` + tests codifies video shape, conservative text areas and **mandatory separate human visual, voice, educational and rights approvals**. These tests do not themselves approve publication.
- A new local 30-second MP4, four PNG scenes, a Python rebuild script and numeric layout report are delivered in the conversation artifact. They are **not automatically pushed as binary media into this repo**. The repo holds the updated episode brief and runtime safety gate.
- V2 is still a **visual-design review animatic only**, with original synthesized ambient audio but **no Korean narrator, no Runway-generated premium moving scene, no actual platform publication**. A video can pass safe-area QA and still fail cinematic quality; content still needs editorial acceptance.
- No subscription, API purchase, upload, deployment, order/refund/customer data or production cron has been changed.
