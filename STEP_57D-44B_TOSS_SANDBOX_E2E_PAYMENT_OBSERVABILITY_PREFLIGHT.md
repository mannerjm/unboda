# STEP 57D-44B — TOSS SANDBOX E2E / PAYMENT OBSERVABILITY PREFLIGHT

## 0. STEP 57D-44B Final Controlled Run Preflight

**READY — waiting for owner manual payment interaction.**


## 0B. STEP 57D-44B-F Final Retest Preflight Result

**B. BLOCKED — preflight did not reach a safe fresh-payment starting point.**

- Supabase env was restored from the local runtime: URL, publishable key, and service-role key now point to local `unboda-local`; `.env.local` remains ignored.
- Toss client and secret remained classified as TEST and were not modified.
- Fresh Next server started on `http://localhost:3000` and was stopped immediately after the unexpected callback replay was detected.
- Synthetic login and profile ownership were not re-proven in this run because the preflight was stopped at the stale callback replay boundary.
- Checkout route returned HTTP `200` during fresh server startup.
- No fresh order was created. No new Toss payment was created.
- Safety incident: the shared browser retained the historical `/checkout/success` URL, which automatically invoked confirmation for historical order `e92d541e-d3c6-42c1-a1a2-be94c1b49c25` once after server restart. The order remained `pending`; only its diagnostic record was updated.
- Captured provider diagnostic: HTTP `400`, code `INVALID_API_KEY`, safe message `잘못된 시크릿키 연동 정보 입니다.`, retryability `NON_RETRYABLE`, correlation ID `6c45e3c6-2f06-46c9-b709-0bfa3da06b50`.
- Historical order core state: unchanged (`pending`, no transaction, no paid timestamp). Historical payment diagnostic state: updated by the automatic replay.
- Purchase count: `0`; effective entitlement count: `0`; paid report access: **FALSE**.
- Live Toss: **NO**. Production/shared Supabase: **NO**. Commit/push: **NO**.
- Exact next action: do not retry the historical order. Resolve the invalid TEST secret/client integration using valid local TEST configuration, close or clear stale success callback state, and rerun preflight before any separately authorized fresh payment attempt.

## 0C. STEP 57D-44B Final Post-Payment Verification

**A. PASS — Toss TEST checkout converged to paid access exactly once.**

- Successful order safe identifier: `6cfeb75b-11e1-4173-8145-18f5629e1c7e`.
- Product: `money-leak-risk`.
- Order amount/currency: `16,900 KRW` / `KRW`.
- Profile scope: `89632a1a-436c-4990-9aff-c8e7bedd05d6`.
- Order status: `paid`; `paid_at` populated; provider transaction identity populated but not printed.
- Toss record: confirmation completed; provider order reference matches the internal order; expected and confirmed amounts are `16,900`; currency is `KRW`; provider status is `DONE`; reconciliation status is `externally_confirmed`.
- Purchase count for the successful order: `1`.
- Effective entitlement count for the target user/profile/product: `1`.
- Purchase and entitlement user/profile/product scope: consistent with the successful order.
- Historical orders `e92d...`, `53fe...`, and `7b3f...`: remain pending and unpaid; none was converted to paid.
- Duplicate protection: no duplicate purchase for the successful order and one effective entitlement for the target profile/product.
- Paid report access: **TRUE**. The local paid-analysis access gate rendered `PURCHASED`, `구매 권한이 확인되었습니다.`, and `심층 분석 열기`.
- Observability: the confirmation success path emitted the existing `payment_attempted`, `payment_confirmed`, and `entitlement_created` events; no raw provider payload, secret, Authorization header, card data, or full payment key was exposed. Success correlation is not durably stored in the current schema.
- Toss TEST contacted: **YES**.
- Live Toss contacted: **NO**.
- Production/shared Supabase contacted: **NO**.
- Additional payment/order/write operation after success verification: **NONE**. All verification queries and the paid access GET were read-only.

## 0A. STEP 57D-44B Final Controlled Attempt Result

**BLOCKED — the single owner-controlled TEST attempt did not produce a retained provider confirmation result.**

- New order: `e92d541e-d3c6-42c1-a1a2-be94c1b49c25`.
- New order amount: `16,900 KRW`; product and profile scope are correct.
- Success callback: not directly readable in the browser snapshot, which remained on the Toss payment iframe. The local `confirmation_started_at` record proves the callback invoked the server confirmation path.
- Confirm endpoint invoked: **YES**, evidenced by `toss_payment_records.confirmation_started_at` at `2026-08-26T05:01:53.983Z`.
- Confirm HTTP status: **NOT RETAINED** by the current browser/server observability path.
- Toss confirmation attempted: **YES**.
- Toss safe error code/message: **NOT RETAINED**. No raw provider error was persisted or exposed.
- Provider result: **NOT RETAINED**; `payment_key`, provider order reference, confirmed amount, currency, and provider status are all null.
- Final order status: `pending`; `paid_at` and `transaction_id` are null.
- Purchase count for the new order: `0`.
- Effective entitlement count for the target profile/product: `0`.
- Paid report access: **FALSE** by the absence of an effective entitlement.
- Duplicate callback/idempotency check: not applicable; no successful callback replay was performed.
- Toss TEST contacted: **YES**, confirmation was attempted through the TEST configuration.
- Live Toss contacted: **NO**.
- Production/shared Supabase contacted: **NO**.
- Total new payment attempts in this run: **exactly 1**.
- Owner next action: **none for this run**. Do not make another payment, retry authentication, attach a payment key, or patch the database. The remaining blocker is missing provider error/status retention at the confirmation boundary.

## 1. Final Decision

**B. PASS WITH REMAINING BLOCKER**

The app successfully reached the success callback, created a local pending order, and attempted the server-side Toss confirmation API. The current failure is not a local order/purchase/entitlement write bug and not a client/secret key-type mismatch. The remaining blocker is the provider-side confirmation response for the just-created TEST transaction. The success page was masking the server error behind a generic message; it has been updated to show the backend error payload without exposing secrets or provider payload data.

## 2. Git / Source State

- Branch: `main`
- HEAD: `46f78503670fedafd1374db05068a234cd917f9a`
- Existing tracked and untracked work preserved
- `git diff --check`: passed
- Launch V1 pricing was not changed
- Production V4 was not changed or activated

## 3. Toss Credential Classification

- `NEXT_PUBLIC_TOSS_CLIENT_KEY`: present and classified **API individual TEST client** (`test_ck_...`)
- `TOSS_SECRET_KEY`: present and classified **API individual TEST server secret** (`test_gsk_...`)
- TEST/LIVE classification: **TEST / TEST**
- Full credentials were not printed

This key pair matches the documented API individual test integration: `test_ck_...` client + `test_gsk_...` secret. The earlier hypothesis of a mismatched client/secret type is rejected by the official docs and the current runtime environment.

## 4. Environment Isolation

The only database used by available local checks is disposable local Supabase:

- project: `unboda-local`
- API: `http://127.0.0.1:54321`
- DB: `127.0.0.1:54322`

No remote project was linked, queried, migrated, or mutated.

## 5. Real Checkout Flow

The checkout uses the Toss v2 standard browser SDK, creates the order through `POST /api/orders`, and passes only the server-returned `order.id` and `order.amount` to `requestPayment`. The development-only `mock-confirm` route is no longer called by the checkout panel and remains production-blocked.

## 6. Toss Sandbox E2E Result

**NOT COMPLETED.** The app reached `/checkout/success`, the local order was created, and the server attempted `POST /v1/payments/confirm` through the current confirmation route. The database shows `confirmation_started` rows but no provider confirmation record, which means the confirmation failed before a provider `DONE` result was recorded.

## 7. Server Confirmation Authority

**PASS by implementation and regressions; not yet successful for the live TEST transaction.** Success callback data is sent to `/api/orders/{orderId}/confirm-payment`; the server verifies ownership, canonical product amount, provider amount, provider order reference, currency, and `DONE` status before writing access state. The current failure occurred after the callback reached the route and before the provider confirmation record was written.

## 8. Amount Integrity

**PASS.** The browser uses `value: order.amount` from the server-created order. Forged amount and reconciliation regressions passed.

## 9. Order Reference Integrity

**PASS by contract.** The provider `orderId` must equal the internal order id. The actual provider response was not exercised because the browser stopped before Toss UI.

## 10. Profile Integrity

**PASS by implementation and regressions.** The server loads the authenticated user's order, verifies ownership and canonical pricing, calls the provider server-side, verifies provider amount/reference/status, and only then persists paid/purchase/entitlement state. Browser success parameters alone are not sufficient.

## 11. Purchase / Entitlement Result

**NOT COMPLETED for this real Toss E2E.** The local DB currently shows the pending order rows and `confirmation_started` state only; there is no provider confirmation, no purchase row, and no entitlement row for the just-created transaction. The local mocked 43P path still verifies exactly one purchase and one effective entitlement with preserved profile scope, but that path is not the actual provider result.

## 12. Paid Report Access

**PASS for the local mocked path.** The existing profile-scoped entitlement lookup recognizes access after convergence.

## 13. Callback Spoof Resistance

**PASS by server contract and regressions.** Missing payment key, forged amount, unknown/foreign order, provider amount mismatch, and provider order mismatch fail before entitlement.

## 14. Duplicate Callback Behavior

**PASS by server idempotency contract.** Already-paid orders are safe, purchase creation is unique by order, and entitlement writes are profile-scoped upserts.

## 15. Mock-confirm Production Isolation

**PASS.** The legacy mock-confirm route returns HTTP 403 in production and has no client-controlled bypass. The real checkout panel no longer calls it.

## 16. Observability Event Model

Added `app/lib/payments/observability.ts` with machine-readable events:

- `checkout_started`
- `order_created`
- `payment_attempted`
- `payment_confirmed`
- `payment_confirmation_failed`
- `amount_mismatch`
- `order_reference_mismatch`
- `reconciliation_scheduled`
- `reconciliation_retry`
- `reconciliation_converged`
- `reconciliation_exhausted`
- `entitlement_created`
- `report_access_granted`

Provider references are SHA-256 redacted. Secrets, authorization headers, card data, and raw provider payloads are not emitted. Key order, confirmation, and reconciliation routes now emit safe events.

## 17. Correlation Strategy

Lifecycle correlation uses internal `orderId`, `profileId`, `productId`, redacted provider reference, reconciliation attempt, next retry time, and reconciliation run id. No unnecessary customer or saju data is stored in payment events.

## 18. Operational Severity Model

Supported classes:

- `NORMAL`
- `RECOVERING`
- `RETRY_PENDING`
- `CONVERGED`
- `OWNER_ESCALATION_REQUIRED`

Amount/reference/security anomalies are owner-escalation candidates. Routine retries and duplicate idempotent callbacks remain automatic.

## 19. Metrics Readiness

The event model and scheduler response support deriving checkout starts, payment attempts/success/failure, confirmation failures, reconciliation retries/success/exhaustion, entitlement success, and report access success. This is readiness only; no sensitive analytics or customer data was added.

## 20. Alert Preflight

No alert integration was built. Conditions are defined for future integration:

- immediate/high: amount mismatch, order-reference mismatch, duplicate-charge suspicion, provider contradiction, security anomaly
- after retry budget: reconciliation exhausted, repeated entitlement failure, paid-without-access threshold
- no owner alert: success, transient retry below budget, duplicate idempotent callback, converged reconciliation

## 21. Failure Visibility Result

The local 43P proof passed all five failure scenarios and preserved durable retry fields, reconciliation status, provider evidence, and exact final-state assertions. Normal injected failures required zero manual database repair. The observability regression passed and confirms event names, operational classes, redaction, and structured reconciliation output.

## 22. Customer Status Readiness

Backend states support safe future messages:

- `confirmation_started` / `externally_confirmed`: 결제를 확인하고 있습니다
- `reconciliation_required`: 일시적인 지연으로 자동 재처리 중입니다
- `paid`: 결제가 완료되었습니다 / 분석 이용이 가능합니다
- `terminal_mismatch` / exhausted failure: 추가 확인이 필요한 상태입니다

Raw provider errors and stack traces are not customer-facing.

## 23. Cancellation / Refund Readiness Gaps

Not implemented in this step. Next work must define and verify:

- Toss cancel endpoint and idempotency key
- full and partial cancellation rules
- durable refund/cancel transaction identity
- entitlement revocation after cancellation
- behavior for already-generated reports
- provider/internal cancel disagreement recovery
- refund failure retry and customer guidance
- audit/accounting fields

## 24. Duplicate Purchase Current Behavior

The current database allows repeat purchases for the same user/profile/product as separate orders and purchases, while the entitlement unique key keeps one effective entitlement and updates its purchase link. Commercial treatment of repeat purchases remains an owner policy decision.

## 25. Owner Decisions Required

**OWNER DECISION REQUIRED:** choose one repeat-purchase policy before monetization:

- allow repurchase and retain one active entitlement
- reject a new purchase while an entitlement is active
- allow repurchase only after an explicit report refresh/renewal rule

No policy was changed automatically.

## 26. Regressions

Passed:

- `npx.cmd tsc --noEmit --pretty false`
- `npx.cmd tsx scripts/payment-observability-regression.ts`
- `npx.cmd tsx scripts/toss-sandbox-payment-foundation-regression.ts`
- `npx.cmd tsx scripts/toss-payment-reconciliation-regression.ts`
- `npx.cmd tsx scripts/toss-payment-failure-injection-integration.ts`
- `npx.cmd tsx scripts/profile-scoped-purchase-server-regression.ts`
- `npx.cmd tsx scripts/paid-report-persistence-regression.ts`
- `npx.cmd tsx scripts/profile-context-access-regression.ts`
- `npx.cmd tsx scripts/forged-client-pricing-regression.ts`
- `npx.cmd tsx scripts/launch-v1-pricing-mapping-regression.ts`
- `npx.cmd tsx scripts/local-scheduler-simulation-regression.ts`
- `npx.cmd tsx scripts/local-reconciliation-worker-readiness-regression.ts`
- `git diff --check`

`npx.cmd next build` also passed after the callback and strict TEST-key changes.

No real Toss E2E was completed because browser authentication stopped before the Toss UI. No V4 calibration was rerun.

## 27. Files Changed

- `app/lib/payments/observability.ts`
- `app/checkout/[productId]/CheckoutAccessPanel.tsx`
- `app/checkout/[productId]/page.tsx`
- `app/checkout/success/page.tsx`
- `app/checkout/fail/page.tsx`
- `app/api/orders/route.ts`
- `app/api/orders/[orderId]/confirm-payment/route.ts`
- `app/api/internal/payments/reconcile/route.ts`
- `scripts/payment-observability-regression.ts`
- `STEP_57D-44B_TOSS_SANDBOX_E2E_PAYMENT_OBSERVABILITY_PREFLIGHT.md`

## 28. Schema Changes

None in this step. Existing local payment/reconciliation schema from migrations `016` through `018` was not changed.

## 29. Side Effects

- Production/shared DB contacted: **NO**
- Production DB writes: **0**
- Local DB writes: synthetic local user/profile fixture created and removed; final payment tables clean
- Live Toss contacted: **NO**
- Toss TEST network contacted: **NO**
- Sandbox Toss calls: **0**
- Production payment activated: **NO**
- Production V4 activated: **NO**
- Pricing changes: **0**
- OpenAI calls: **0**
- Production deployment: **NO**
- Commit: **NO**
- Push: **NO**

## 30. Production / Shared DB Contacted?

**NO.**

## 31. Live Toss Contacted?

**NO.**

## 32. Toss TEST Network Contacted?

**YES.** The app reached the success callback and the server attempted the real Toss TEST confirmation API. The exact provider response was not persisted because the confirmation failed before a `DONE` result was written. This is not a live-charge path and it is not production.

## 33. Production Payment Activated?

**NO.**

## 34. Production V4 Activated?

**NO.**

## 35. Commit / Push?

Commit: **NO**

Push: **NO**

## 36. Remaining Blockers

The current blocker is now narrowed to the provider-side confirmation response for the existing TEST transaction. The app callback reached the server, the server invoked Toss confirmation, and the database shows a pending order with a `confirmation_started` record but no provider confirmation row, no purchase, and no entitlement. The browser-side UI error was generic; the real issue is still in the provider/server confirmation step.

## 37. Exact Next Action

Do not initiate another payment. Use the current local order and the same TEST transaction as evidence. The minimal diagnostic fix is already in place: the success page surfaces the exact backend error instead of a generic `결제 확인에 실패했습니다.` message. The next action is to inspect the returned Toss error payload for the current callback and resolve the provider confirmation mismatch before reusing the same transaction.

## Diagnosis: actual failure point

The failure happened in the server confirmation step after the browser callback reached `/checkout/success` and before the `toss_payment_records` row stored a provider `paymentKey` / `provider_order_id` / `provider_status` / `confirmed_amount` record.

Evidence from the local DB:

- `orders` rows exist with `status = pending`
- `payment_provider = toss`
- `amount = 16900`
- `toss_payment_records` row exists with `reconciliation_status = confirmation_started`
- `payment_key`, `provider_order_id`, `confirmed_amount`, `provider_status`, `currency` are still null
- no purchase row exists
- no entitlement row exists

This means the current failure is between the callback entry and a successful provider response, not in local purchase/entitlement persistence, not in customer authentication, and not in the public client key type. The success page was simply hiding the actual response from the confirmation route.

## Fix applied

- Updated `app/checkout/success/page.tsx` to parse the JSON error from `/api/orders/{orderId}/confirm-payment` and render the actual server error string instead of a hard-coded generic message.
- Left server-side validation, amount checks, order-reference checks, and provider verification intact.
- No payment architecture, no pricing logic, and no data integrity rules were weakened.

## Current status

- Browser success callback reached: **YES**
- Toss TEST confirmation API attempted: **YES**
- Provider confirmation succeeded: **NO**
- Purchase created: **NO**
- Entitlement created: **NO**
- Local order remains pending: **YES**
- Duplicate payment not started: **YES**
- Next action: inspect the actual Toss error payload and fix the confirmation mismatch without starting a new payment.

## Continuation: Toss TEST Checkout Configuration Diagnosis

- Root cause: `NEXT_PUBLIC_TOSS_CLIENT_KEY` is a `test_gck_` payment-widget/global client key, but the selected Toss v2 Standard SDK requires an API individual client key (`test_ck_`).
- Exact failing path: `CheckoutAccessPanel.handlePayment` -> `window.TossPayments(clientKey).payment(...).requestPayment(...)`.
- Order creation succeeded with HTTP 201 before the SDK call.
- Toss SDK script loaded with HTTP 200.
- Toss rejected the SDK request with: `API 개별 연동 키의 클라이언트 키로 SDK를 연동해주세요. 결제위젯 연동 키는 지원하지 않습니다.`
- Fix applied: changed only the browser guard from `test_gck_` to `test_ck_`; payment architecture and credentials were unchanged.
- `TOSS_SECRET_KEY` remains server-only and is classified TEST with a `test_gsk_` prefix.
- Local app was restarted with the corrected environment extraction: YES.
- Toss TEST payment API contacted: NO.
- Toss SDK CDN/log endpoints contacted: YES during browser SDK loading; no payment was initiated or charged.
- Production/shared Supabase contacted: NO.
- Local synthetic pending order state was cleaned successfully.

The owner re-authenticated locally and the same checkout button opened the Toss TEST payment UI. Payment execution was intentionally stopped at that UI. The manual E2E remains incomplete until the owner completes the TEST payment and server-confirmation path.

## Investigation: Official Toss TEST Completion Method

### Official test method

The current official Toss payment-flow guide documents four separate stages: payment request, buyer/payment-method authentication, success URL redirect with `paymentKey`/`orderId`/`amount`, and server-side approval. A successful-looking browser authentication screen is not the final approval; the server must still call the approval API.

The official Toss Developer Center Sandbox is also documented as a way to select a test payment method, enter test payment information, and complete a non-charging test approval. It can issue a test `paymentKey` without using the application SDK, but that route would not prove this application's checkout-to-callback flow.

The official references reviewed did not provide a universal card number that bypasses issuer authentication for this API-individual-key payment-window flow. The Sandbox UI is the authoritative test surface for the available method-specific behavior. No live card data or authentication information was entered or stored.

The official SDK v2 documentation does not define a `sandbox` parameter for `payment.requestPayment()`. The documented `payment()` flow accepts the payment request fields and payment-method options; authentication simulation is provided by the separate Developer Center Sandbox, not by an undocumented request flag.

### Current implementation compatibility

The current application flow is compatible with the documented request/authentication/success-URL/approval sequence:

- `CheckoutAccessPanel.handlePayment` creates the internal order first.
- Toss Standard SDK receives the server-returned order id and amount.
- `successUrl` receives provider callback material.
- `/checkout/success` calls server confirmation.
- The server verifies amount, order reference, and provider status before access.

The application currently requests `method: "CARD"` only. It does not request quick account transfer or another method. Changing payment methods would expand this step and is not necessary to diagnose the current card screen.

### Shinhan screen diagnosis

The message `신한 SOL뱅크 앱을 통해 결제된 내역이 없거나 아직 완료되지 않았습니다` means the selected Shinhan card test flow is waiting for the required Shinhan SOL app-card authentication/approval. Simply pressing the page's completion/check button is not a generic Toss test bypass; it is valid only after the corresponding Shinhan SOL test authentication has actually completed.

### Code changes

**NONE.** The checkout and server-confirmation architecture is already aligned with the official flow. No pricing, server authority, entitlement, credential guard, or reconciliation code was changed for this investigation.

### Sandbox parameter conclusion

- Official `sandbox` parameter location/type: **not documented**
- Supported for current `payment.requestPayment(CARD)`: **not verified / do not add**
- Supported with `test_ck_` / `test_gsk_`: **not verified**
- Production behavior: no simulation flag was added, so no production activation path changed

The current implementation remains compatible with the regular TEST payment-window flow using the API individual TEST client key. The separate official Sandbox can test provider behavior without a real charge, but it cannot be substituted for this application checkout E2E.

## Continuation: No-Personal-Card TEST Path Investigation

### 1. Exact official sandbox parameter example

No official SDK v2 example was found that supplies a `sandbox` parameter to `payment.requestPayment()` or `widgets.requestPayment()`. The current official SDK references enumerate the request fields and payment-method options, but do not define `sandbox`, its type, or an authentication-simulation value.

The official documentation instead describes two separate mechanisms:

- SDK/payment-window test flow: use TEST keys and complete the selected payment method's authentication, then return through `successUrl` and call server approval.
- Developer Center Sandbox: use `https://developers.tosspayments.com/sandbox` as a separate browser test surface to simulate a payment and obtain a test `paymentKey`.

Sources checked:

- `https://docs.tosspayments.com/sdk/v2/js/payment`
- `https://docs.tosspayments.com/sdk/v2/js/payment-widget`
- `https://docs.tosspayments.com/sdk/v2/js/environment`
- `https://docs.tosspayments.com/en/integration.md`
- `https://docs.tosspayments.com/en/api-guide.md`
- `https://docs.tosspayments.com/guides/v2/get-started/payment-flow`
- `https://developers.tosspayments.com/sandbox`
- `https://docs.tosspayments.com/llms.txt`

### 2. Compatibility conclusion

- Exact SDK `sandbox` parameter: **NOT ESTABLISHED**
- Compatible with the current Standard/payment-window `requestPayment`: **NO PROVABLE CONTRACT**
- Compatible with `test_ck_` / `test_gsk_`: **NO PROVABLE CONTRACT**
- Code change: **NONE**

No undocumented field was added. The existing `test_ck_` API-individual client key and matching `test_gsk_` secret remain compatible with the normal payment-window flow, not with an unverified SDK sandbox flag.

### 3. Proof-level distinction

- Browser E2E: application checkout -> Toss SDK -> issuer/payment authentication -> `successUrl`. This remains incomplete without a successful payment-method authentication.
- Server E2E: a valid Toss TEST payment identity -> server confirmation -> paid order -> purchase -> entitlement -> report access. The local mocked server/reconciliation proof is already passing; a Developer Center Sandbox payment key could support a separate provider/server approval test only if its `orderId` exactly matches a newly created local pending order and the provider key is valid for the configured TEST key set.

The Sandbox's generated `orderId` cannot be forced to equal an existing application order after the fact. A safe fallback would be: create a fresh local pending order first, use its exact id as the Sandbox order reference if the Sandbox permits merchant-supplied order ids, then submit only the returned `paymentKey`, exact order id, and `16900` amount to the existing confirmation route. No such fallback was executed here.

### 4. Owner next action

1. Do not add `sandbox: true` to the SDK request.
2. For browser E2E, use the current local checkout and complete the official payment-method authentication manually.
3. For no-personal-card provider testing, use the official Developer Center Sandbox separately and retain the distinction that this is server/provider E2E, not application browser E2E.
4. Do not call `/confirm-payment` with a Sandbox key unless the local pending order id, amount, key set, and provider response are all matched and verified.

### Exact owner steps

1. Keep the local app and current authenticated session open.
2. Open `http://localhost:3000/checkout/money-leak-risk?profileId=89632a1a-436c-4990-9aff-c8e7bedd05d6`.
3. Confirm the page shows `ACCOUNT CONNECTED`, `STEP 57D 44B UI profile`, and `결제 계속하기`.
4. Click `결제 계속하기`.
5. In the Toss TEST UI, choose `신용·체크카드` and then `신한` only if you have the official Shinhan SOL test-auth path available.
6. Complete the required Shinhan SOL TEST authentication in the designated test flow.
7. Return to the Toss screen and press its confirmation button only after the app-auth test payment is complete.
8. If Shinhan SOL test authentication is unavailable, cancel this attempt. Do not repeatedly press `결제완료` as a bypass.
9. Do not use a real card, real bank account, live key, or live payment page.
10. Stop and report the resulting browser URL/status after Toss redirects to `/checkout/success` or `/checkout/fail`.

An alternative official test route is the Toss Developer Center Sandbox. It is useful for obtaining a test payment key and testing provider approval separately, but it does not substitute for this application's actual checkout E2E.

### Expected success result

The browser should return to `/checkout/success` with `paymentKey`, `orderId`, and `amount`. The page should call `/api/orders/{orderId}/confirm-payment`; only after successful server confirmation should the app navigate to profile-scoped paid analysis. The local database should then contain exactly one paid order, one purchase, one effective entitlement, and one payment identity with amount `16900`, currency `KRW`, matching order/profile references, and provider status `DONE`.

### Safety

- TEST only
- Toss TEST UI was opened; payment approval was not completed
- Toss payment API approval: NO
- Live Toss: NO
- Production/shared Supabase: NO
- Real charge: none from this run; the flow remained in TEST mode
- Files changed: report only; no payment code changed
- Commit/push: NO / NO
