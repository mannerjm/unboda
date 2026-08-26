# STEP 57D-44B-R — TOSS CONFIRM FAILURE OBSERVABILITY HARDENING

## 1. Final Decision

**A. CONFIRM FAILURE OBSERVABILITY READY**

The confirmation boundary now preserves provider HTTP status, a normalized provider error code, a sanitized safe message, correlation data, retryability, and durable local diagnostic state. No new Toss payment was attempted in this step.

## 2. Current Error-Loss Root Cause

Previous chain:

`Toss non-2xx response` -> parse only `message` -> `TossConfirmationError(message, status)` -> route replaced it with `{ error: "결제 확인에 실패했습니다." }` -> event emitted only generic `provider_confirmation_failure` / `RETRY_PENDING` -> `toss_payment_records` stored only `confirmation_started`.

The provider HTTP status and message were not durably stored, the provider code was discarded, and the event had no failure correlation or retryability fields.

## 3. Safe Provider Error Model

`TossConfirmationFailure` now contains:

- `provider: "toss"`
- `httpStatus`
- normalized `providerErrorCode` (`[A-Z0-9_]{1,80}`, otherwise `UNKNOWN_PROVIDER_ERROR`)
- sanitized `safeMessage` (control characters, payment-like tokens, and URLs removed; maximum 240 characters)
- `failureStage: "confirmation"`
- `retryability`: `RETRYABLE`, `NON_RETRYABLE`, or `OWNER_ESCALATION_REQUIRED`
- `correlationId`
- `occurredAt`

No secret, Authorization header, raw response body, card data, customer data, or full paymentKey is included.

## 4. Durable Persistence Fields

Migration `019_toss_confirmation_failure_observability.sql` adds:

- `last_confirmation_http_status`
- `last_provider_error_code`
- `last_provider_error_message`
- `last_confirmation_attempt_at`
- `last_confirmation_retryability`
- `last_confirmation_correlation_id`

`recordTossConfirmationFailure` stores these fields on the already-created order payment record. Retryable failures become `reconciliation_required`; non-retryable and owner-escalation failures become `terminal_mismatch`. No raw provider payload is stored.

## 5. Retryability Classification

Explicit current mapping:

- `RETRYABLE`: HTTP `408`, `429`, `5xx`, or transport `NETWORK_ERROR`
- `NON_RETRYABLE`: HTTP `400`, `401`, `403`, `409`
- `OWNER_ESCALATION_REQUIRED`: other statuses, malformed successful provider responses, or unknown contradiction-like conditions

The mapping does not infer undocumented Toss semantics from arbitrary provider messages.

## 6. Route Response Contract

Provider confirmation failures now return a safe response:

```json
{
  "success": false,
  "code": "PROVIDER_CODE_OR_UNKNOWN_PROVIDER_ERROR",
  "message": "sanitized provider message",
  "retryable": false
}
```

The success callback displays only `message` and does not expose raw provider data.

## 7. Observability Event

`payment_confirmation_failed` now includes:

- internal `orderId`
- hashed `profileReference`
- `provider: "toss"`
- `httpStatus`
- normalized `providerErrorCode`
- `failureStage: "confirmation"`
- retryability
- operational class
- correlation/run ID
- automatic event timestamp

Raw profile IDs remain available only to existing events that already use that field; the new failure event uses the hashed profile reference.

## 8. Regression Cases

Added `scripts/toss-confirm-failure-observability-regression.ts` with deterministic mocked `fetch` cases for:

1. HTTP 400 with provider code
2. HTTP 401 auth failure
3. HTTP 409 already-processed/conflict-like failure
4. HTTP 500 transient failure
5. HTTP 502 malformed provider body

Assertions cover preserved status/code, safe message behavior, retryability, correlation ID, confirmation stage, route contract, migration fields, and absence of secret, Authorization, or paymentKey leakage.

Passed targeted checks:

- `npx.cmd tsc --noEmit --pretty false`
- `npx.cmd tsx scripts/toss-confirm-failure-observability-regression.ts`
- `npx.cmd tsx scripts/payment-observability-regression.ts`
- `npx.cmd tsx scripts/toss-payment-reconciliation-regression.ts`
- `git diff --check`

Previously passing local checks remain passing for profile-scoped purchase, paid-report persistence, forged pricing, and Launch V1 pricing mapping. The existing local failure-injection and scheduler integration harnesses were not cleanly runnable from the current shell environment: one rejected its Supabase target guard and one used an invalid local JWT fixture. The unrelated `product-pricing-regression` still expects an outdated relationship price (`DEEP/16900` versus current `CORE/9900`). These are test-environment or pre-existing expectation blockers, not failures of this hardening slice.

## 9. Historical Failed Order Untouched?

**YES.** `e92d541e-d3c6-42c1-a1a2-be94c1b49c25` was not retried, patched, or attached to a new payment key. Only the local schema was migrated.

## 10. New Toss Payment Attempted?

**NO.** This step made zero Toss payment attempts and did not call the provider confirmation endpoint. All provider-failure tests used mocked `fetch`.

## 11. Files Changed

- `app/lib/toss/server.ts`
- `app/lib/purchases/types.ts`
- `app/lib/purchases/server.ts`
- `app/lib/payments/observability.ts`
- `app/api/orders/[orderId]/confirm-payment/route.ts`
- `app/checkout/success/page.tsx`
- `scripts/toss-payment-reconciliation-regression.ts`
- `scripts/toss-confirm-failure-observability-regression.ts`
- `supabase/migrations/019_toss_confirmation_failure_observability.sql`
- `STEP_57D-44B-R_TOSS_CONFIRM_FAILURE_OBSERVABILITY_HARDENING.md`

## 12. Schema Changes

One minimum local migration was added and applied only to local Supabase: `019_toss_confirmation_failure_observability.sql`. No remote migration was applied.

## 13. Side Effects

- Existing historical order state: unchanged
- New orders: `0`
- New payments: `0`
- Purchases or entitlements created: `0`
- Pricing changed: **NO**
- Entitlement rules changed: **NO**
- Mock-confirm used: **NO**
- Raw provider payload persisted: **NO**
- Sensitive payment data logged: **NO**

## 14. Live Toss Contacted?

**NO.**

## 15. Production/Shared Supabase Contacted?

**NO.** Migration and validation were local-only.

## 16. Commit/Push?

Commit: **NO**

Push: **NO**

## 17. Exact Next Action

Perform **ONE FINAL CONTROLLED TOSS TEST PAYMENT RETEST** in a later step, after confirming local runtime environment readiness. Capture the new safe HTTP status, provider error code/message, retryability, correlation ID, and durable record. Do not perform that retest in this step.
