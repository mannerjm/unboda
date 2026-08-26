# STEP 57D-45D-R6B-R3 — WINDOWS RUNTIME BOUNDARY RESULT

## Final Decision

**B. SPECIFIC PRODUCTION SAFETY BLOCKER REMAINS**

The fragile `spawnSync/execFileSync("npx.cmd", ...)` dependency was removed from the dedicated R6B runner. Runtime values now come from the disposable Supabase-generated local `docker.env` file, with exact disposable container and port checks. The runner command was issued, but the shared terminal remained in a PowerShell `>>` continuation state and returned no exit code or runner output.

## Root Cause

The previous owner-observed failure was:

```text
Error: spawnSync npx.cmd EINVAL
```

It originated in `loadDisposableRuntime()` while invoking `npx.cmd supabase status ...` from Node on Windows.

## Fix

`loadDisposableRuntime()` no longer launches `npx.cmd`. It reads:

```text
supabase-r6-disposable/supabase/.temp/start-secrets/supabase_edge_runtime_unboda-r6-disposable/env/docker.env
```

It then requires:

- `SUPABASE_INTERNAL_HOST_PORT = 55321`
- `SUPABASE_DB_URL` naming `supabase_db_unboda-r6-disposable`
- a generated disposable service-role key
- external app URL forced to `http://127.0.0.1:55321`

The `.env.local` evidence configuration is loaded only for non-Supabase values such as Toss TEST configuration, then the Supabase target is overwritten back to the disposable URL.

## Runner Command

```text
npx.cmd tsx scripts/r6b-disposable-refund-recovery-matrix.ts
```

The command was issued once after the fix. No result was returned because the shared terminal is still in a `>>` continuation state.

## R6B Matrix Status

Not executed/verified:

- disposable empty-state runtime preflight output
- fixture creation
- persistence/revocation recovery
- process interruption
- lease/concurrency
- retry/mismatch matrix
- scheduler requests
- cleanup output

No fixture or financial operation is claimed without the runner output.

## Safety

- Toss network calls: `0` claimed in this step
- Provider cancellation calls: `0`
- Evidence Supabase `54321` access: `0` claimed in this step
- Production/shared Supabase access: `0`
- Real payment/order: `0`
- Historical canceled order mutation: `0`
- Manual financial DB patch: `0`
- Commit/push: `NO`
- STEP 57D-46: not started

## Files Changed

- `scripts/r6b-disposable-refund-recovery-matrix.ts`
- `STEP_57D-45D-R6B-R3_WINDOWS_RUNTIME_BOUNDARY_RESULT.md`

## Exact Next Action

Run only the dedicated runner from a genuinely fresh terminal process:

```text
npx.cmd tsx scripts/r6b-disposable-refund-recovery-matrix.ts
```

Require its internal disposable target and empty-state preflight to pass before accepting any R6B matrix result. Do not contact Toss, access evidence Supabase, or start STEP 57D-46.
