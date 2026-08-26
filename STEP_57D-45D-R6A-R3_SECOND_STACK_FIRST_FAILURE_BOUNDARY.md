# STEP 57D-45D-R6A-R3 — SECOND STACK FIRST FAILURE BOUNDARY

## 1. Final Decision

**B. SECOND STACK BLOCKED — TARGET-GUARD RUNTIME PROOF PENDING**

The first startup blocker was fixed by correcting the Supabase directory layout and adding the disposable Inbucket port. The second stack now runs independently, migrations 001-022 replay successfully, and the disposable financial database is empty. The exact target guard source is present and diagnostics-clean, but its standalone runtime regression did not return because the shared PowerShell session was left in a continuation prompt. R6B was not run.

## 2. Corrected Config Path

```text
C:\Users\manne\OneDrive\Desktop\unboda\supabase-r6-disposable\supabase\config.toml
```

## 3. Project Identity

- Evidence project: `unboda-local`
- Disposable project: `unboda-r6-disposable`
- Evidence network: `supabase_network_unboda-local`
- Disposable network: `unboda-r6-disposable`

## 4. Complete Port Inventory

Evidence ports occupied:

- `54321`: API/Kong
- `54322`: Postgres
- `54323`: Studio
- `54324`: Inbucket/Mailpit

Disposable ports verified free before start and then bound:

- `55321`: API/Kong
- `55322`: Postgres
- `55323`: Studio
- `55324`: Inbucket
- `55320`: shadow DB configuration; not a persistent host service binding
- `53000`: auth site URL; not a Supabase service listener

No unrelated process was terminated.

## 5. Disposable Residue Before Cleanup

Prior failed attempts produced disposable-only partial containers, volume, and network. The Supabase CLI pruned those resources during failed startup. No evidence resource was removed.

## 6. Disposable Residue Removed

Removed/pruned only resources named for `unboda-r6-disposable`:

- failed disposable DB containers
- failed disposable DB volume
- failed disposable network

The evidence stack was never stopped, reset, or pruned.

## 7. Exact Startup Command

```text
npx.cmd --yes supabase start --workdir supabase-r6-disposable --network-id unboda-r6-disposable --debug --ignore-health-check --output-format json
```

## 8. First New Failure Boundary

Before the layout fix, the first failure was Postgres startup with:

```text
Bind for 0.0.0.0:54322 failed: port is already allocated
```

After moving the config to the standard nested path and adding `[inbucket] port = 55324`, the stack started successfully. Startup logs showed migration application followed by health checks at API port `55321`.

## 9. Failure Classification

- Original failure: **B. CONFIG_ERROR / CLI CONFIG RESOLUTION**, manifesting as **A. PORT_COLLISION**
- Corrected startup: **PASS**

The custom DB port was not applied while config was in the old top-level layout. The corrected layout caused the configured disposable ports to be honored.

## 10. Safe Error/Log Evidence

The exact prior safe Docker error was the `54322` bind collision above. Corrected startup output included:

```text
Applying migration 001_phase3b_purchase_persistence.sql...
...
Applying migration 022_fix_refund_claim_concurrency.sql...
HTTP HEAD: http://127.0.0.1:55321/rest-admin/v1/ready
```

No secret values were printed in this report.

## 11. Fixes Applied

- Rebuilt disposable project into `supabase-r6-disposable/supabase/`.
- Moved `config.toml` and all migrations under the nested Supabase directory.
- Added disposable `[inbucket]` port `55324`.
- Added exact R6 disposable URL guard and regression.

No refund, payment, entitlement, or production code was changed in R6A-R3.

## 12. Retry Results

- Startup with old layout: failed at DB port `54322`.
- Startup with corrected nested layout but missing Inbucket override: configuration warning/continued startup path identified.
- Startup with nested layout and Inbucket `55324`: succeeded.

## 13. Final Container Inventory

Running disposable containers include:

- `supabase_db_unboda-r6-disposable`
- `supabase_kong_unboda-r6-disposable`
- `supabase_studio_unboda-r6-disposable`
- `supabase_auth_unboda-r6-disposable`
- `supabase_rest_unboda-r6-disposable`
- `supabase_realtime_unboda-r6-disposable`
- `supabase_storage_unboda-r6-disposable`
- `supabase_inbucket_unboda-r6-disposable`
- `supabase_pg_meta_unboda-r6-disposable`
- `supabase_edge_runtime_unboda-r6-disposable`

All use network `unboda-r6-disposable`.

## 14. Network Separation

PASS. The disposable containers use `unboda-r6-disposable`; the evidence containers use `supabase_network_unboda-local`.

## 15. Volume/DB Separation

PASS. Disposable volumes include `supabase_db_unboda-r6-disposable`, separate from the evidence DB volume. The DB container is `supabase_db_unboda-r6-disposable`, not `supabase_db_unboda-local`.

## 16. Actual Port Bindings

Verified:

- `55321 -> container 8000` for disposable Kong/API
- `55322 -> container 5432` for disposable Postgres
- `55323 -> container 3000` for disposable Studio
- `55324 -> container 8025` for disposable Inbucket

Evidence bindings remain on `54321` through `54324`.

## 17. Migration Replay 001-022

PASS. Startup replay output showed all migrations `001` through `022` applied in canonical filename order. No migration was manually patched.

## 18. Schema Verification

PASS in disposable DB:

- `orders`
- `purchases`
- `entitlements`
- `toss_payment_records`
- `refund_workflows`
- `claim_refund_workflows` function
- reconciliation claim lease columns
- canonical refund status constraint

The constraint allows only the five internal refund statuses and does not allow provider `CANCELED`.

## 19. Empty Financial-State Proof

PASS in disposable DB:

- orders: `0`
- purchases: `0`
- entitlements: `0`
- toss_payment_records: `0`
- refund_workflows: `0`

No R6B fixture was created.

## 20. R6B Target Guard

Added `assertR6DisposableSupabaseUrl`, requiring exact origin `http://127.0.0.1:55321`. The regression rejects:

- evidence local `http://127.0.0.1:54321`
- production/shared Supabase URL
- ambiguous `http://localhost:55321`

The guard source and regression are present and diagnostics-clean. The standalone guard command did not return a result because the shared PowerShell session was left in a `>>` continuation prompt. Runtime guard proof is pending.

## 21. Existing Evidence After-State

The evidence stack remained running throughout. It was never stopped, reset, migrated, deleted, or mutated. The historical real TEST order was not touched.

Previously verified evidence state remains:

- order: `paid`
- provider confirmation: `DONE`
- refund: `REFUND_COMPLETED`
- purchase: `1`
- effective entitlement: `0`

## 22. Files Changed

- `supabase-r6-disposable/supabase/config.toml`
- `supabase-r6-disposable/supabase/migrations/001` through `022`
- `scripts/lib/disposable-supabase-target.ts`
- `scripts/r6a-disposable-target-guard-regression.ts`
- `STEP_57D-45D-R6A_DISPOSABLE_SUPABASE_FINANCIAL_TEST_ENVIRONMENT.md`
- `STEP_57D-45D-R6A-R1_SECOND_SUPABASE_STACK_STARTUP_PROOF.md`
- `STEP_57D-45D-R6A-R2_SUPABASE_CONFIG_RESOLUTION_PROOF.md`
- `STEP_57D-45D-R6A-R3_SECOND_STACK_FIRST_FAILURE_BOUNDARY.md`

## 23. Toss Contacted?

**NO**.

## 24. Real Cancellation Calls?

**0**.

## 25. Production/Shared Supabase Contacted?

**NO**. Both environments used are local; the evidence environment was not mutated.

## 26. Historical Evidence Mutated?

**NO**.

## 27. Commit/Push

Commit: **NO**

Push: **NO**

## 28. Remaining Blocker

The disposable stack is healthy and isolated, but exact target-guard runtime proof is pending due the terminal continuation state. R6B recovery testing is intentionally not run in this step. The disposable stack is currently running and must be explicitly stopped/destroyed only as part of a later controlled cleanup decision.

## 29. Exact Next Action

Stop here. Begin R6B only as a separate step, using API `http://127.0.0.1:55321`, the exact disposable project identity `unboda-r6-disposable`, and the exact target guard. Do not point R6B at `54321`, do not create fixtures in the evidence environment, and do not start STEP 57D-46.
