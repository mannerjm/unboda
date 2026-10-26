# 운보다 Advanced 15 독립 API 연결 운영 안내 (2026-10-26)

## 현재 확인된 사실
- Metricool Advanced 15: Active, monthly USD 67, next renewal 2026-11-26 (owner billing screen).
- Metricool 브랜드 blogId `7377653`, userId `5729495`, Instagram/Facebook/Threads/TikTok Business/YouTube 연결.
- X add-on: **Not contracted**, 0 of 0 X accounts. Twitter/X publishing must remain disabled unless addon and account permissions verified.
- ChatGPT 3-hour content task remains ACTIVE. 6-hour auto video task remains DISABLED. Existing published/scheduled Metricool items must not be recreated.
- Isolated staging tables (`unboda-staging.social_automation.*`) are created with RLS and no public grants; no user/order/payment/refund data changed.
- Vercel development branch `test/social-automation-safety-poc-20261023` has only nonsecret IDs and explicit `SOCIAL_PUBLISH_ENABLED=false`, `SOCIAL_PAID_GENERATION_ENABLED=false`.

## Next safe onboarding of REST API token
1. Owner visits Metricool > Settings > API tab and confirms access token is available. **Do not paste token into chat, pull requests, screenshots, code, GitHub issues or logs.**
2. Before storing, establish a **protected, reviewed, standalone server-side environment** for social automation with restricted deploy rights. The existing application Production credential space and generic unprotected PR Preview are not suitable for uncontrolled SNS posting secrets.
3. Create `METRICOOL_API_TOKEN` as encrypted/sensitive server-only secret with least necessary deployment scope; pair with `METRICOOL_USER_ID=5729495` and `METRICOOL_BLOG_ID=7377653`. Keep public `NEXT_PUBLIC_*` prefixes forbidden for secrets.
4. Run `verifyAdvancedRestAccess` read-only via a protected backend that performs only `GET /api/admin/simpleProfiles`; confirm visible brand ID, HTTP 200, no token disclosure. A connected ChatGPT Metricool MCP token is not a substitute for Advanced REST authentication.
5. Test media normalize `mediaId` separately using one original/public/permanent and rights-verified test asset. Never schedule media-less posts.
6. Implement a durable ledger backend with atomic job claims, remote slot checks, delivery reconciliation, account quota checks and budget caps. The *schema alone is not a running worker*.
7. Owner approves one original commercial-quality Korean video after voice, captions, animation, rights and audio QA. Runway is optional; locally edited/motion and licensed real footage first. No unapproved video generation charges.
8. One controlled, explicit, per-channel E2E: `scheduled` -> `PENDING` -> `PUBLISHED` and verify public URL; if response ambiguous, query remote account, do not retry POST blindly. Check each supported network format in current Metricool API.
9. Activate independent scheduler **only after** testing and a no-overlap handoff that disables/reconfigures the corresponding ChatGPT task. Stop/alert on network credential errors, quota uncertainty, spam/rate-limit signals, missing royalty rights or runaway costs.

## Release gates (all required)
- Dedicated server actually deployed, safe secrets connected, staging + production ledger reviewed and tested;
- Real approved content creation for image and narrated short-video slots, zero silent slideshow masquerading as premium;
- 30-day quota and existing queue reconciled (baseline 500/channel deliveries safety target, Metricool brand fair-use review at 600);
- Exact owner-approved video generation and hosting spend cap (currently 0; not authorized);
- Existing payment/refund and customer systems unaffected;
- Health monitoring and human escalation; no perpetual-success promise without active subscriptions and maintenance.

## Exact current blocker
Advanced plan is ACTIVE. **Private credential and read-only REST access are confirmed in an isolated dedicated Vercel project**, but durable worker execution, cloud ledger, content generation and live publishing E2E are not connected, so unattended real publishing cannot be truthfully marked running.

## Verified direct REST connection — 2026-10-26, Korea Standard Time
- User saved `METRICOOL_API_TOKEN` as **Sensitive / Production only** in the entirely separate Vercel project `unboda-social-worker` (`prj_RyQvXNzNDpbHyUulparzelfSbD5R`). Credential values were never read, printed, or copied into GitHub.
- Independent Vercel production deployment **`dpl_BdpjtLh4Bj7TmAExYhwvcpZz3eN4`** READY. Build-only requests used authenticated GET `/api/admin/simpleProfiles?userId=5729495` and verified `blogId=7377653`. Safe build output: `UNBODA_SOCIAL_CHECK: BRAND_AUTHENTICATED_READ_ONLY`.
- The same token then successfully fetched `GET /api/v2/scheduler/posts` with blogId/userId/date window `2026-10-26 00:00` through `2026-10-31 23:59` Asia/Seoul. Build output (only aggregate counts, no captions/token): `SCHEDULE_READ_OK count=38 pending=33 published=9 error=0 other=0`. Posts and per-provider deliveries are counted separately, so totals differ.
- The deployment's only public entrypoint returns HTTP 404, `X-Robots-Tag: noindex,nofollow`, body `Social live publishing disabled`, no route with access to the credentials. Posting flag and paid media generation flag both false.
- This satisfies only **live authentication and scheduled-post inventory READ**. No `POST`, `PUT`, `PATCH`, `DELETE`, paid generation, cron scheduler, or autonomous production publishing was enabled or proven. Treat the counts as a historical snapshot.
- Next engineering gate: a restricted job runner connected to reviewed Supabase social-only ledger, image+commercial narration/video generation and QA, remote duplicate lock, real publish single-post E2E, and safe switchover from the ChatGPT task.
