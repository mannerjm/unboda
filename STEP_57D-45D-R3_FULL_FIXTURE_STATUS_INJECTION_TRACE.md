# STEP 57D-45D-R3 — FULL FIXTURE STATUS INJECTION TRACE

## 1. Final Decision

**C. FULL FIXTURE STATUS ROOT CAUSE NOT PROVEN**

The new complete single-fixture trace passed through raw DB creation, repository reads, atomic claim, and post-claim reads. The legacy multi-fixture recovery harness still reports `CANCELED` at its combined boundary, so the full recovery matrix remains blocked. No provider operation or real canceled-order operation was performed.

## 2. Full Fixture Initial DB State

The R3 fixture created local disposable records:

- paid order with internal `status = paid`
- Toss payment record with original provider `provider_status = DONE`
- purchase linked to the fixture order/profile/product
- active entitlement linked to the fixture profile/product
- refund workflow with internal `status = REFUND_PROCESSING`

A safe snapshot immediately after creation confirmed all of these values independently.

## 3. Object Identity Map

The trace verified the same fixture identity across:

- `orders.id`
- `toss_payment_records.order_id`
- `refund_workflows.order_id`
- `purchases.order_id`
- `purchases.profile_id`
- `entitlements.profile_id`
- `entitlements.resource_id`
- `provider_order_id`

No relation was flattened into a shared status object.

## 4. Query-by-Query Trace

The successful trace sequence was:

1. direct orders projection: `status = paid`
2. direct Toss payment projection: `provider_status = DONE`
3. direct refund projection: `status = REFUND_PROCESSING`
4. direct purchase projection: order/profile/product identity matched
5. direct entitlement projection: active and profile/product matched
6. repository payment read: provider status remained `DONE`
7. repository refund read: workflow status remained `REFUND_PROCESSING`
8. repository entitlement read: active
9. raw claim RPC: workflow status remained `REFUND_PROCESSING`
10. post-claim direct read: workflow status remained `REFUND_PROCESSING`
11. post-claim repository read: workflow status remained `REFUND_PROCESSING`

## 5. First Corruption Boundary

**Not found in the corrected R3 trace.** No step in the isolated complete fixture changed or projected the workflow status as `CANCELED`.

The older multi-fixture harness still fails at its post-claim raw workflow assertion, but the new trace demonstrates that this is not caused by the claim RPC in a single complete fixture.

## 6. Raw Result at Boundary

Corrected R3 raw claim result:

- same workflow ID
- `status = REFUND_PROCESSING`
- provider payment status remains a separate field in the payment record
- lease token populated

## 7. Mapped Result at Boundary

Corrected repository result:

- `refundWorkflowStatus = REFUND_PROCESSING`
- `providerPaymentStatus = DONE`
- entitlement active

The mocked current provider cancellation object was not passed into the worker in this trace, by design.

## 8. Object Merge Findings

No object spread or merge of order/payment/refund records exists in the corrected trace. Provider and workflow values are stored/read in separate objects. The R3 trace adds no generic merged `status` object.

## 9. Supabase Client Differences

Both the isolated R3 trace and the legacy integration harness use the server-role Supabase client from `app/lib/supabase/admin.ts` and the local environment. The isolated trace used explicit projections; the legacy harness historically used broader projections and multiple fixture rows. This remains the main unresolved harness difference.

## 10. Type Collision Findings

Manual row types and domain types use distinct fields for provider status and refund workflow status. No `RefundWorkflow & TossPaymentRecord` intersection is used. The provider `CANCELED` value is not a valid `RefundStatus`.

## 11. Provider Mock Injection Findings

The R3 trace did not inject provider `CANCELED` until after all raw DB and repository status checks. The expected coexistence is:

- `refundWorkflow.status = REFUND_PROCESSING`
- mocked provider payment status = `CANCELED`
- mocked cancellation detail status = `DONE`

The provider mock cannot explain the pre-worker status snapshots in the corrected trace.

## 12. Exact Root Cause

**Not proven.** The isolated full fixture is stable. The legacy multi-fixture harness-only observation remains unresolved and does not identify a valid production mapper, query, RPC, or provider injection defect.

## 13. Exact Fix

Narrow, directly related corrections made:

- explicit refund workflow projection in `getRefundWorkflowForOrder`
- repository import ownership corrected in the R3 trace (`getTossPaymentRecordForOrder` comes from purchases server)
- atomic CTE claim migration retained
- explicit canonical status assertions before/after claim

No provider verification was weakened and `CANCELED` was not added to internal refund status.

## 14. Focused Full-Fixture Regression

**PASS:** `scripts/refund-r3-full-fixture-trace.ts`

It proves the full single-fixture status model and claim path preserve canonical internal status.

## 15. Post-Fix Claim Result

**PASS in corrected R3 trace:** raw and mapped claim status remained `REFUND_PROCESSING`.

## 16. Full DB Recovery Matrix

**BLOCKED.** The legacy multi-fixture recovery harness still fails before worker convergence. Persistence failure, entitlement failure, process interruption, lease reclaim, retry matrix, mismatch matrix, scheduler execution, duplicate scheduler, and concurrent scheduler convergence are not verified.

## 17. Concurrency

The local claim RPC has `FOR UPDATE SKIP LOCKED` and the corrected single-fixture trace confirms canonical status after claim. Full concurrent worker convergence is not claimed because the multi-fixture harness remains blocked.

## 18. Lease Reclaim

Lease fields and expiry predicate are implemented, but runtime worker-death/reclaim proof is deferred with the full matrix.

## 19. Scheduler HTTP Proof

Scheduler auth/batch contract regression passes. Disposable HTTP execution is not claimed because the full fixture matrix remains blocked.

## 20. Real Canceled TEST Order State

Read-only state remains unchanged for `6cfeb75b-11e1-4173-8145-18f5629e1c7e`:

- refund: `REFUND_COMPLETED`
- purchase: `1`
- effective entitlement: `0`

No claim, worker, provider lookup, or cancellation call touched it.

## 21. Cleanup

R3 synthetic fixtures were removed through normal local service-role cleanup. No real or historical order was included.

## 22. Files Changed

- `app/lib/refunds/server.ts`
- `scripts/refund-reconciliation-db-integration.ts`
- `scripts/refund-r3-full-fixture-trace.ts`
- `supabase/migrations/022_fix_refund_claim_concurrency.sql`
- `STEP_57D-45D-R2_REFUND_RPC_STATUS_ROOT_CAUSE_PROOF.md`
- `STEP_57D-45D-R3_FULL_FIXTURE_STATUS_INJECTION_TRACE.md`

## 23. Migration Changes

Migration 022 was applied to local Supabase only. No remote migration was applied.

## 24. Toss Contacted?

**NO**.

## 25. Real Cancellation Calls?

**0**.

## 26. Production/Shared DB Contacted?

**NO**.

## 27. Manual Financial DB Patches?

**NO**. Only disposable fixture cleanup used normal service-role deletion.

## 28. Commit/Push?

Commit: **NO**

Push: **NO**

## 29. Remaining Blockers

- Explain why the legacy multi-fixture harness-only assertion reports `CANCELED` while the isolated full fixture remains canonical.
- Complete full DB-backed recovery, failure injection, lease, scheduler, and concurrent scheduler proofs.
- Do not begin privileged CS/Admin work.

## 30. Exact Next Action

Instrument the legacy harness with explicit before/claim-return/after queries for every fixture ID and remove all wildcard projections from that harness. Do not invoke the worker or provider during that diagnostic pass. Do not start STEP 57D-45E.
