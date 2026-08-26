# STEP 57D-42 — TOSS PAYMENT RECONCILIATION / PERSISTENCE

## 1. Re-audit

The STEP 57D-41 route could call Toss and then fail while marking the order paid, creating the purchase, or granting entitlement. The prior `orders.transaction_id` field was insufficient to recover that case or to prove provider amount, currency, status, confirmation time, and reconciliation result.

## 2. Durable persistence

Migration `supabase/migrations/004_toss_payment_reconciliation.sql` adds `toss_payment_records`, one durable record per internal order. It stores:

- internal `order_id`
- `payment_key`
- provider `order_id`
- expected and confirmed amounts
- currency and provider status
- confirmation and reconciliation timestamps
- reconciliation status and last result

Unique constraints prevent two internal records for one order or one payment key.

## 3. Explicit state model

`pending` -> `confirmation_started` -> `externally_confirmed` -> `paid`

Retryable failure states are `reconciliation_required` and `reconciliation_failed`. `terminal_mismatch` is used for an order-reference, amount, currency, or internal-order mismatch. Entitlement is never granted from browser callback material alone.

## 4. Failure windows

### A. Toss confirmation succeeds, internal persistence fails

The confirmation attempt is persisted before the provider call. Provider evidence is persisted immediately after a successful Toss response. If a later order, purchase, or entitlement write fails, the record remains externally identifiable and the reconciliation worker can query Toss by internal order id and retry the idempotent internal steps.

### B. Browser disappears before confirmation completes

The Toss record is created when the pending Toss order is created. The worker can discover unresolved Toss records without a browser callback, query `GET /v1/payments/orders/{orderId}`, and recover a completed payment.

## 5. Automatic reconciliation

`POST /api/internal/payments/reconcile` is protected by `PAYMENT_RECONCILIATION_SECRET` and is intended for a scheduler or private operator-controlled job. It finds unresolved records, queries Toss server-side, verifies exact order reference, `KRW` currency, amount, and `DONE` status, then replays:

1. order paid transition
2. purchase upsert
3. entitlement upsert
4. reconciliation status `paid`

A failed internal step becomes `reconciliation_required` and is retried later. Already-paid orders replay purchase and entitlement idempotently. The route does not expose provider payloads.

## 6. Idempotency and failure injection coverage

The persistence primitives use the existing unique order/purchase/entitlement constraints and state guards. The regression suite verifies mocked provider confirmation and lookup contracts, unresolved-record discovery, retryable partial persistence state, terminal mismatch state, and already-paid replay code paths. The actual DB failure-injection scenarios remain a required integration test against a disposable Supabase database; they cannot be honestly claimed from static tests without a live test database.

## 7. Webhook and scheduling decision

A webhook is not required for the normal card confirmation path because server-side lookup by internal `orderId` can recover a browser-independent success. A scheduled reconciliation job is required: without polling or an equivalent trigger, an orphaned pending record is durable but not automatically recovered. The private reconciliation route is the trigger; deployment scheduling is still required before real-money activation.

## 8. Official Toss contract

The current official reference confirms:

- `POST /v1/payments/confirm` with `paymentKey`, `orderId`, and `amount`
- HTTP Basic authentication using the secret key and an empty password
- `GET /v1/payments/orders/{orderId}` for server-side lookup
- `DONE` as the approved payment status
- `Payment.paymentKey`, `Payment.orderId`, `Payment.currency`, and `Payment.totalAmount` as durable verification evidence
- Toss order ids are merchant-generated, unique, 6-64 characters, using letters, numbers, `-`, and `_`; the existing UUID order id is compatible

Source checked: official Toss Payments reference at `https://docs.tosspayments.com/reference` on 2026-08-26.

## 9. Files changed

Created:

- `supabase/migrations/004_toss_payment_reconciliation.sql`
- `app/api/internal/payments/reconcile/route.ts`
- `scripts/toss-payment-reconciliation-regression.ts`
- `STEP_57D-42_TOSS_PAYMENT_RECONCILIATION_PERSISTENCE.md`

Modified:

- `app/lib/purchases/types.ts`
- `app/lib/purchases/server.ts`
- `app/lib/toss/server.ts`
- `app/api/orders/[orderId]/confirm-payment/route.ts`

No pricing policy or Production V4 code was changed.

## 10. Security review

- Toss secret remains server-only.
- No `NEXT_PUBLIC_TOSS_SECRET_KEY` was added.
- No hardcoded credential is used; regression values are synthetic test keys only.
- Browser amount and payment status remain non-authoritative.
- Amount/reference/currency mismatch fails closed.
- Production mock-confirm isolation remains intact.
- No raw provider payload is logged.

## 11. Verification

Executed verification:

- `npx.cmd tsc --noEmit --pretty false` — exit 0
- `npx.cmd tsx scripts/toss-payment-reconciliation-regression.ts` — exit 0
- `npx.cmd tsx scripts/launch-v1-pricing-mapping-regression.ts` — exit 0, 54 products
- `npx.cmd tsx scripts/forged-client-pricing-regression.ts` — exit 0
- `npx.cmd tsx scripts/purchase-persistence-phase3b-regression.ts` — exit 0; live Supabase block skipped because credentials were absent
- `npx.cmd tsx scripts/profile-scoped-purchase-server-regression.ts` — exit 0
- `npx.cmd tsx scripts/paid-report-persistence-regression.ts` — exit 0
- `npx.cmd tsx scripts/profile-context-access-regression.ts` — exit 0
- `npx.cmd tsx scripts/step-57d-38-final-validation.ts` — exit 0; 54/54 resolved, no 6,900 products, forged amount rejected
- `git diff --check` — exit 0

The older `scripts/product-pricing-regression.ts` exits non-zero because it expects the legacy `relationship` family to be DEEP/16900; the current Launch V1 source and dedicated 54-product regressions define it as CORE/9900. That unrelated policy-test mismatch was not changed. A disposable Supabase failure-injection run was not available, so those cases remain explicitly unproven.

## 12. Side-effect report

- Production payment activation: NO
- Production V4 activation: NO
- Live Toss calls: 0
- Sandbox Toss calls: 0; provider calls were mocked
- DB migration: YES, migration file created; not applied to a remote database
- DB writes: none during verification; runtime reconciliation code writes only when invoked against configured Supabase
- Pricing changes: 0
- OpenAI calls: 0
- Commit: NO
- Push: NO

## 13. Remaining blocker

One narrow blocker remains: run the failure-injection and scheduled-reconciliation integration suite against a disposable Supabase database, proving that each partial persistence failure converges to `paid` without owner intervention.

## 14. Final decision

B. PAYMENT RECONCILIATION PASS WITH REMAINING BLOCKER

## 15. Exact next step

STEP 57D-43 — PROVE DISPOSABLE-SUPABASE FAILURE-INJECTION + SCHEDULED RECONCILIATION CONVERGENCE
