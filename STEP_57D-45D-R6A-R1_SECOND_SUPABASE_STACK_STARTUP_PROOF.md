# STEP 57D-45D-R6A-R1 — SECOND SUPABASE STACK STARTUP PROOF

## 1. Final Decision

**B. SECOND STACK PARTIALLY READY — SPECIFIC BLOCKER**

The exact startup failure is proven: the disposable Supabase CLI creates a disposable DB container but attempts to bind the default host DB port `54322`, which is already allocated by the protected `unboda-local` evidence stack. The custom `55322` configured for the disposable project is not applied by the current CLI invocation.

No disposable stack became usable. Migration replay and R6B were not run.

## 2. Exact Previous Startup Root Cause

Safe debug startup output:

```text
failed to start docker container "supabase_db_supabase-r6-disposable":
Bind for 0.0.0.0:54322 failed: port is already allocated
```

The first failing service was the disposable Postgres container. The host port `54322` is occupied by the existing evidence database. The requested disposable DB port `55322` was free, but the CLI-generated container configuration still used `54322`.

## 3. Docker Status

Existing evidence containers remain running under names such as:

- `supabase_db_unboda-local`
- `supabase_kong_unboda-local`
- `supabase_studio_unboda-local`

No `r6-disposable` containers remain after the CLI pruned its failed disposable-only attempt.

## 4. Supabase CLI Status

- Supabase CLI: `2.115.0`
- Docker server: `29.7.2`
- Existing evidence status: local API/DB/Studio available
- Disposable status: no database container; status reports `No such container: supabase_db_supabase-r6-disposable`

The CLI printed a non-fatal missing local profile notice (`C:\Users\manne\.supabase\profile`) but proceeded to the actual container bind failure. The bind failure is the first operational startup blocker.

## 5. Config Comparison

Disposable config uses:

- project ID: `unboda-r6-disposable`
- API: `55321`
- DB: `55322`
- shadow DB: `55320`
- Studio: `55323`
- auth site: `http://127.0.0.1:53000`
- analytics disabled

Evidence config uses project ID `unboda-local` and ports `54321` through `54324`. Config shape and project identities are distinct. The problem is that startup did not honor the disposable DB port.

## 6. Port Inventory

- Evidence DB `54322`: occupied by `supabase_db_unboda-local`.
- Disposable DB `55322`: no host listener.
- Disposable API/Studio requested ports: no usable bindings because the stack failed before service startup.
- No unrelated process was terminated.

## 7. Disposable Stale-Resource Inventory

The failed disposable starts created disposable-only partial resources, then the Supabase CLI pruned them:

- disposable container IDs: pruned
- `supabase_db_supabase-r6-disposable` volume: pruned
- `unboda-r6-disposable` network: pruned

No `unboda-local` container, volume, network, or data was removed.

## 8. Image/Startup Diagnosis

Docker and images were available. The failure was not image pull, extraction, architecture, disk, or health timeout. It was Docker external port allocation during disposable Postgres container startup.

## 9. Fix Applied

No production or evidence environment fix was applied. A disposable project directory/config and copied migration directory were prepared. Startup was retried with both command flag placements, but the CLI continued to use default `54322`.

No system software was installed and no unrelated process was killed.

## 10. Disposable Project Identity

Configured identity: `unboda-r6-disposable`.

Requested network: `unboda-r6-disposable`.

Actual running identity proof: **NOT VERIFIED**, because no disposable containers survived startup.

## 11. Container Separation

**NOT VERIFIED.** No disposable containers remain. Existing evidence containers remain separate and running.

## 12. Network Separation

**NOT VERIFIED.** The requested disposable network was pruned after failed startup. The evidence network was not touched.

## 13. Volume/Database Separation

**NOT VERIFIED.** The disposable Postgres volume was pruned after failed startup. No evidence volume was touched.

## 14. Port Bindings

**NOT VERIFIED.** The DB bind failed at `54322`; no `55322` binding was created.

## 15. Migration Replay 001-022

**NOT RUN.** No usable disposable database existed. The repository contains migrations `001` through `022` in the disposable directory, but none were applied there.

## 16. Schema Verification

**NOT VERIFIED.** Required financial tables, claim function, lease fields, and constraints were not checked in a second database.

## 17. Empty Financial-State Proof

**NOT VERIFIED.** No disposable DB was available; no financial fixture or data was created.

## 18. Target Guard Proof

The intended future guard is exact disposable URL/project identity, not localhost-only. It was not activated because the disposable API did not start.

## 19. Existing Evidence Before/After

The evidence stack stayed running under `unboda-local` with its original ports and network. It was not stopped, reset, migrated, deleted, or mutated. The historical canceled TEST order was not queried or changed during startup diagnosis.

## 20. Files Changed

- `supabase-r6-disposable/config.toml`
- `supabase-r6-disposable/migrations/001` through `022` copied setup files
- `STEP_57D-45D-R6A_DISPOSABLE_SUPABASE_FINANCIAL_TEST_ENVIRONMENT.md`
- `STEP_57D-45D-R6A-R1_SECOND_SUPABASE_STACK_STARTUP_PROOF.md`

## 21. Disposable Resources Removed/Created

Created temporarily by the CLI: disposable-only partial DB container, volume, and network. Each failed attempt was pruned by the CLI. No evidence resources were removed.

## 22. Toss Contacted?

**NO**.

## 23. Real Cancellation Calls?

**0**.

## 24. Production/Shared DB Contacted?

**NO**.

## 25. Historical Evidence Mutated?

**NO**.

## 26. Commit/Push?

Commit: **NO**

Push: **NO**

## 27. Remaining Blocker

The installed Supabase CLI does not honor the custom DB port in the standalone disposable config during `supabase start --workdir`; it generates a disposable DB container that binds the evidence DB port `54322`. Without a genuinely separate running DB instance, isolation cannot be claimed.

## 28. Exact Next Action

Resolve the CLI/config port propagation issue using a supported Supabase local multi-project method or a separately managed disposable Postgres/Supabase stack, without stopping or resetting `unboda-local`. Verify containers, volumes, network, ports, migrations, schema, and empty state before beginning R6B. Do not run R6B, STEP 57D-46, or CS/Admin work now.
