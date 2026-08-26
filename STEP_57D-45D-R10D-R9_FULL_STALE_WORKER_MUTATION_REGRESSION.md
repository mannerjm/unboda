# STEP 57D-45D-R10D-R9 — FULL STALE-WORKER MUTATION REGRESSION

## Final Decision

**A. STALE-WORKER FENCING FULLY VERIFIED**

## Target

Disposable Supabase only: `http://127.0.0.1:55321`.

## Fixture and Ownership

One disposable `R10D_R9_FULL_STALE_MUTATION` fixture was created with paid order, one purchase, one active entitlement, and `REFUND_PROCESSING` workflow. Worker A acquired claim token A; its synthetic lease was expired; Worker B reclaimed the same workflow with a distinct claim token B. Worker B's token matched the DB and its lease was valid.

No full token was printed.

## Stale Mutation Results

All real claim-token-fenced production mutation helpers were exercised with Worker A's stale token:

- `staleProviderEvidenceBlocked = true`
- `staleRetryUpdateBlocked = true`
- `staleEscalationBlocked = true`
- `staleEntitlementRevokeBlocked = true`
- `staleFinalCompletionBlocked = true`

The stale entitlement revoke returned no row and left the entitlement active. Workflow ownership and state remained with Worker B. A sixth post-completion stale retry mutation was also rejected/no-op:

- `postCompletionStaleWriteBlocked = true`
- total stale mutations rejected: `6`

## Valid Worker B Result

Worker B completed through the real reconciliation path with mocked Toss lookup only:

- `validWorkerBCompleted = true`
- final workflow: `REFUND_COMPLETED`
- purchase count: `1`
- effective entitlement count: `0`
- entitlement revoked exactly once
- provider lookup calls: `1`
- provider cancellation calls: `0`

The completed workflow remained stable under the post-completion stale write and idempotent completion behavior.

## Cleanup

The synthetic R10D-R9 fixture was removed in `finally`. Disposable financial counts after the run were all zero:

- orders: `0`
- purchases: `0`
- entitlements: `0`
- toss_payment_records: `0`
- refund_workflows: `0`

## Validation

- `npx.cmd tsc --noEmit --pretty false`: **PASS**
- `npx.cmd tsx scripts/r10d-stale-worker-fencing.ts`: **PASS**
- disposable cleanup query: **PASS**
- `git diff --check`: **PASS**

## Observability

The run emitted safe reconciliation, entitlement revocation, and convergence events using internal order IDs, hashed profile references, and correlation IDs. No full paymentKey, secret, Authorization header, raw provider payload, card data, or financial credentials were printed.

## Safety

- Toss contacted: **NO**
- Real cancellation calls: **0**
- New payment/order: **NO**
- Evidence Supabase `54321`: **NO**
- Production/shared Supabase: **NO**
- Historical TEST order mutation: **NO**
- Manual financial DB patch: **NO**
- Commit/push: **NO**
- Retry exhaustion: **NO**
- Scheduler: **NO**
- STEP 57D-46: **NO**

## Files Changed

- `app/lib/refunds/server.ts`
- `app/lib/purchases/server.ts`
- `supabase/migrations/023_refund_claim_fenced_entitlement_revoke.sql`
- `scripts/r10d-stale-worker-fencing.ts`
- `STEP_57D-45D-R10D-R9_FULL_STALE_WORKER_MUTATION_REGRESSION.md`

## Remaining Scope

Stale-worker mutation fencing is verified. Retry exhaustion, mismatch matrix, scheduler, and subsequent workflow steps were intentionally not started in this step.
