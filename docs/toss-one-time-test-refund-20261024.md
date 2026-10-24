# One-time 9,900 KRW Toss TEST cancellation — 2026-10-24

**Status:** controlled owner TEST transaction only. Nothing auto-cancels by building or deploying.

## Authorization and safety gates
- Only login session of the precise `TOSS_TEST_ACCOUNT_ID` (and matching `TOSS_REVIEW_EXTRA_TEST_ACCOUNT_ID`).
- `VERCEL_ENV=production`, `NODE_ENV=production`, `TOSS_ONE_TIME_TEST_REFUND_ENABLED=true`, exact `TOSS_ONE_TIME_TEST_REFUND_ORDER_ID`, valid `TOSS_ONE_TIME_TEST_REFUND_EXPIRES_AT` in the future.
- `TOSS_LIVE_CHECKOUT_ENABLED=false`, `TOSS_HYBRID_ROUTING_ENABLED=true`, `TOSS_REVIEW_MODE=enabled`, `TOSS_ENVIRONMENT=sandbox`, `TOSS_ALLOW_LIVE != true`.
- Exact product `money-saving-discipline`, edition `MONTH:2026-10`, amount 9900 KRW, one `paid` Toss order. No user-provided account or order IDs.
- Always confirm `test_ck_` + `test_sk_` and `getTossConfigForAccount(...,"settlement").environment==="sandbox"` before provider operations.
- Same-origin POST, signed-in owner, explicit UI confirmation, no retries; GET read-only.
- Check no prior refund workflow, payment key/amount/method/provider order match, no Toss cancellations before passing existing `requestFullRefund` financial workflow.
- `OWNER_OVERRIDE` is accepted **only** with `sandboxTestOverride=true` + all exact-order guards; otherwise the original policy applies. This is specifically authorized TEST verification, not a generic refund route.
- If Toss cancels but entitlement persistence fails, never retry POST: existing reconciliation workflow / operator review handles it.
- After the test, disable `TOSS_ONE_TIME_TEST_REFUND_ENABLED` and remove test-only route by reviewed follow-up PR. Do not delete purchase/refund evidence manually.

## Preconditions before enabling
1. Confirm the original test order remains `paid`, payment provider `DONE`, amount 9900, one active entitlement and no prior refund.
2. Ensure authorizing user accepts revocation of the exact report purchased for this test. (User approved proceeding with TEST refund.)
3. Run security audit, Vercel build and one-time refund guard regression.
4. Set three Production-scoped config values: `TOSS_ONE_TIME_TEST_REFUND_ORDER_ID` = exact ID from DB; `TOSS_ONE_TIME_TEST_REFUND_EXPIRES_AT` = `2026-10-25T00:00:00+09:00`; `TOSS_ONE_TIME_TEST_REFUND_ENABLED` = `true`. No new secret keys. These config items themselves do nothing without deployed route.
5. Deploy approved code from main only after tests; on the **authorized user's browser**, open `/internal/test-sandbox-refund`, review read-only provider check, click the one-off TEST cancellation button.
6. Confirm DB exact order: refund workflow `REFUND_COMPLETED`, Toss cancellation confirmed, entitlement inactive, report cannot be reopened by owner (historical purchase still audited).
7. Disable the flag immediately and redeploy or delete route after verification. Do **not** turn on broad `REPORT_REFUND_ADMIN_ENABLED` or `TOSS_LIVE_CHECKOUT_ENABLED`.

## Important
- This only tests cancelling a Toss **sandbox** transaction on production-hosted app; there is no LIVE-card cancellation.
- A previously generated paid report is normally excluded from change-of-mind automatic refund. `OWNER_OVERRIDE` is deliberately restricted to the one validated owner test transaction.
- Provider-side cancellation is a financial side effect (TEST rail); do not trigger it via SQL or from a browser URL GET.
