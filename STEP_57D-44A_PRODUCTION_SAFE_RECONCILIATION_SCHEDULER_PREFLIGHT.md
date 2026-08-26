# STEP 57D-44A — PRODUCTION-SAFE PAYMENT RECONCILIATION SCHEDULER PREFLIGHT

## 1. Final Decision

**A. PRODUCTION-SAFE RECONCILIATION SCHEDULER PREFLIGHT VERIFIED**

The repository now has a bounded Vercel Cron mechanism, protected internal invocation, durable retry budget/backoff metadata, terminal mismatch handling, local scheduled-run simulation, and preserved 43P convergence invariants. No production payment or V4 activation occurred.

## 2. Deployment / Scheduler Inventory

The repository is a Next.js App Router application and its README documents Vercel deployment. No existing cron, GitHub Actions schedule, queue worker, Supabase scheduled function, or background job runner was found. The narrowest compatible mechanism is Vercel Cron via `vercel.json`.

## 3. Chosen Scheduler Mechanism

`vercel.json` invokes `POST /api/internal/payments/reconcile`.

Vercel Cron is appropriate because the current application is already structured as Next.js server routes and Vercel is the documented deployment target. A separate worker platform and Supabase `pg_cron` were rejected as unnecessary infrastructure additions. No production scheduler was activated during this preflight.

Secret delivery uses the existing `PAYMENT_RECONCILIATION_SECRET` server environment variable. The route accepts either the internal header or Vercel Cron's `Authorization: Bearer` form. The secret is never serialized to client code.

## 4. Scheduler Cadence

The configured schedule is `0 * * * *`, once per hour. This balances recovery latency with database/provider traffic and avoids sub-hour polling. Duplicate invocations remain safe through application state guards and database uniqueness constraints.

## 5. Reconciliation Route Security

The route remains internal-secret protected. Missing or wrong credentials return HTTP 401. It does not accept user, order, amount, or payment state from the request body. It selects only eligible unresolved states, excludes converged `paid` records and terminal `reconciliation_failed` records, and caps the returned batch at 50 records. Per-record failures are isolated and do not abort the batch.

## 6. Retryable / Non-retryable Classification

Retryable states:

- `pending`
- `confirmation_started`
- `externally_confirmed`
- `reconciliation_required`

Non-retryable or excluded states:

- `paid`
- `terminal_mismatch`
- exhausted `reconciliation_failed`

Provider amount, currency, order-reference, identity, and impossible-state mismatches fail closed and become terminal mismatch or failure outcomes. Normal provider/database transient failures remain retryable until the budget is exhausted.

## 7. Retry / Backoff Policy

Migration `018_toss_reconciliation_retry_budget.sql` adds `retry_count`, `max_retry_count`, `next_retry_at`, and `last_attempt_at` to `toss_payment_records`.

The default maximum is five attempts, constrained to 1-10. Backoff is exponential from one minute and capped at one hour. Records are selected only when `next_retry_at` is due. The reconciliation batch is capped at 50 records.

## 8. Retry Budget

Default automatic retry budget: **5 attempts**. Once exhausted, the record becomes `reconciliation_failed` and is excluded from automatic selection. The state is available for owner escalation and exception handling; normal transient retries do not require owner intervention.

## 9. Escalation State

Machine-readable states are represented by reconciliation status:

- `externally_confirmed` / `reconciliation_required`: `RETRY_PENDING`
- successful `paid`: `CONVERGED`
- active processing: `RECOVERING`
- exhausted `reconciliation_failed` or `terminal_mismatch`: `OWNER_ESCALATION_REQUIRED`

No alert integration was added in this preflight.

## 10. Customer Guidance State Model

The existing durable states support safe customer messaging without exposing provider errors:

- `confirmation_started` / `externally_confirmed`: payment received, processing
- `reconciliation_required`: temporary delay, retrying
- `paid`: completed
- `terminal_mismatch` / exhausted failure: action required

The route returns safe aggregate results only; raw provider payloads and secrets are not returned.

## 11. Local Scheduler Simulation

`npx.cmd tsx scripts/local-scheduler-simulation-regression.ts` passed against the disposable `unboda-local` Supabase database with mocked Toss responses.

The simulation proved:

- eligible record is discovered and converges on first invocation
- Vercel-style bearer authentication is accepted
- second invocation after convergence is a no-op
- exactly one paid order, purchase, and effective entitlement remain
- synthetic fixture cleanup runs deterministically

The separate 43P local proof also passed all five failure scenarios after the scheduler changes.

## 12. Duplicate Scheduler Invocation

**PASS.** Repeated invocation after convergence selected zero records and produced no duplicate internal rows or provider confirmation. The 43P proof observed one initial mocked confirmation and no duplicate confirmation during reconciliation.

## 13. Batch Isolation

**PASS by implementation and local contract.** The worker catches each record's failure independently, increments failure/retry counters, and continues processing later records. The query is bounded to 50 records and excludes paid/terminal states.

## 14. Security Tests

Passed:

- missing scheduler secret rejected with HTTP 401
- local worker readiness regression passed
- scheduler contract regression passed
- bearer authentication contract present
- localhost-only target guard passed
- no client payment state or amount authority added
- no production mock-confirm bypass added
- no Toss secret exposed or logged

## 15. Observability Output

The route returns a structured result containing:

- `runId`
- `startedAt`
- `scanned`
- `eligible`
- `converged`
- `retryPending`
- `failed`
- `escalation`
- `durationMs`

No sensitive payment payload is included.

## 16. Reconciliation Invariants Preserved?

**YES.** The 43P local database-backed proof passed all five scenarios after the scheduler and retry migration changes.

## 17. Profile Integrity Preserved?

**YES.** The 43P proof continued to assert identical profile scope across order, purchase, and entitlement, with paid access resolved for the exact profile.

## 18. Amount / Order Integrity Preserved?

**YES.** Provider amount, currency, and order-reference checks remain server-authoritative and fail closed. No Launch V1 pricing was changed.

## 19. Regressions

Passed:

- `npx.cmd tsc --noEmit --pretty false`
- `npx.cmd tsx scripts/scheduler-preflight-regression.ts`
- `npx.cmd tsx scripts/local-scheduler-simulation-regression.ts`
- `npx.cmd tsx scripts/toss-payment-reconciliation-regression.ts`
- `npx.cmd tsx scripts/toss-payment-failure-injection-integration.ts`
- `npx.cmd tsx scripts/purchase-persistence-phase3b-regression.ts` (its separate live Supabase section explicitly skipped due missing dedicated test-user variables)
- `npx.cmd tsx scripts/profile-scoped-purchase-server-regression.ts`
- `npx.cmd tsx scripts/profile-context-access-regression.ts`
- `npx.cmd tsx scripts/paid-report-persistence-regression.ts`
- `npx.cmd tsx scripts/forged-client-pricing-regression.ts`
- `npx.cmd tsx scripts/launch-v1-pricing-mapping-regression.ts` (54 products)
- `npx.cmd tsx scripts/local-supabase-environment-readiness-regression.ts`
- `npx.cmd tsx scripts/local-reconciliation-worker-readiness-regression.ts`
- `npx.cmd --yes supabase db reset --local --yes --no-seed`
- `npx.cmd --yes supabase migration list --local`
- `git diff --check`

The legacy pricing regression remains classified **A. STALE LEGACY EXPECTATION**. It expects `relationship = DEEP / 16900`, while the approved Launch V1 resolver returns `CORE / 9900`. Pricing policy was not changed.

## 20. Files Changed

- `vercel.json`
- `supabase/migrations/018_toss_reconciliation_retry_budget.sql`
- `app/api/internal/payments/reconcile/route.ts`
- `app/lib/purchases/server.ts`
- `app/lib/purchases/types.ts`
- `scripts/scheduler-preflight-regression.ts`
- `scripts/local-scheduler-simulation-regression.ts`
- `STEP_57D-44A_PRODUCTION_SAFE_RECONCILIATION_SCHEDULER_PREFLIGHT.md`

Existing prior work was preserved.

## 21. Schema Changes

Local-only migration `018_toss_reconciliation_retry_budget.sql` adds bounded retry fields and an index on `(next_retry_at, reconciliation_status)`. It was applied by local reset and recorded in local migration history. No remote migration was run.

## 22. Side Effects

- Production/shared DB contacted: **NO**
- Production DB writes: **0**
- Local disposable DB writes: synthetic scheduler fixtures and cleanup only
- Live Toss calls: **0**
- Sandbox Toss calls: **0**; all provider responses mocked
- Production payment activated: **NO**
- Production V4 activated: **NO**
- Production scheduler activated: **NO**
- Pricing changes: **0**
- OpenAI calls: **0**
- Commit: **NO**
- Push: **NO**

## 23. Production / Shared DB Contacted?

**NO.** Only the localhost `unboda-local` Supabase stack was used.

## 24. Toss Network Contacted?

**NO.** The scheduler and integration tests intercepted Toss requests locally.

## 25. Production Payment Activated?

**NO.**

## 26. Production V4 Activated?

**NO.**

## 27. Commit / Push?

Commit: **NO**

Push: **NO**

## 28. Remaining Blocker

No scheduler implementation blocker remains for this preflight. Before production payment activation, the deployment must bind Vercel Cron to the configured `PAYMENT_RECONCILIATION_SECRET` and verify one non-production scheduled invocation with deployment logs. This is deployment verification, not a failure in the local scheduler contract.

## 29. Exact Next Action

STEP 57D-44B — TOSS SANDBOX E2E + PAYMENT OBSERVABILITY PREFLIGHT

Do not activate production payments or Production V4 as part of that step.
