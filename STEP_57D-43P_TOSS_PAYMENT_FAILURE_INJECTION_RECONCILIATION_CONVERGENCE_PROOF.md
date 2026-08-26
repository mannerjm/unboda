# STEP 57D-43P — TOSS PAYMENT FAILURE-INJECTION / RECONCILIATION CONVERGENCE PROOF

## 1. Final Decision

**B. PASS WITH REMAINING BLOCKER**

The local database-backed convergence logic passed all five required scenarios. The remaining blocker is that the repository has no production scheduler/cron integration invoking the reconciliation route; automatic execution is therefore not yet proven in production deployment.

## 2. Environment Proof

- Docker Desktop: operational, version `29.7.2`
- Local Supabase project: `unboda-local`
- Local API: `http://127.0.0.1:54321`
- Local DB: `127.0.0.1:54322`
- Local Studio: `http://127.0.0.1:54323`
- CLI: `npx.cmd --yes supabase`, version `2.115.0`
- Local stack containers: healthy and named `supabase_*_unboda-local`
- Integration target guard required `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`

## 3. Safety / Target Proof

The integration harness fails unless the target URL is exactly the local API and a local service-role key is supplied at process runtime. It does not read `.env.local` automatically. All provider requests are mocked only for `https://api.tosspayments.com/v1/`; all Supabase requests continue to target the local API. No remote project was linked or queried.

## 4. Mock Toss Provider Design

The harness returns deterministic `DONE` payment responses with stable per-order `paymentKey`, matching provider `orderId`, `KRW`, and `16900` amount. It observed exactly one confirmation request and two provider lookup requests. No HTTP request left the machine for Toss.

## 5. Fixture Design

Each run creates a synthetic auth user, profile, Toss order, and payment record through real local Supabase writes. Each case is isolated by deleting its lifecycle rows. Final local counts were zero for synthetic users, profiles, orders, purchases, entitlements, and Toss payment records.

## 6. Failure Case 1

Initial state: pending Toss order and `confirmation_started` record.

Injected failure: mocked Toss confirmation succeeds, then the process interrupts before internal access persistence.

Recovery: query Toss by internal order id, verify reference/amount/currency/status, then replay paid order, purchase, and entitlement writes.

Result: **PASS**. Exactly one paid order, purchase, effective entitlement, payment identity, and accessible entitlement; second reconciliation is safe.

## 7. Failure Case 2

Initial state: provider evidence, paid order, and purchase.

Injected failure: entitlement persistence fails.

Recovery: already-paid path replays purchase and entitlement idempotently.

Result: **PASS**. One paid order, one purchase, one effective profile-scoped entitlement, and access restored.

## 8. Failure Case 3

Initial state: provider evidence, paid order, and existing purchase.

Injected failure: entitlement write fails after purchase creation.

Recovery: existing paid order path reuses the unique `order_id` purchase and upserts the entitlement.

Result: **PASS**. Purchase count remains exactly one and entitlement count exactly one.

## 9. Failure Case 4

Initial state: provider evidence durably recorded.

Injected failure: simulated worker interruption after evidence persistence.

Recovery: a fresh reconciliation execution discovers the unresolved payment and replays internal state.

Result: **PASS**. No amount, order, profile, purchase, or entitlement corruption; access becomes available.

## 10. Failure Case 5

Initial state: externally successful payment with paid order and access rows.

Injected condition: repeated reconciliation execution.

Result: **PASS**. One effective payment identity, one paid order, one purchase, and one effective entitlement. No duplicate provider confirmation was attempted.

## 11. Exact DB Invariants

For every case, direct local database assertions required:

- order status exactly `paid`
- order amount exactly `16900`
- order profile exactly equals fixture profile
- purchases for order exactly `1`
- effective entitlements for user/profile/product exactly `1`
- payment reconciliation status exactly `paid`
- payment key stable and unique
- provider order id exactly equals internal order id
- expected and confirmed amounts exactly equal `16900`
- currency exactly `KRW`
- provider status exactly `DONE`
- purchase and entitlement profile ids equal the order profile id
- existing profile-scoped entitlement lookup returns non-null

## 12. Profile-Scoped Integrity

**PASS.** Every scenario asserted `order.profile_id -> purchase.profile_id -> entitlement.profile_id`. No account-wide fallback was used.

## 13. Amount / Order-Reference Integrity

**PASS.** The harness used the server-resolved `16900` amount and matching provider evidence. Production reconciliation still rejects provider amount, currency, and order-reference mismatches before access writes.

## 14. Report Access Convergence

**PASS.** `getActiveEntitlementForProfile` recognized the final entitlement for the exact user/profile/product after each recovery.

## 15. Idempotency

**PASS.** Duplicate reconciliation was run after every case. The run observed `confirm=1` and `lookup=2`; reconciliation did not issue duplicate confirmations. Existing unique constraints and upserts preserved one purchase and one entitlement.

## 16. Automatic Recovery Assessment

**A. Reconciliation convergence logic verified.** Real local database writes, failure timing, fresh reconciliation execution, and cleanup were exercised. Normal injected failures required zero manual database repair.

**B. Production scheduler still pending.** The protected route is the invocation point, but no repository cron/scheduler was found. A deployment scheduler must invoke it at a bounded interval before production activation.

## 17. Scheduler Status

No production scheduler is currently implemented or activated. The worker is locally invokable through its protected route and the readiness regression verifies unauthenticated access returns HTTP 401.

## 18. Regressions

Passed:

- `npx.cmd tsc --noEmit --pretty false`
- `npx.cmd tsx scripts/toss-payment-failure-injection-integration.ts`
- `npx.cmd tsx scripts/toss-payment-reconciliation-regression.ts`
- `npx.cmd tsx scripts/purchase-persistence-phase3b-regression.ts` (its separate live Supabase block skipped because test-user variables were absent)
- `npx.cmd tsx scripts/profile-scoped-purchase-server-regression.ts`
- `npx.cmd tsx scripts/profile-context-access-regression.ts`
- `npx.cmd tsx scripts/paid-report-persistence-regression.ts`
- `npx.cmd tsx scripts/forged-client-pricing-regression.ts`
- `npx.cmd tsx scripts/launch-v1-pricing-mapping-regression.ts` (54 products)
- `npx.cmd tsx scripts/local-supabase-environment-readiness-regression.ts`
- `npx.cmd tsx scripts/local-reconciliation-worker-readiness-regression.ts`
- `git diff --check`

The legacy pricing regression is classified **A. STALE LEGACY EXPECTATION** because it expects `relationship = DEEP / 16900`, while the current approved Launch V1 resolver returns `CORE / 9900`. Pricing policy was not changed.

## 19. Files Changed

- `scripts/toss-payment-failure-injection-integration.ts`
- `scripts/toss-payment-reconciliation-regression.ts`
- `scripts/lib/disposable-supabase-target.ts`
- `scripts/local-supabase-environment-readiness-regression.ts`
- `scripts/local-reconciliation-worker-readiness-regression.ts`
- `supabase/config.toml`
- `supabase/migrations/016_toss_payment_reconciliation.sql`
- `supabase/migrations/017_payment_service_role_write_grant.sql`
- `STEP_57D-43P_TOSS_PAYMENT_FAILURE_INJECTION_RECONCILIATION_CONVERGENCE_PROOF.md`

Existing prior work remains preserved.

## 20. Side Effects

- Production/shared DB contacted: **NO**
- Local disposable DB writes: synthetic fixtures, payment lifecycle rows, and cleanup only
- Production DB writes: **0**
- Toss network contacted: **NO**
- Live Toss calls: **0**
- Sandbox Toss calls: **0**; responses were mocked locally
- Production payment activated: **NO**
- Production V4 activated: **NO**
- Pricing changes: **0**
- OpenAI calls: **0**
- Commit/push: **NO / NO**

## 21. Remaining Blocker

One narrow blocker remains: add and exercise a deployment scheduler/cron invocation for `POST /api/internal/payments/reconcile` with bounded frequency, retry/backoff, and owner escalation after the retry budget. The reconciliation convergence logic itself passed the five local database-backed scenarios.

## 22. Exact Next Action

STEP 57D-44 — ADD AND VERIFY PRODUCTION-SAFE RECONCILIATION SCHEDULER PREFLIGHT

Do not activate production payments until the scheduler is configured and verified in a non-production deployment.
