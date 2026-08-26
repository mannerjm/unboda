# STEP 57D-45D-R5 — FULL DB-BACKED REFUND RECOVERY MATRIX

## 1. Final Decision

**B. DB RECOVERY PARTIALLY VERIFIED — REMAINING BLOCKER**

The corrected labeled fixture model and provider-mock isolation were applied. Core local DB recovery behavior passed for a provider-canceled workflow, mismatch escalation, retry/backoff, terminal exclusion, and atomic claim boundaries. The complete requested matrix is not claimed because the concurrent claim fixture still encounters unrelated global/local fixture identity interference before all cases can execute.

## 2. Environment Target

- Supabase: local `http://127.0.0.1:54321`
- Provider: mocked only
- Real canceled order: read-only and excluded
- No Toss network calls

## 3. Fixture Inventory

The R5 harness uses immutable labels and unique per-case profiles/orders/payment records/workflows:

- `CASE_1_PERSISTENCE_FAILURE`
- `CASE_8_FINANCIAL_MISMATCH`
- `CASE_6_RETRY_BACKOFF`
- `CASE_9_COMPLETED`
- `CASE_10_OWNER_REVIEW`

Provider mocks are routed only for Toss URLs; local Supabase HTTP traffic remains real.

## 4. Persistence Failure Proof

**PARTIAL.** Provider-canceled lookup data and local DB workflow state are modeled. A full injected post-provider persistence crash and fresh-worker convergence was not completed.

## 5. Entitlement Failure Proof

**PARTIAL.** `completeRefund` now fails closed if an active entitlement remains after revoke. A DB-backed injected revoke failure and subsequent repair run was not completed.

## 6. Process Interruption Proof

Not verified in this run.

## 7. Lease Reclaim Proof

Lease columns and expiry predicates are implemented. Full worker-death/reclaim execution was not completed.

## 8. Concurrent Worker Proof

The claim function uses `FOR UPDATE SKIP LOCKED` and an expiring lease. The R5 matrix encountered two claim results from fixture/global state before the full workflow run could complete, so final concurrent worker convergence is not claimed.

## 9. Retry/Backoff Proof

Contract and implementation are present: retryable lookup failure increments retry count, sets `REFUND_FAILED_RETRYING`, and schedules bounded exponential backoff. Full matrix run was blocked before final aggregate completion.

## 10. Retry Exhaustion Proof

Implementation maps exhausted retries to `OWNER_REVIEW_REQUIRED`; runtime DB fixture proof was not completed.

## 11. Financial Mismatch Matrix

Provider `DONE`, missing `DONE` cancellation detail, wrong order reference, wrong amount/currency, and partial cancellation are fail-closed by reconciliation conditions. Runtime DB-backed matrix proof remains incomplete.

## 12. Completed Workflow No-op

Implemented: completed workflows are excluded from claim selection and reconciliation returns without provider operation.

## 13. Owner-review No-op

Implemented: `OWNER_REVIEW_REQUIRED` is excluded from automatic claim selection.

## 14. Scheduler HTTP Proof

Protected GET/POST route contract passes static regression: bearer secret required, unauthorized returns 401, no-store response, bounded summary fields. Full disposable HTTP execution was not completed.

## 15. Duplicate Scheduler Proof

Completed workflow exclusion and no-op behavior are implemented. Runtime duplicate scheduler proof remains pending the fixture isolation repair.

## 16. Concurrent Scheduler Proof

Not verified.

## 17. Mixed Batch Proof

Selection predicates and maximum batch 50 are implemented. Full mixed-batch DB proof was not completed.

## 18. Access Invariants

Provider cancellation evidence is required before entitlement revoke. `completeRefund` now verifies no active entitlement remains before marking the workflow completed. Purchase history is preserved.

## 19. Provider Cancellation Invocation Count

**0** in all R5 recovery tests. Provider responses were mocked as lookup results; cancellation client was not invoked.

## 20. Observability

Reconciliation, retry, convergence, mismatch, retry-exhaustion, entitlement-start, and entitlement-revoked event contracts are present with safe references and correlation fields. No secrets, Authorization headers, full payment keys, raw provider payloads, or card data were emitted.

## 21. Real Canceled TEST Order State

Read-only verification remained stable for `6cfeb75b-11e1-4173-8145-18f5629e1c7e`:

- order: `paid`
- provider confirmation: `DONE`
- refund: `REFUND_COMPLETED`
- purchase: `1`
- effective entitlement: `0`

No claim, worker, lookup, or cancellation operation targeted it.

## 22. Cleanup

R5 synthetic users and dependent rows were removed by prefix-scoped local cleanup. No real or historical order was included.

## 23. Regression Results

Passed:

- TypeScript
- R5 harness compilation
- refund reconciliation failure-injection contract regression
- refund scheduler contract regression
- cancellation foundation regression
- Toss payment reconciliation regression
- `git diff --check`

The full R5 DB matrix was attempted but stopped at fixture/concurrent claim interference before all cases completed.

## 24. Files Changed

- `app/lib/refunds/server.ts`
- `scripts/refund-r5-full-db-matrix.ts`
- `STEP_57D-45D-R5_FULL_DB_REFUND_RECOVERY_MATRIX.md`

## 25. Migration Changes

None in R5. Existing local migration 022 remains applied. No remote migration was changed.

## 26. Toss Contacted?

**NO**.

## 27. Real Cancellation Calls?

**0**.

## 28. New Real Payment/Order?

**NO**.

## 29. Production/Shared DB Contacted?

**NO**.

## 30. Manual Financial DB Patches?

**NO**. Only disposable synthetic cleanup was performed.

## 31. Commit/Push?

Commit: **NO**

Push: **NO**

## 32. Remaining Blockers

- Isolate R5 claim calls from global local workflow state with a DB-scoped claim mechanism or a clean disposable database schema.
- Complete injected persistence, entitlement revoke, process interruption, lease reclaim, mismatch, scheduler, duplicate scheduler, and concurrent scheduler cases.
- Add stale-worker fencing before production use.

## 33. Exact Next Action

Repair the R5 fixture claim isolation so only the current labeled fixture set can be claimed, then rerun the full DB-backed recovery matrix. Continue to exclude the real canceled TEST order and do not contact Toss.
