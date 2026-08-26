# STEP 57D-45A — TOSS CANCELLATION / REFUND AUTOMATION FOUNDATION

## 1. Final Decision

**REAL TEST CANCELLATION READY**

The owner-approved V1 full-refund foundation is implemented and mocked/local validation is complete. The real Toss TEST cancellation call has **not** been executed. Execution is paused for explicit owner approval immediately before the provider cancellation call.

## 2. Owner-Approved Policy

- Full cancellation before paid content generation: full refund allowed; provider cancellation must be confirmed before entitlement revocation; historical evidence is preserved.
- After generation starts: change-of-mind is not auto-eligible; content-not-provided, material defect, and materially-different cases may be eligible.
- Partial refunds: V1 unsupported; no `cancelAmount` is sent or accepted.
- Duplicate cancellation: idempotent existing workflow result; no second provider side effect.
- Provider/internal divergence: provider is financial source of truth; do not mark completed without provider confirmation.
- Temporary provider/network failure: retryable bounded state; entitlement remains active.
- Chargeback/dispute: owner review; no automatic cancellation.

## 3. Generation-Start Boundary

The authoritative boundary is creation of a `paid_reports` row. A page view alone is not considered generation. The target successful order has no `paid_reports` row, so generation-started is **FALSE**.

## 4. Refund Eligibility Logic

`assessFullRefundEligibility` reads `getPaidReport` server-side. Before generation, `CHANGE_OF_MIND` is eligible. After generation, change-of-mind is denied for automatic processing; approved defect/non-delivery categories remain eligible. `OWNER_OVERRIDE` is not exposed through the customer route and requires a future privileged actor path.

## 5. Data Model

New `refund_workflows` preserves:

- order/payment/profile/product identity
- requested full amount and currency
- reason category/text
- internal refund status
- provider cancellation status/reference
- lifecycle timestamps
- bounded retry metadata
- safe provider HTTP/error/retryability fields
- correlation ID

Original order, purchase, and Toss confirmation evidence remain separate and are not overwritten.

## 6. Migration

Added and applied locally only:

- `supabase/migrations/020_toss_refund_workflows.sql`
- entitlement audit fields: `revoked_at`, `revocation_reason`
- active-order workflow uniqueness
- provider cancellation reference uniqueness
- status/reason/retryability/retry-budget constraints
- service-role write access and owner-scoped read policy

No remote migration was applied.

## 7. Authorization

The customer route requires the authenticated session and loads the order through `getOrderForUser`, which enforces user ownership. It accepts only an approved reason category and optional safe reason text. It does not accept amount, provider status, payment identity, or entitlement action. The server derives the full amount from the stored confirmed Toss amount. Partial refund input is rejected.

A privileged CS/admin route and audit actor mechanism are not yet implemented; owner override therefore remains a later controlled extension.

## 8. Toss Cancellation Client

`cancelPaymentWithToss` uses the server-only secret and:

```text
POST /v1/payments/{paymentKey}/cancel
```

It sends only `{ cancelReason }` for V1 full cancellation, verifies `CANCELED` and the final `cancels[]` entry with `cancelStatus: DONE`, and preserves safe status/code/message/retryability/correlation data. Full paymentKey, secret, Authorization, card data, and raw payload are not logged.

## 9. Full Cancellation Service

`requestFullRefund` loads and validates a paid Toss order, verifies provider `DONE`, amount, currency, and provider order reference, creates one idempotent workflow, calls cancellation, verifies the full provider result, persists provider evidence, then revokes the active entitlement and completes the workflow. Entitlement revocation occurs only after provider cancellation confirmation.

## 10. Partial Refund = V1 Unsupported

No partial-refund accounting, UI, or provider `cancelAmount` request exists. A client-supplied `cancelAmount` is rejected by the route.

## 11. Entitlement Revocation

Revocation updates the existing entitlement to inactive and records timestamp/reason. Purchase and payment history are preserved. Repeated revocation is harmless because only active rows are updated. The existing access lookup filters `is_active = true`, so confirmed full cancellation makes paid access false.

## 12. Paid Report Behavior

The target has not started generation, based on no `paid_reports` row. For a future generated report, policy must still be applied at request time: change-of-mind is owner review; defect/non-delivery can be eligible. No report deletion behavior was added.

## 13. Idempotency

A unique active workflow per order prevents concurrent duplicate active requests. Existing workflow lookup returns the current state. Provider cancellation reference is unique. The service does not issue a second provider call when an existing workflow is returned.

## 14. Failure Injection Results

Mocked/provider-isolated foundation regression passed:

- provider full cancellation success and `CANCELED`/`DONE` response validation
- provider 5xx classification as retryable
- full-only cancellation shape
- policy reason category and generation-boundary contract
- customer-safe CS messages
- route ownership and partial-refund rejection contract
- workflow uniqueness and entitlement revocation audit schema

The complete post-provider persistence/reconciliation matrix is not yet implemented as a worker. Internal persistence failure after provider success therefore remains an implementation gap, documented below.

## 15. Reconciliation

Existing confirmation reconciliation is unchanged. Refund-specific reconciliation worker is not yet implemented. Durable provider cancellation evidence is stored before entitlement completion, but a scheduled repair path for a crashed process or failed internal write must be added before production use.

## 16. Retry/Backoff

The workflow stores bounded retry fields and maps provider/network failures to `REFUND_FAILED_RETRYING`. The current request path does not yet implement the scheduled retry worker/backoff transition; this is a remaining blocker for production readiness.

## 17. Chargeback Policy

Chargeback/card dispute is always `OWNER_REVIEW_REQUIRED` in V1. No automatic Toss cancellation is triggered from dispute signals.

## 18. CS Status Model

Implemented reusable safe mapping:

- `REFUND_REQUESTED`: 환불 요청을 접수했습니다.
- `REFUND_PROCESSING`: 결제 취소를 처리하고 있습니다.
- `REFUND_COMPLETED`: 환불 처리가 완료되었습니다. 결제수단 반영 시점은 결제사에 따라 다를 수 있습니다.
- `REFUND_FAILED_RETRYING`: 일시적인 문제로 환불 처리를 다시 시도하고 있습니다.
- `OWNER_REVIEW_REQUIRED`: 자동 처리가 어려워 담당자가 확인 중입니다.

No CS chat/ticket runtime exists yet.

## 19. Customer Messages

Customer responses use the safe Korean status mapping above and never expose raw Toss codes or provider payloads.

## 20. Observability

Cancellation event names and safe fields were added to the payment event model:

- `payment_cancellation_requested`
- `payment_cancellation_started`
- `payment_cancellation_confirmed`
- `payment_cancellation_failed`
- `refund_retry_scheduled`
- `refund_converged`
- `entitlement_revocation_started`
- `entitlement_revoked`
- `refund_owner_escalation_required`

Events support safe order/product/profile references, provider status/error classification, retryability, and correlation IDs. No paymentKey, secret, Authorization, card/bank data, or raw response is emitted.

## 21. Successful TEST Order Readiness

Target: `6cfeb75b-11e1-4173-8145-18f5629e1c7e`

Read-only local verification:

- order status: `paid`
- amount: `16,900 KRW`
- provider status: `DONE`
- confirmed amount: `16,900`
- provider order reference matches internal order
- purchase count: `1`
- effective entitlement count: `1`
- paid access: TRUE at baseline
- existing refund workflow count: `0`
- generation-started marker: absent (`paid_reports` row count `0`)

## 22. Real TEST Cancellation Executed?

**YES — exactly one approved full TEST cancellation was executed.**

## 22A. STEP 57D-45B Controlled TEST Full Cancellation Result

**A. CONTROLLED TOSS TEST FULL CANCELLATION PASS**

- Target order: `6cfeb75b-11e1-4173-8145-18f5629e1c7e`.
- Pre-cancellation safety check: PASS. Paid order, provider `DONE`, `16,900 KRW`, matching provider order reference, purchase `1`, entitlement `1`, paid access TRUE, paid report count `0`, generation-started FALSE, and refund workflow count `0`.
- Policy eligibility: `CHANGE_OF_MIND` before generation; eligible.
- `OWNER_OVERRIDE`: not required.
- Provider cancellation calls: exactly `1`.
- Provider result: `CANCELED`; cancellation entry `DONE`; canceled amount `16,900 KRW`; currency `KRW`; provider order reference remained correct.
- Refund workflow: exactly `1`, `REFUND_COMPLETED`.
- Required timestamps: requested, processing started, provider confirmed, completed, and entitlement revoked all populated.
- Purchase count: `1`; purchase history preserved.
- Effective entitlement count: `0`; original entitlement preserved as inactive with `revoked_at` and reason `CHANGE_OF_MIND`.
- Paid report access: **FALSE**. The local access gate rendered `PURCHASE REQUIRED`.
- Duplicate/idempotency check: performed once through the internal refund service; returned existing `REFUND_COMPLETED` without a second provider call. Workflow count remained `1`, purchase count remained `1`, and effective entitlement remained `0`.
- Historical orders: all prior pending orders remained pending/unpaid and had no refund workflows.
- Safe observability: emitted `payment_cancellation_requested`, `payment_cancellation_started`, `payment_cancellation_confirmed`, `entitlement_revocation_started`, and `entitlement_revoked` with hashed profile reference and correlation ID `6e84f269-3d16-4704-beeb-a117c919ea1c`; no full paymentKey, secret, Authorization header, raw payload, or card data exposed.
- New payment/order count: `0`.
- Manual DB patches: `0`.
- Toss TEST contacted: **YES**, exactly one cancellation request.
- Live Toss contacted: **NO**.
- Production/shared Supabase contacted: **NO**.
- Remaining foundation blockers unchanged: refund reconciliation worker, scheduled bounded retry, provider-success/internal-failure convergence integration proof, privileged CS/admin audit path, and CS runtime integration.

## 23. OWNER_OVERRIDE Required?

**NO** for this controlled target if the owner approves `CHANGE_OF_MIND`: generation has not started and policy makes that category eligible. `OWNER_OVERRIDE` is not required and must not be fabricated.

## 24. Files Changed

- `app/lib/toss/server.ts`
- `app/lib/purchases/types.ts`
- `app/lib/purchases/server.ts`
- `app/lib/payments/observability.ts`
- `app/lib/refunds/policy.ts`
- `app/lib/refunds/server.ts`
- `app/lib/refunds/status.ts`
- `app/api/orders/[orderId]/refund/route.ts`
- `supabase/migrations/020_toss_refund_workflows.sql`
- `scripts/toss-cancellation-foundation-regression.ts`
- `STEP_57D-45A_TOSS_CANCELLATION_REFUND_AUTOMATION_FOUNDATION.md`

## 25. Schema Changes

Migration 020 was applied to `unboda-local` only. No remote schema was changed.

## 26. Side Effects

- Real Toss cancellation calls: `0`
- New payments/orders: `0`
- Successful target order modified: **NO**
- Purchase writes: `0`
- Entitlement writes: `0`
- Refund workflow writes during readiness check: `0`
- Manual DB patches: `0`

## 27. Toss TEST Contacted?

**NO** in this step. Cancellation client tests used mocked fetch only.

## 28. Live Toss Contacted?

**NO**.

## 29. Production/Shared DB Contacted?

**NO**. Only local Supabase was migrated/read.

## 30. Production Payment Activated?

**NO**.

## 31. Production V4 Activated?

**NO**.

## 32. Commit/Push?

Commit: **NO**

Push: **NO**

## 33. Remaining Blockers

- Refund reconciliation worker and scheduled bounded retry path are not implemented.
- Post-provider internal persistence failure convergence is not fully proven by integration tests.
- Privileged CS/admin route and audit actor mechanism are not implemented.
- CS chat/ticket runtime integration is absent.
- Real cancellation requires explicit owner approval immediately before the irreversible TEST provider call.

## 34. Exact Next Action

**REAL TEST CANCELLATION READY.** Wait for explicit owner approval before making exactly one full Toss TEST cancellation for order `6cfeb75b-11e1-4173-8145-18f5629e1c7e`, using the policy-eligible reason `CHANGE_OF_MIND`. Do not start cancellation, refund, or any additional payment automatically.
