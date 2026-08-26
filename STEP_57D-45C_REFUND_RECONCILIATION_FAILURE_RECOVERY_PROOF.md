# STEP 57D-45C — REFUND RECONCILIATION + FAILURE RECOVERY PROOF

## 1. Final Decision

**B. PASS WITH REMAINING BLOCKER**

A bounded refund reconciliation worker and protected internal route were implemented. Static/provider-isolated failure contracts pass, and the real canceled TEST order remains stable. Full provider-success/internal-failure integration convergence is not verified because no disposable refund workflow integration fixture was executed.

## 2. Reconciliation Architecture

`reconcileRefundWorkflow` processes only incomplete due workflows and uses Toss payment lookup evidence. It never calls the Toss cancellation client. A matching provider `CANCELED` payment with a `DONE` full cancellation entry repairs provider evidence, revokes the active entitlement, and completes the workflow. Completed or owner-review workflows are no-ops.

## 3. Durable Provider Evidence

`refund_workflows` stores provider status, cancellation reference, confirmed timestamp, amount/currency, safe error fields, retryability, correlation ID, and lifecycle timestamps. Original order and `toss_payment_records` confirmation evidence remain intact. Toss lookup now exposes only typed cancellation evidence needed for matching.

## 4. Worker Eligibility

Eligible statuses are `REFUND_REQUESTED`, `REFUND_PROCESSING`, and `REFUND_FAILED_RETRYING`, with `next_retry_at` due. `REFUND_COMPLETED` and `OWNER_REVIEW_REQUIRED` are excluded. The query is bounded to 50 records.

## 5. Batch Bound

Maximum reconciliation batch: **50** workflows per run.

## 6. Retry/Backoff

Lookup/network failures increment `retry_count` and use exponential backoff capped at one hour. Retryable failures become `REFUND_FAILED_RETRYING`; exhausted budgets become `OWNER_REVIEW_REQUIRED`.

## 7. Retry Budget

Migration 020 stores `retry_count`, `max_retry_count`, `next_retry_at`, and `last_attempt_at`, with a database constraint limiting the maximum retry budget to 10.

## 8. Provider-State Verification

Convergence requires provider status `CANCELED`, matching order reference, matching currency, cancellation entry status `DONE`, and cancellation amount equal to the requested full amount. Provider `DONE`, missing cancellation evidence, or mismatches do not complete the refund and are escalated. No automatic second cancellation is issued.

## 9. Entitlement Repair

After matching provider cancellation evidence, reconciliation calls the existing idempotent entitlement revoke operation. The purchase row remains preserved. Without provider cancellation confirmation, entitlement remains active and refund completion is not claimed.

## 10. Failure-Injection Results

Provider-isolated regression passed checks for:

- provider lookup is used for recovery
- only `CANCELED` + cancellation `DONE` can converge
- no `cancelPaymentWithToss` call exists in the reconciliation path
- completed workflows no-op
- retryable and owner-review states exist
- partial refund remains unsupported
- CS status mappings exist
- workflow uniqueness and provider-reference uniqueness exist

The complete database-backed cases for persistence failure, entitlement failure, process interruption, and concurrent workers remain unexecuted. These are the primary remaining proof gap.

## 11. Duplicate Financial-Side-Effect Proof

Source-level and mocked contract proof confirms reconciliation does not import or call the cancellation client. The already completed real workflow was not sent through the worker. No additional provider cancellation occurred in this step.

## 12. Concurrency Proof

The active-order unique index prevents duplicate active workflows. The current implementation has no database lease/RPC atomic claim, so concurrent worker execution is not fully proven or production-safe yet. This remains a blocker.

## 13. Scheduler Contract

Added `GET` and `POST` `/api/internal/payments/refunds/reconcile` sharing one implementation. It requires `Authorization: Bearer ${PAYMENT_RECONCILIATION_SECRET}`, returns 401 otherwise, uses `force-dynamic`, sets `Cache-Control: no-store`, and processes a maximum of 50 due workflows. No Vercel cron configuration was changed.

## 14. Authentication

The refund scheduler is server-authenticated by the existing payment reconciliation secret. Customer refund authorization remains session-owned through `getOrderForUser`.

## 15. Cache/Execution Safety

The route is dynamic and no-store. Completed and owner-review workflows are excluded. The real canceled order was not passed to the worker. No frontend link was added.

## 16. CS Recovery Mapping

Safe states map to:

- `REFUND_FAILED_RETRYING`: 일시적인 문제로 환불 처리를 다시 시도하고 있습니다.
- `OWNER_REVIEW_REQUIRED`: 자동 처리가 어려워 담당자가 확인 중입니다.
- `REFUND_COMPLETED`: 환불 처리가 완료되었습니다. 결제수단 반영 시점은 결제사에 따라 다를 수 있습니다.

Provider codes and raw diagnostics remain internal.

## 17. Observability

Added event names:

- `refund_reconciliation_started`
- `refund_reconciliation_retry`
- `refund_reconciliation_converged`
- `refund_reconciliation_mismatch`
- `refund_retry_budget_exhausted`
- existing `refund_owner_escalation_required`

Events use safe order/workflow/profile references, retry count, correlation ID, and classifications. No paymentKey, secret, Authorization, raw response, or card/bank information is emitted.

## 18. Real Canceled TEST Order Read-Only Verification

Target `6cfeb75b-11e1-4173-8145-18f5629e1c7e` remains:

- provider confirmation status: `DONE`
- refund provider status: `CANCELED`
- refund status: `REFUND_COMPLETED`
- amount: `16,900 KRW`
- purchase count: `1`
- effective entitlement count: `0`
- entitlement revoked timestamp populated
- refund workflow count: `1`

The worker was not run against this completed workflow.

## 19. Purchase Preservation

Purchase count remains `1`; no purchase was deleted or changed.

## 20. Paid Access Result

Effective entitlement count remains `0`; the canceled profile remains without paid access. No paid report or payment evidence was deleted.

## 21. Regressions

Passed:

- TypeScript
- refund reconciliation failure-injection regression
- refund reconciliation scheduler regression
- cancellation foundation regression
- Toss payment reconciliation regression
- `git diff --check`
- touched-file diagnostics

Not fully verified:

- database-backed provider-success/internal-failure convergence
- entitlement-revocation failure recovery integration
- process interruption recovery integration
- atomic concurrency claim proof
- local scheduler execution against disposable refund fixtures

## 22. Local Cleanup

No disposable refund fixture was created. The real canceled order was read only. No refund workflow, order, purchase, or entitlement was created or manually patched in this step.

## 23. Files Changed

- `app/lib/toss/server.ts`
- `app/lib/payments/observability.ts`
- `app/lib/refunds/server.ts`
- `app/api/internal/payments/refunds/reconcile/route.ts`
- `scripts/refund-reconciliation-failure-injection-regression.ts`
- `scripts/refund-reconciliation-scheduler-regression.ts`
- `STEP_57D-45C_REFUND_RECONCILIATION_FAILURE_RECOVERY_PROOF.md`

## 24. Migration Changes

None in this step. Migration 020 from the previous step remains the local refund schema. No remote migration was applied.

## 25. Vercel Configuration Changes

None. No additional cron entry was added.

## 26. Toss TEST Contacted?

**NO.** No provider lookup or cancellation was called in this step.

## 27. Real Cancellation Calls?

**0**.

## 28. Live Toss Contacted?

**NO**.

## 29. Production/Shared DB Contacted?

**NO**. Only local Supabase was inspected.

## 30. New Payment/Order?

**NO**.

## 31. Manual DB Patches?

**NO**.

## 32. Commit/Push?

Commit: **NO**

Push: **NO**

## 33. Remaining Blockers

- Add an atomic claim/lease mechanism for concurrent refund workers.
- Add database-backed disposable failure fixtures proving provider-success/internal-failure convergence.
- Prove entitlement-revocation failure recovery and process interruption recovery.
- Run the protected scheduler against disposable local refund workflows.
- Complete CS runtime integration and privileged CS/admin audit path.

## 34. Exact Next Action

Implement the atomic refund workflow claim and a disposable local integration harness that injects provider-success/internal-write and entitlement-revoke failures. Run the full recovery matrix locally without touching the real canceled TEST order. Do not call Toss cancellation in this step.
