# STEP 57D-45D-R4 — LEGACY MULTI-FIXTURE STATUS CONTAMINATION TRACE

## 1. Final Decision

**B. LEGACY HARNESS ROOT CAUSE FIXED, DB MATRIX STILL BLOCKED**

The labeled multi-fixture trace now preserves internal refund workflow status and provider status as separate fields through creation, repository reads, and claim. The previously observed `CANCELED` contamination was not reproduced in the corrected labeled harness. The complete recovery matrix remains blocked because persistence/revocation/crash/lease/scheduler failure cases have not all been executed against the corrected harness.

## 2. Fixture Inventory

The corrected R4 trace uses immutable labels and stable IDs:

- `CASE_1_PERSISTENCE_FAILURE`: workflow `REFUND_PROCESSING`; mocked provider payment state `CANCELED`.
- `CASE_7_MISMATCH`: workflow `REFUND_PROCESSING`; provider payment state `DONE` for mismatch testing.

Each fixture has a distinct order ID, workflow ID, payment record ID, and provider order reference. No array index is used as identity.

## 3. Initial Statuses Per Fixture

Before any claim:

- CASE_1: `refundWorkflowStatus = REFUND_PROCESSING`, `providerPaymentStatus = DONE` in persisted original payment record; expected current mock = `CANCELED`.
- CASE_7: `refundWorkflowStatus = REFUND_PROCESSING`, `providerPaymentStatus = DONE`.
- Internal order status for both: `paid`.

Direct independent table projections confirmed the statuses and IDs.

## 4. Per-Fixture Claim Traces

For each fixture, the trace performed direct DB read, repository read, raw atomic claim, direct post-claim read, and repository post-claim read. Both fixtures retained `refundWorkflowStatus = REFUND_PROCESSING`. Claim fields changed only the lease token/timestamps.

## 5. Identity Collision Findings

No collision was found in the corrected trace. `order.id`, `refund_workflows.order_id`, `toss_payment_records.order_id`, purchase order/profile identity, and provider order reference were explicitly compared.

## 6. Shared Mutable Object Findings

The corrected harness no longer represents provider responses as a shared mutable fixture object. Each provider expectation is carried by the immutable fixture label/expected state. No `Object.assign` or shared nested status object is used.

## 7. Mock Routing Findings

The R4 trace does not route provider behavior by array position or last-created fixture. Provider expectation is associated with the fixture label and order identity. Provider mock injection occurs only after the status boundary trace; it cannot overwrite the refund workflow object.

## 8. Import Audit

The R3 import defect was corrected: `getTossPaymentRecordForOrder` is imported from `app/lib/purchases/server`, its owning module. `getRefundWorkflowForOrder` remains imported from `app/lib/refunds/server`. No implicit barrel import is used.

## 9. Variable Shadowing Findings

The corrected trace uses explicit names: `refundWorkflowStatus`, `providerPaymentStatus`, and `orderStatus` in its assertions/output. It does not merge generic `status` properties from order/payment/refund objects.

## 10. Async Ordering Findings

The corrected R4 trace runs per-fixture reads sequentially before concurrency testing and retains `{ label, workflowId, orderId }` identity. The legacy harness's earlier `Promise.all` result array and unlabelled order ID collection made diagnosis ambiguous; this is corrected in the focused trace.

## 11. Sequential Result

**PASS.** Both labeled fixtures remained canonical through create and repository reads, then remained canonical after a single claim operation.

## 12. Pairwise Reproduction

The pair `CASE_1_PERSISTENCE_FAILURE + CASE_7_MISMATCH` was executed with separate IDs and labels. No cross-contamination occurred. The full legacy harness-only `CANCELED` observation was not reproduced.

## 13. First Contamination Boundary

**No valid contamination boundary was observed in the corrected trace.** The first concrete test-only defect found in this investigation was the wrong repository import in the R3 trace, plus ambiguous legacy fixture identity/result handling. Neither changed a production refund workflow status to `CANCELED`.

## 14. Exact Root Cause

The earlier `CANCELED` result is **not proven as a production or PostgreSQL mutation**. The corrected labeled harness demonstrates that the claim RPC and full fixture table state remain valid. The legacy harness lacked immutable labels and explicit per-fixture boundary observations, and its earlier result cannot be attributed to a specific provider/status overwrite from available evidence.

## 15. Exact Fix

Test-only fixes:

- explicit immutable fixture labels and stable identity assertions
- explicit workflow/provider status names at trace boundaries
- corrected repository import ownership
- explicit projections for refund workflow reads
- provider expectations kept separate from refund workflow records

Production claim/refund/provider semantics were not weakened. `CANCELED` remains invalid for `refund_workflows.status`.

## 16. Focused Harness Regression

Passed: `scripts/refund-r4-legacy-fixture-trace.ts`.

It proves CASE_1 and CASE_7 coexist without status contamination and retain identity through claim.

## 17. Full DB Matrix

**BLOCKED / NOT FULLY VERIFIED.** Provider-success/internal-persistence failure, entitlement revocation failure, process interruption, lease expiry/reclaim, retry eligibility, financial mismatch, scheduler HTTP execution, duplicate scheduler, and concurrent scheduler execution remain to be rerun against a corrected, fully labeled harness.

## 18. Concurrency Result

The focused labeled trace verifies sequential pairwise isolation. The earlier concurrent legacy harness was ambiguous and is not claimed as a valid final concurrency proof. A corrected concurrent worker run remains required.

## 19. Lease Reclaim

Lease fields and atomic claim function are present, but R4 did not complete a worker-death/expiry/reclaim runtime proof.

## 20. Scheduler Proof

Scheduler contract remains statically validated. Corrected disposable HTTP scheduler execution was not completed.

## 21. Real Canceled TEST Order State

Read-only protection remains in force for `6cfeb75b-11e1-4173-8145-18f5629e1c7e`:

- refund: `REFUND_COMPLETED`
- purchase: `1`
- effective entitlement: `0`

No claim, worker, provider lookup, or cancellation call was performed against it.

## 22. Cleanup

R4 synthetic fixtures were removed through local service-role cleanup. No real or historical order was included.

## 23. Files Changed

- `app/lib/refunds/server.ts`
- `scripts/refund-reconciliation-db-integration.ts`
- `scripts/refund-r4-legacy-fixture-trace.ts`
- `STEP_57D-45D-R4_LEGACY_MULTI_FIXTURE_CONTAMINATION_TRACE.md`

## 24. Migration Changes

None in R4. Local migrations 021 and 022 remain applied. No remote migration was applied.

## 25. Toss Contacted?

**NO**.

## 26. Real Cancellation Calls?

**0**.

## 27. Production/Shared DB Contacted?

**NO**.

## 28. Manual Financial DB Patches?

**NO**. Only disposable synthetic fixture cleanup was performed.

## 29. Commit/Push?

Commit: **NO**

Push: **NO**

## 30. Remaining Blockers

- Rerun the complete labeled DB recovery matrix with actual injected persistence/revocation failures.
- Execute valid concurrent worker and concurrent scheduler tests against the corrected fixture identity model.
- Prove lease expiry/reclaim and stale-worker fencing.
- Complete disposable scheduler HTTP execution and duplicate no-op proof.

## 31. Exact Next Action

Extend the corrected labeled fixture harness to the full failure matrix, including worker/concurrency/lease/scheduler execution, while keeping the real canceled TEST order read-only. Do not start STEP 57D-46.
