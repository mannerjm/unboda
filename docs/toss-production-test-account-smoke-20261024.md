# Production-hosted Toss TEST smoke test (fail-closed; not a LIVE launch)

Date: 2026-10-24. Draft PR on `test/production-toss-sandbox-review-20261024` — **NOT deployed**.

## Why
The existing `TOSS_TEST_ACCOUNT_ID` matches one NICE-verified production lifecycle. `TOSS_REVIEW_ACCOUNT_IDS` is a Sensitive env variable: the integration cannot recover its original plaintext without risking overwrite. Keep it untouched.

The code change adds a second, independent, **exact-match** reviewer env `TOSS_REVIEW_EXTRA_TEST_ACCOUNT_ID`, and accepts this ONLY if `TOSS_HYBRID_ROUTING_ENABLED=true`, `TOSS_TEST_ACCOUNT_ID` is valid, and both IDs are identical. All non-test accounts preserve the LIVE/pilot approval checks. It never bypasses NICE adult verification.

## Security audit gate found on 2026-10-24
GitHub Actions **Launch Security Audit** failed at `npm audit --omit=dev --audit-level=high` before running launch regression or build. The same repository's lockfile pins Next.js **16.3.4** and sharp **0.35.4**; the audit reported **1 critical + 3 high** production dependency findings, including Next.js advisories and librsvg in sharp. The wider audit counted 1 critical + 4 high. **Do not merge or deploy this PR to Production until the dependency audit is fixed and re-run successfully.** Never use `npm audit --force` without a version-compatibility review. The Vercel Preview may be READY while GitHub's blocking security audit is red.

## Preconditions BEFORE merging or Production redeploy
1. Owner approves a narrowly scoped Production TEST-smoke deployment; confirm the selected test account can be logged into by the operator (cannot impersonate).
2. Store only the same merchant's **API individual integration** `test_ck_` client key and `test_sk_` secret in Vercel Production, as `TOSS_CLIENT_KEY` and `TOSS_SECRET_KEY`, **Sensitive**. Existing staging Sensitive keys cannot be retrieved/copied by the automation. Enter them directly in the Vercel dashboard from Toss; never post them to chat, GitHub, logs, or screenshots.
3. Configure Production `TOSS_ENVIRONMENT=sandbox`, `TOSS_REVIEW_MODE=enabled`, `TOSS_ALLOW_LIVE=false`, `TOSS_HYBRID_ROUTING_ENABLED=true`. `TOSS_LIVE_CHECKOUT_ENABLED=false` stays OFF. Retain the existing LIVE keys and the current pilot state unchanged.
4. Configure Production `TOSS_REVIEW_EXTRA_TEST_ACCOUNT_ID` to the **existing** `TOSS_TEST_ACCOUNT_ID`, which must match the NICE-verified owner test account. Do not read/overwrite the original `TOSS_REVIEW_ACCOUNT_IDS`.
5. Check actual Production deployment receives these environment variables, with PROD source `main`, and no unrelated releases or DB migrations. Require all prebuild regression tests green (including new exact-reviewer isolation cases).
6. Before any payment, login as the specifically allowed test user. Confirm `/api/payments/toss/client-config` returns `environment:sandbox`, `clientKey` starting `test_ck_`, and an unapproved customer remains denied. Do not log or share full keys.
7. Ensure that the selected account's NICE eligibility is still `VERIFIED_ADULT`.
8. **Only owner/operator** manually completes Toss TEST checkout, verifies an actual TEST provider payment and consistent order/payment record, entitlement, report generation, AI consultation, and TEST cancellation. This never uses LIVE keys; actual funds must not be charged.
9. Observe logs for user access issues and refund/settlement rail correctness. If something fails, stop. Do not toggle `TOSS_LIVE_CHECKOUT_ENABLED`.
10. Post-test disable the extra-reviewer env (empty it, or switch to a disabled additional gate using an approved change). Preserve the original Sensitive reviewer list. Consider whether test orders/purchases should remain as audited TEST evidence or be cleaned with an approved, scoped procedure; never delete blindly.

## Limitations
- A configured test-credential **prefix** is not proof the two keys belong to the same merchant.
- An account allowlist match does not prove owner login is available.
- Production data created with sandbox approval needs to be isolated in downstream reporting and refund/settlement logic.
- No real Toss authorization or NICE result callback is executed in this PR.
- Treat the main-branch code merge and Production deployment as a distinct release decision after all required secure configuration is in place.
