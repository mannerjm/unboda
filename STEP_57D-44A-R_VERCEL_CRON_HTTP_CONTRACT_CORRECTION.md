# STEP 57D-44A-R — VERCEL CRON HTTP CONTRACT CORRECTION

## 1. Decision

**A. VERCEL CRON HTTP CONTRACT VERIFIED**

The reconciliation route now supports the actual Vercel Cron GET invocation while retaining POST for internal/manual use. Both methods delegate to one authenticated server-side implementation.

## 2. Actual Vercel Cron Invocation Method

`vercel.json` configures the path, but the route determines HTTP method compatibility. The route exposes:

- `GET /api/internal/payments/reconcile`
- `POST /api/internal/payments/reconcile`

Vercel-style GET requests use:

`Authorization: Bearer <CRON_SECRET>`

The route compares that bearer value to the server-only `PAYMENT_RECONCILIATION_SECRET`. Browser authentication is not accepted as a substitute.

## 3. `vercel.json` Contract

`vercel.json` contains exactly one cron:

- path: `/api/internal/payments/reconcile`
- schedule: `0 * * * *`

The schedule is hourly and bounded. `vercel.json` does not specify the HTTP method; the route's exported GET handler provides that compatibility.

## 4. GET Authentication Result

Local Vercel-style simulation passed:

- GET without Authorization: HTTP 401
- GET with wrong bearer: HTTP 401
- GET with correct bearer: accepted and reconciled the eligible local record
- second correct GET after convergence: safe no-op

No secret was logged.

## 5. POST Status

POST remains supported for private/manual test invocation and delegates to the same reconciliation implementation. Existing internal-secret behavior remains intact:

- missing secret: HTTP 401
- wrong secret: HTTP 401
- correct `x-reconciliation-secret`: accepted

No business logic is duplicated between GET and POST.

## 6. Caching / Dynamic Execution Protection

The route declares `dynamic = "force-dynamic"`. Successful and unauthorized responses include `Cache-Control: no-store`. The route is not linked from the frontend, is not pre-rendered, and is not a client-callable privileged path.

## 7. Local Vercel-Style Invocation Result

`npx.cmd tsx scripts/local-scheduler-simulation-regression.ts` passed against disposable local Supabase with mocked Toss responses.

The simulation proved:

- eligible record discovered by GET
- provider reconciliation executed locally
- exact order/purchase/entitlement invariant preserved
- duplicate GET after convergence was a no-op
- missing and incorrect bearer credentials were rejected
- no Toss network call occurred

## 8. Reconciliation Invariant Result

The STEP 57D-43P local database-backed proof was rerun and passed all five cases:

- provider success then internal persistence failure: PASS
- paid order then entitlement failure: PASS
- purchase then entitlement failure: PASS
- process interruption then retry: PASS
- duplicate reconciliation: PASS

Observed provider calls remained `confirm=1`, `lookup=2`, with no duplicate confirmation.

## 9. Migration 017 / 018 Ordering

Migration `017_payment_service_role_write_grant.sql` grants the server `service_role` the required DML permissions on orders, purchases, entitlements, and Toss payment records. It was created during STEP 57D-43P after the local proof exposed the pre-existing local privilege defect; it was not part of the original migration history before that work.

Migration `018_toss_reconciliation_retry_budget.sql` is the next available numeric version after `017`. It adds durable retry count, maximum retry count, next retry time, last attempt time, and the retry eligibility index.

The complete local ordering is `001` through `018` with no duplicate numeric versions. The local database records both `017` and `018` as applied. No remote migration history was queried, and no remote migration was run.

## 10. Files Changed

- `app/api/internal/payments/reconcile/route.ts`
- `scripts/scheduler-preflight-regression.ts`
- `scripts/local-scheduler-simulation-regression.ts`
- `scripts/toss-payment-reconciliation-regression.ts`
- `STEP_57D-44A-R_VERCEL_CRON_HTTP_CONTRACT_CORRECTION.md`

The prior scheduler and local migration files remain preserved. No pricing or Production V4 code changed.

## 11. Validation

Passed:

- `npx.cmd tsc --noEmit --pretty false`
- `npx.cmd tsx scripts/scheduler-preflight-regression.ts`
- `npx.cmd tsx scripts/local-scheduler-simulation-regression.ts`
- `npx.cmd tsx scripts/toss-payment-reconciliation-regression.ts`
- `npx.cmd tsx scripts/toss-payment-failure-injection-integration.ts`
- `npx.cmd tsx scripts/local-reconciliation-worker-readiness-regression.ts`
- `git diff --check`

The five-case and scheduler simulations used only localhost Supabase and mocked Toss responses.

## 12. Side Effects

- Production/shared DB contacted: **NO**
- Remote migration: **NO**
- Production DB writes: **0**
- Local disposable DB writes: synthetic scheduler fixtures and cleanup only
- Toss network contacted: **NO**
- Live Toss calls: **0**
- Sandbox Toss calls: **0**; mocked locally
- Production deployment performed: **NO**
- Production payment activated: **NO**
- Production V4 activated: **NO**
- Pricing changes: **0**
- OpenAI calls: **0**
- Commit: **NO**
- Push: **NO**

## 13. Exact Next Action

STEP 57D-44B — TOSS SANDBOX E2E + PAYMENT OBSERVABILITY PREFLIGHT

Do not activate production payments or Production V4 during that step.
