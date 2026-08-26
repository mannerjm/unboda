# STEP 57D-45D — DB-BACKED REFUND RECOVERY + CONCURRENCY PROOF

## 1. Final Decision

**B. PASS WITH REMAINING BLOCKER**

## 1A. STEP 57D-45D-R Mapping Trace Result

The requested rerun did not reach a valid mapping correction. The disposable row is inserted with internal `refund_workflows.status = REFUND_PROCESSING`, and migration 020 explicitly rejects `CANCELED` for that column. Immediately after concurrent claim RPC execution, the same workflow query returned `status = CANCELED`. No trigger exists on `refund_workflows`, and the claim function updates only lease columns. Therefore the observed defect is at the local DB/RPC result boundary, not a safe mapper rule that can be corrected by weakening provider verification. The harness now explicitly asserts that provider `CANCELED` cannot be accepted as an internal refund workflow status.

Atomic claim/lease infrastructure, bounded scheduler contracts, local DB fixture harness, and provider-isolated recovery contracts were added. Full A-level proof is not claimed because the disposable DB harness exposed a worker-domain state mapping defect during provider-canceled convergence, and the complete injected persistence/revocation failure matrix did not complete.

## 2. Local Environment Proof

- Supabase target: local `http://127.0.0.1:54321` only.
- Migration 021 applied to local Supabase.
- Refund workflow schema and entitlement revocation fields present.
- Real target order was never used as a fixture and was read only.
- No real Toss operation was performed.

Repository preflight captured the existing dirty worktree and preserved unrelated changes. No reset, clean, stash, commit, or push was used.

## 3. Atomic Claim Design

Migration 021 adds `reconciliation_claim_token`, `reconciliation_claimed_at`, and `reconciliation_claim_expires_at` to `refund_workflows`.

`claim_refund_workflows` uses PostgreSQL `FOR UPDATE SKIP LOCKED` inside an atomic update, excludes completed/owner-review/not-due records, and returns the claimed rows. Claim requests are capped at 50.

## 4. Lease Design

The claim stores an expiring five-minute lease. An expired lease can be reclaimed; a live lease is excluded. Completed and owner-review records cannot be claimed.

## 5. DB-Backed Fixture Design

`scripts/refund-reconciliation-db-integration.ts` creates disposable local auth user/profile, paid orders, Toss payment records, purchases, entitlements, and refund workflows using actual local Supabase writes. Provider lookup responses are mocked through `globalThis.fetch`. Cleanup removes only users with the `step-57d-45d-` prefix and their dependent local rows. Four failed-run synthetic users were cleaned up.

## 6. Case 1 Result

**NOT VERIFIED.** The harness created real local rows and reached the concurrent claim boundary, but convergence stopped when the mapped worker workflow returned an unexpected `CANCELED` status instead of the expected internal `REFUND_PROCESSING` state. No real provider operation occurred.

## 7. Case 2 Result

**NOT VERIFIED.** A complete database-backed entitlement-revocation failure injection was not completed.

## 8. Case 3 Result

**NOT VERIFIED.** A separate process interruption fixture was not completed.

## 9. Case 4 Concurrency Result

The harness issued two concurrent local `claim_refund_workflows` RPC calls against one due eligible workflow and asserted one claim. The first attempt initially had two due fixtures and was corrected to isolate one eligible row. The later failure occurred at the worker domain-state mapping boundary, so final convergence proof is incomplete.

## 10. Case 5 Lease Expiry Result

**Contract implemented, runtime proof deferred.** Migration supports expiry/reclaim, but an end-to-end worker-death and lease-expiry execution was not completed.

## 11. Case 6 Retry Eligibility Result

Worker selection excludes future retry, completed, and owner-review states and limits the request to 50. Runtime fixture proof is incomplete because the integration harness stopped at the mapping defect.

## 12. Case 7 Mismatch Result

**Contract implemented, DB-backed proof deferred.** Reconciliation requires provider `CANCELED`, cancellation `DONE`, matching order reference, matching currency, and matching full amount. Otherwise it does not claim completion and escalates.

## 13. Scheduler Auth Result

The refund reconciliation route requires `Authorization: Bearer ${PAYMENT_RECONCILIATION_SECRET}` and returns 401 without a valid secret. GET and POST share one implementation.

## 14. Scheduler Real-Fixture Execution

Route contract is implemented with local bounded worker invocation and summary fields (`scanned`, `eligible`, `claimed`, `converged`, `retryPending`, `escalation`). A full HTTP execution with a disposable refund fixture was not completed.

## 15. Duplicate Scheduler Run

Completed workflows are excluded by worker selection and `reconcileRefundWorkflow` no-ops completed/owner-review states. Runtime duplicate scheduler execution remains deferred with the DB fixture proof.

## 16. Purchase Preservation

The real canceled order still has purchase count `1`. The worker and fixture cleanup paths do not delete purchase evidence during recovery.

## 17. Entitlement Convergence

The real canceled order has effective entitlement count `0`. The convergence path calls the existing idempotent active-entitlement revoke operation only after provider cancellation evidence matches.

## 18. No Duplicate Provider-Side-Effect Proof

The reconciliation worker does not import or call `cancelPaymentWithToss`; it uses payment-state lookup only. The real canceled order was not passed to the worker. Real cancellation calls in this step: `0`.

## 19. Retry/Backoff Result

Retryable lookup failures increment `retry_count`, set `REFUND_FAILED_RETRYING`, and calculate exponential backoff capped at one hour. Exhaustion transitions to `OWNER_REVIEW_REQUIRED`. Runtime injected failure convergence remains incomplete.

## 20. Owner Escalation Result

Provider state mismatch, amount/currency/reference contradiction, and exhausted retry budget map to `OWNER_REVIEW_REQUIRED`. Runtime mismatch fixture proof remains deferred.

## 21. Observability/Run Summary

Added reconciliation event names:

- `refund_reconciliation_started`
- `refund_reconciliation_retry`
- `refund_reconciliation_converged`
- `refund_reconciliation_mismatch`
- `refund_retry_budget_exhausted`
- existing `refund_owner_escalation_required`

Events contain safe order/product/profile references, attempts, retry timing, and correlation IDs. No full paymentKey, secret, Authorization header, raw provider payload, or card data is emitted.

## 22. Real Canceled TEST Order Verification

Read-only verification for `6cfeb75b-11e1-4173-8145-18f5629e1c7e`:

- order status: `paid`
- payment provider status: `DONE`
- refund status: `REFUND_COMPLETED`
- refund workflow count: `1`
- purchase count: `1`
- effective entitlement count: `0`

The real order was untouched by the 45D worker and was not used as a fixture.

## 23. Local Cleanup

Synthetic fixture cleanup removed four `step-57d-45d-*` local users and dependent rows after failed harness attempts. No historical or real canceled order was included. Final refund workflow count remains the existing real completed workflow only; target active entitlement count remains `0`.

## 24. Regressions

Passed:

- TypeScript
- refund reconciliation failure-injection contract regression
- refund reconciliation scheduler contract regression
- cancellation foundation regression
- Toss payment reconciliation regression
- touched-file diagnostics
- `git diff --check`

The DB-backed integration harness was run and failed at the worker domain-state mapping boundary described above. The complete persistence-failure, entitlement-failure, crash, lease-expiry, mismatch, and HTTP scheduler fixture matrix is not verified.

## 25. Files Changed

- `app/lib/toss/server.ts`
- `app/lib/payments/observability.ts`
- `app/lib/purchases/types.ts`
- `app/lib/refunds/server.ts`
- `app/api/internal/payments/refunds/reconcile/route.ts`
- `supabase/migrations/021_refund_reconciliation_claim_lease.sql`
- `scripts/refund-reconciliation-db-integration.ts`
- `scripts/refund-reconciliation-failure-injection-regression.ts`
- `scripts/refund-reconciliation-scheduler-regression.ts`
- `STEP_57D-45D_DB_BACKED_REFUND_RECOVERY_CONCURRENCY_PROOF.md`

## 26. Migration Changes

Migration 021 adds atomic refund reconciliation claim/lease fields, claimable index, security-definer claim function, and service-role-only execute grant. It was applied to local Supabase only.

## 27. Vercel/Scheduler Changes

No Vercel configuration or cron entry changed. The protected refund route is available for a later scheduled integration.

## 28. Toss TEST Contacted?

**NO.** Provider responses were mocked. No Toss lookup or cancellation was called.

## 29. Real Cancellation Calls?

**0**.

## 30. Live Toss Contacted?

**NO**.

## 31. Production/Shared DB Contacted?

**NO**.

## 32. New Real Payment/Order?

**NO**.

## 33. Manual DB Patches?

**NO.** Synthetic fixture cleanup was performed through normal service-role cleanup operations, not financial-state patching.

## 34. Commit/Push?

Commit: **NO**

Push: **NO**

## 35. Remaining Blockers

- Fix the worker-domain state mapping defect exposed by the DB-backed convergence harness.
- Complete actual DB-backed provider-success/internal-persistence-failure proof.
- Complete entitlement revoke failure and process interruption proof.
- Execute lease expiry/reclaim and true concurrent worker runtime proof.
- Execute the protected scheduler with disposable fixtures and duplicate scheduler no-op proof.
- Do not implement privileged CS/admin or CS chat runtime in this step.

## 36. Exact Next Action

Repair the fixture/worker status mapping at the local domain boundary, then rerun the disposable DB integration suite with failure injection, lease expiry, concurrency, mismatch, and scheduler execution. Keep the real canceled TEST order read-only and do not call Toss cancellation.
