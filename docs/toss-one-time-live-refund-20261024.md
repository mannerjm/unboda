# Owner-approved one-time Toss LIVE pilot refund verification — 2026-10-24

## Scope and authorization
- Owner explicitly authorized canceling **the single LIVE 9,900 KRW pilot card payment** made on 2026-10-24 for the monthly "money-saving-discipline" report.
- This is a real payment and cancellation, not sandbox. This temporary path is intentionally **not** a public refund endpoint.
- Database preflight before code deployment confirmed a single exact order, paid/DONE/externally_confirmed KRW 9,900, one active purchase entitlement, one completed paid report, no refund workflow.
- Do not embed order ID, buyer user UUID, secret key, cardholder data, MID, or payment key in GitHub source/docs.
- Old sandbox TEST refund route is deleted; this implementation must not re-enable it.

## Fail-closed server safety
- Five encrypted Production-only Vercel vars:
  - `TOSS_ONE_TIME_LIVE_REFUND_ENABLED` defaults to `false` until audited build is READY.
  - `TOSS_ONE_TIME_LIVE_REFUND_ORDER_ID` must match the one approved paid order.
  - `TOSS_ONE_TIME_LIVE_REFUND_ACCOUNT_ID` must match the purchasing account.
  - `TOSS_ONE_TIME_LIVE_REFUND_PROFILE_ID` must match the purchased profile.
  - `TOSS_ONE_TIME_LIVE_REFUND_EXPIRES_AT` must be a future bounded deadline.
- NODE_ENV and VERCEL_ENV must be production; TOSS_HYBRID_ROUTING_ENABLED=true, TOSS_LIVE_PILOT_ENABLED=true, TOSS_LIVE_CHECKOUT_ENABLED=false.
- User account cannot be the existing sandbox TEST account. Account must be on the existing sensitive LIVE pilot allowlist, with `live_ck_` and `live_sk_` settlement/checkout keys; environment=production, isProduction=true.
- Exact order product, edition, amount, provider, paid status, logged-in buyer and profile are checked server-side.
- Read-only GET verifies no existing refund, internal key/amount/currency, and remote Toss card method, mId present, DONE, zero cancellations, full remaining 9,900 KRW, exact order/payment key.
- POST requires same origin + JSON, checkbox and explicit browser confirmation, then reruns the *full* remote provider preflight.
- No client-provided order/account ID. Only an exact checked `OWNER_OVERRIDE` via `oneTimeLivePilotRefundOverride` can bypass standard policy. No other user or refund route may use the exception.
- Existing `requestFullRefund` persists unique workflow and claim before actual Toss cancellation, with one unique idempotency key, provider evidence and precise entitlement revocation.
- **Never POST twice**, even after timeout. If outcome is unknown, inspect Toss and DB refund workflow; use existing reconciliation for provider-completed but DB-failed cases.
- General LIVE checkout and administrator card refunds remain OFF. This route does not authorize live sales to other customers.

## Execution gates
1. Validate GitHub Launch Security Audit, one-time LIVE refund static regressions, and Vercel preview build.
2. Merge reviewed PR and ensure production deployment READY with `ENABLED=false`.
3. Update only the one-time flag to `true`, redeploy the reviewed main SHA; verify production READY. No other flags changed.
4. Buyer logs into **the LIVE pilot purchaser account** and opens `/internal/one-time-live-card-refund`.
5. Read-only preflight must display exact 9,900 KRW and ready; explicit buyer checkbox+one confirmation initiates a **real card cancellation**.
6. Confirm provider CANCELED/DONE evidence and `REFUND_COMPLETED`, exact entitlement inactive, other buyer rights unchanged, My Page payment history refunded, purchased library item inaccessible. Keep financial audit records.
7. Immediately disable the one-time flag and redeploy.
8. Remove temporary API, UI, policy override and static regression by reviewed PR; retain the runbook with completion evidence.

## Error handling
- If remote provider or DB disagrees: do not click and do not retry.
- If POST responds ambiguously: provider may already have canceled. No repeat POST, no manual DB mutation.
- Do not activate `REPORT_REFUND_ADMIN_ENABLED` or `TOSS_LIVE_CHECKOUT_ENABLED` as a workaround.

## Completed pilot and retirement evidence — 2026-10-24 KST

- Purchaser explicitly confirmed the 9,900 KRW actual LIVE card cancellation and receipt of funds.
- Authenticated buyer browser displayed "LIVE 카드 9,900원 취소 및 구매 이용권 회수가 완료됐습니다".
- Operating DB read-only check confirmed: this purchase has exactly 1 entitlement, 0 active, and 1 revoked with a recorded revocation timestamp.
- Refund-workflow aggregate showed 2 completed workflows total, including the earlier sandbox test. No additional cancellation was issued during cleanup.
- The one-time LIVE refund production environment flag was switched to false, and a fresh Production deployment of commit 914daf989936851238ad854065b2b77daea87b6b was confirmed READY on unboda.kr and www.unboda.kr.
- The cleanup change removes the one-time API, page, action UI, override helper, obsolete CI step and standalone regression script, leaving normal refund eligibility and financial audit data untouched.
- This historical runbook is retained only as a record; it must not be used to re-enable a temporary refund path.
