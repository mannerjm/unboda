# NICE staging E2E — isolated deployment plan (NOT LIVE)
Date: 2026-10-24. Branch: `test/nice-staging-isolated-deployment-20261024`.
Status: **templates only; no Vultr, DNS, NICE, Vercel or production runtime changed**.

## Verified baseline
- Production gateway `https://nice-gateway.unboda.kr/health` returned `ok` in owner's browser. Vultr instance `unboda-nice-gateway` is running and systemd service reported `active`.
- Historical successful `VERIFIED_ADULT` events exist in production. This does **not** establish new authentication success today.
- Vercel environment-variable audit has NICE_GATEWAY_URL / NICE_GATEWAY_SHARED_SECRET add events in 2026-09; a production URL create attempt returned ENV_CONFLICT. Earlier list views were truncated. **Do not recreate or rotate production credentials.**
- Staging branch `test/staging-tenant-e2e` is isolated to Supabase `xdiitqyysmhicjcytckm`; two existing staging accounts remain `UNVERIFIED`.
- Toss TEST key format and private Preview flags passed the actual `/api/internal/test-payment-readiness` API; a staging review allowlist entry matches one staging user ID. No payment confirmation performed.
- The deployed production gateway service accepts **one** `NICE_PUBLIC_ORIGIN`, defaulting to `https://unboda.kr`. Do not change this on the existing production process.

## Required isolated staging gateway (when a server admin is available)
1. Confirm NICE permits the separate staging return/close URLs for `https://unboda-git-test-staging-tenant-e2e-unboda.vercel.app/api/identity/nice/{callback,close}`. Obtain any necessary provider-side callback/merchant approval; **do not assume current production credentials support a second domain**.
2. Ensure the staging Preview is reachable through Vercel Deployment Protection for the user's NICE redirect browser flow, without making any protected configuration public by default.
3. Confirm available RAM/CPU on the existing 1 GB Vultr VPS; assess a second Node process load before start. If not feasible, use another isolated instance after approval.
4. Prepare a distinct staging gateway environment file `/etc/unboda-nice-gateway-staging.env`, owner root, mode `0600`. Use a freshly generated **independent** `NICE_GATEWAY_SHARED_SECRET` (at least 32 random bytes), never reuse the production HMAC secret. NICE credentials must be appropriate to authorized staging use.
5. Install the supplied *staging* systemd template on a separate service and keep production service on `127.0.0.1:8787` untouched; staging binds only `127.0.0.1:8788`. Explicitly validate and start only the staging service after maintenance approval.
6. Create and verify the separate `nice-staging-gateway.unboda.kr` DNS hostname and review the Caddy snippet, without replacing the current production virtual host or Caddy configuration. Validate Caddy before any reload.
7. Verify staging's own `/health`, signed probe and NICe result callback on a test account. Do not request the `/v1/nice/*` endpoints without valid HMAC. Confirm all results write **only** to staging Supabase.
8. Store `NICE_GATEWAY_URL=https://nice-staging-gateway.unboda.kr` and the matching **staging-only** HMAC secret in Vercel `Preview` with Git branch `test/staging-tenant-e2e`. Never scope these to generic Preview, Development, or Production.
9. Redeploy only `test/staging-tenant-e2e`; confirm the non-secret staging readiness endpoint shows `niceStagingConfigured: true`. This only confirms configuration, not provider correctness.
10. Complete an owner-approved NICE real test using test person/number on a dedicated staging account; confirm DB `VERIFIED_ADULT` with `provider=NICE` after callback and ensure production DB remained unchanged.
11. Sign in to that very account, which also must be on the branch-only `TOSS_REVIEW_ACCOUNT_IDS` allowlist. Perform Toss **TEST** payment, confirmation, issued entitlement, report generation, rerender/read, AI counseling entry and TEST cancellation/refund, capturing sanitized evidence.
12. Stop and investigate any mismatched origins, signatures, provider callback rejection, identity persistence, or paid-access issuance failures. Do not switch `TOSS_LIVE_CHECKOUT_ENABLED` or execute a production paid transaction as part of this runbook.

## Safety statements
- `/health` or `systemctl is-active` alone does not prove NICE provider token/callback correctness.
- No shared secret, NICE token, identity, session cookies, card details, or payment identifiers belong in GitHub, logs, chat, screenshots, or test documents.
- This PR is **not** a command to deploy, turn on purchases, approve customers, or migrate accounts.
- A real protected Preview callback must be validated end-to-end under Vercel's normal authentication protections, not by permanently disabling protection.
