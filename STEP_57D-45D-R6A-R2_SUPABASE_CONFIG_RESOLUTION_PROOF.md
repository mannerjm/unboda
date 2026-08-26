# STEP 57D-45D-R6A-R2 — SUPABASE CONFIG RESOLUTION PROOF

## 1. Final Decision

**B. CONFIG RESOLUTION ROOT CAUSE PROVEN — STACK STILL BLOCKED**

The original disposable directory layout was wrong for the CLI invocation. It had `supabase-r6-disposable/config.toml` and `supabase-r6-disposable/migrations/` directly under the workdir. The corrected standard layout is now `supabase-r6-disposable/supabase/config.toml` with nested migrations. However, after correction the second stack still did not become usable, so migration replay and empty-state proof remain blocked.

## 2. Installed Supabase CLI Version

`2.115.0`

Docker server version: `29.7.2`.

## 3. Disposable Directory Shape Before

Before R2:

```text
supabase-r6-disposable/
  config.toml
  migrations/
    001...
    ...
    022...
```

This was layout B from the task.

## 4. Official Expected Directory Shape

For the root workdir invocation, the expected project shape is:

```text
<workdir>/supabase/config.toml
<workdir>/supabase/migrations/
```

## 5. Exact Workdir

`C:\Users\manne\OneDrive\Desktop\unboda\supabase-r6-disposable`

## 6. Exact Config Path Resolved

Corrected path:

`C:\Users\manne\OneDrive\Desktop\unboda\supabase-r6-disposable\supabase\config.toml`

The corrected config contains project ID `unboda-r6-disposable`, API port `55321`, DB port `55322`, shadow DB port `55320`, Studio port `55323`, and auth site `http://127.0.0.1:53000`.

## 7. Resolved Configuration Values

- project ID: `unboda-r6-disposable`
- api.port: `55321` in corrected config
- db.port: `55322` in corrected config
- db.shadow_port: `55320`
- studio.port: `55323`
- auth site port: `53000`

The config file is now in the intended nested path. Actual running-service port application remains unverified because no disposable container survived startup.

## 8. Stale Temp/Env Override Findings

- No disposable `.temp` or `.branches` state remained after the failed starts.
- CLI pruned disposable-only partial volume/network resources on failed attempts.
- No evidence-project temp state was deleted.
- No production/shared Supabase URL was used.
- A missing local CLI profile notice was printed, but the first concrete startup failure was Docker port binding, not a remote contact or credential issue.

## 9. Exact Previous Invocation Issue

The command was:

```text
npx.cmd --yes supabase start --workdir supabase-r6-disposable --network-id unboda-r6-disposable ...
```

The workdir itself was treated as the project root, but the config/migrations were directly under that root rather than under its `supabase/` subdirectory. The CLI created a project-named disposable container while resolving default service settings, resulting in an attempt to bind default DB port `54322`.

## 10. Fix Applied

The disposable-only directory was corrected to:

```text
supabase-r6-disposable/
  supabase/
    config.toml
    migrations/001 through 022
```

The obsolete disposable-only top-level config/migrations were removed. No evidence stack resource or financial data was changed.

## 11. Actual Docker DB Port Binding

Before layout correction, Docker attempted:

```text
0.0.0.0:54322 -> disposable Postgres
```

and failed because the evidence DB owned that port.

After layout correction, no disposable DB container remained and no `55322` binding was observed. `supabase status --workdir supabase-r6-disposable` reported no container named `supabase_db_unboda-r6-disposable`.

## 12. Container/Network/Volume Separation

Evidence stack remains separate:

- containers named `supabase_*_unboda-local`
- network `supabase_network_unboda-local`
- evidence API/DB ports `54321/54322`

Disposable intended identity is `unboda-r6-disposable`, but actual running container/network/volume separation is **NOT VERIFIED** because startup did not leave a usable second stack.

## 13. Port Bindings

- evidence DB `54322`: occupied and untouched
- disposable DB `55322`: no binding
- disposable API `55321`: no usable binding
- disposable Studio `55323`: no usable binding
- auth site `53000`: no service binding

No unrelated process was terminated.

## 14. Migration Replay 001-022

**NOT RUN.** The corrected directory contains all 22 migrations in canonical order, but no second database was available for replay.

## 15. Empty-State Proof

**NOT VERIFIED.** No disposable database was available. No financial records were created in it.

## 16. Target Guard

No production target guard was changed. Future R6B must require both exact disposable API URL `http://127.0.0.1:55321` and project identity `unboda-r6-disposable`, and reject evidence URL `http://127.0.0.1:54321`.

## 17. Existing Evidence After-State

The evidence stack remained running with `unboda-local` resources and original ports. It was not stopped, reset, migrated, deleted, or mutated. The historical real canceled order was not accessed in R2.

## 18. Toss Contacted?

**NO**.

## 19. Production/Shared Supabase Contacted?

**NO**.

## 20. Historical Evidence Mutated?

**NO**.

## 21. Commit/Push?

Commit: **NO**

Push: **NO**

## 22. Remaining Blocker

The config-resolution root cause is fixed, but the corrected project still fails to produce a running second Supabase stack. The custom ports cannot be verified because `supabase_db_unboda-r6-disposable` does not exist after startup. A supported multi-project startup method or separately managed disposable local stack is still required.

## 23. Exact Next Action

Resolve the remaining second-stack startup issue using the corrected nested layout, capture the next exact CLI/Docker failure if any, and verify disposable containers, network, volume, custom ports, migrations, schema, and empty state before R6B. Do not run R6B or start STEP 57D-46.
