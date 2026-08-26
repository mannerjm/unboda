# STEP 57D-45D-R2 — REFUND CLAIM RPC STATUS ROOT-CAUSE PROOF

## 1. Final Decision

**C. RPC STATUS ROOT CAUSE NOT PROVEN**

The isolated claim RPC reproduction is correct, but the full recovery harness still produces an incompatible `CANCELED` observation at a later fixture/client boundary. No safe mapper weakening was applied. Full DB recovery proof remains blocked.

## 2. DB Row Before RPC

Minimal disposable fixture row:

- fixture ID: safe synthetic UUID recorded only during the run
- status: `REFUND_PROCESSING`
- claim fields: empty

## 3. Raw RPC Result

Calling only `claim_refund_workflows` returned the same fixture row with:

- status: `REFUND_PROCESSING`
- claim token present

No provider lookup, worker, mapper, entitlement service, or scheduler was invoked in this minimal reproduction.

## 4. DB Row After RPC

Direct explicit-column SELECT returned:

- same fixture ID
- status: `REFUND_PROCESSING`
- claim token present
- lease timestamps present

This is normal claim behavior.

## 5. Classified Failure Layer

The minimal reproduction matches none of the corruption cases A-D. It proves the live local claim RPC does not change `REFUND_PROCESSING` to `CANCELED`.

The full harness failure remains unresolved at the combined fixture/client observation boundary. It is not safe to label it a mapper defect without reproducing it in the minimal three-observation test.

## 6. Actual PostgreSQL Function Definition Findings

The live local function is security-definer SQL with one overload:

- `claim_refund_workflows(integer, uuid, integer)`
- `FOR UPDATE SKIP LOCKED`
- atomic update of lease columns
- `RETURNING workflow.*`
- search path: `public`

The local `refund_workflows.status` column is ordinary `text` with default `REFUND_REQUESTED`. No non-internal trigger exists on the table. The status constraint excludes `CANCELED` and allows only the five internal refund statuses.

## 7. Migration vs Live DB Differences

Migration 021 and the live function definition matched in the inspected claim logic. Migration 022 was applied locally to use an atomic CTE update, but the isolated RPC still returned the canonical internal status. No remote migration was applied.

## 8. RPC Return Contract

The claim RPC currently returns `setof public.refund_workflows`. The isolated test confirms status is canonical. A future hardening improvement should replace wildcard `RETURNING workflow.*` with an explicit aliased return contract, but no evidence shows the wildcard corrupts this single-table return.

## 9. TypeScript Mapper Findings

`toRefundRecord` maps only the refund row fields and does not merge provider status into workflow status. The worker checks `workflow.status` for internal states and separately checks `provider.status` for `CANCELED`. Explicit workflow projection was added to `getRefundWorkflowForOrder`.

## 10. Exact Root Cause

**Not proven.** The prior full harness observation cannot be reproduced in the minimal claim-only path. The current evidence points to an unresolved full-harness fixture/query boundary, not a confirmed PostgreSQL claim mutation or provider-status overwrite.

## 11. Exact Fix

No semantic status fix was applied because the corruption was not proven. The safe changes retained are:

- explicit refund workflow projection in repository lookup
- explicit canonical-status assertions in the DB harness
- CTE-based atomic claim update in migration 022

Provider financial verification was not weakened.

## 12. Boundary Assertions

The harness rejects `CANCELED`, `DONE`, and `PARTIAL_CANCELED` as refund workflow statuses. Provider cancellation status remains a separate field and requires matching cancellation detail, amount, currency, and order reference.

## 13. Focused Regressions

Passed:

- minimal claim RPC before/return/after reproduction
- refund reconciliation failure-injection contract regression
- refund scheduler contract regression
- cancellation foundation regression
- payment reconciliation regression
- TypeScript
- `git diff --check`

## 14. Concurrent Claim Result

The minimal concurrent claim experiment in the full harness was not accepted as a valid pass because the larger fixture path failed before convergence. The isolated single-row claim result was canonical and included a lease token. A valid final concurrent proof remains deferred.

## 15. Full DB Recovery Matrix

Not verified. Provider-success/internal-persistence failure, entitlement failure, process interruption, lease reclaim, retry matrix, mismatch matrix, scheduler HTTP execution, duplicate scheduler, and concurrent scheduler convergence remain blocked pending the full-harness boundary diagnosis.

## 16. Scheduler Integration

Scheduler contract remains implemented and statically validated. Disposable HTTP execution was not claimed as verified.

## 17. Real Canceled Order Read-Only State

`6cfeb75b-11e1-4173-8145-18f5629e1c7e` was not claimed, queried by the recovery worker, or modified. Its previously verified state remains:

- refund workflow: `REFUND_COMPLETED`
- purchase: `1`
- effective entitlement: `0`

## 18. Cleanup

R2 disposable users and dependent local rows were removed. Five synthetic users were cleaned after the reruns. The real canceled order was not included.

## 19. Files Changed

- `app/lib/refunds/server.ts`
- `scripts/refund-reconciliation-db-integration.ts`
- `supabase/migrations/022_fix_refund_claim_concurrency.sql`
- `STEP_57D-45D-R2_REFUND_RPC_STATUS_ROOT_CAUSE_PROOF.md`

## 20. Migration Changes

Migration 022 replaces the local claim function with an atomic CTE update. It was applied only to `unboda-local`.

## 21. Toss Contacted?

**NO**.

## 22. Real Cancellation Calls?

**0**.

## 23. Production/Shared DB Contacted?

**NO**.

## 24. Manual Financial DB Patches?

**NO**. Only disposable fixture cleanup used service-role deletion.

## 25. Commit/Push?

Commit: **NO**

Push: **NO**

## 26. Remaining Blockers

- Reproduce the full-harness-only `CANCELED` observation with a three-observation trace tied to the exact fixture ID.
- Replace wildcard RPC return with explicit aliases if the next trace proves a return-shape issue.
- Complete DB-backed failure recovery, lease, concurrency, mismatch, and scheduler execution proofs.

## 27. Exact Next Action

Build a second minimal reproduction that creates the complete fixture but invokes only the claim RPC, logging before/return/after for the exact workflow ID with explicit columns. Do not invoke provider lookup, worker, scheduler, or real Toss. Do not start STEP 57D-45E.
