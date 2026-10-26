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
Advanced plan is ACTIVE. **Credential is not stored in an approved independent worker, and no authenticated REST request has yet been proven**, so unattended real publishing cannot be truthfully marked running.
