# STEP 52D-1B Guest Retention Implementation Report

## Scope

Implemented the frozen bounded guest-retention policy locally. Guest analysis
access and first transfer remain governed by the existing 24-hour `expires_at`
contract. Every guest row is now eligible for hard deletion at the absolute
`created_at + 7 days` boundary.

## Implementation

- Added `supabase/migrations/035_bounded_guest_retention_cleanup.sql`.
  - Allows `profile_input` and `profile_fingerprint` to be null only after a
    transfer is consumed.
  - Preserves normal completed-row integrity: completed rows require `content`
    unless they are consumed transfer tombstones.
  - Updates `complete_guest_analysis_transfer` to atomically copy the member
    result and then scrub guest `profile_input`, `profile_fingerprint`, and
    `content`.
  - Retains only retry/transfer metadata for a consumed tombstone, including
    `secret_hash`, selected product, transfer linkage, and minimization time.
  - Preserves same-user/same-secret lost-response retry and the existing
    `pending_existing_result` response for an already generating member result.
  - Adds an expiring, `FOR UPDATE SKIP LOCKED`, capped-at-25 cleanup claim RPC.
- Added `cleanupExpiredGuestFreeAnalyses()` to
  `app/lib/guestFreeAnalyses/server.ts`.
  - Claims one bounded batch and conditionally deletes each row only when its
    claim token still matches.
  - Returns counts only; it neither logs nor returns guest identifiers, secrets,
    profile inputs, fingerprints, or content.
- Added the independent guest-cleanup worker to
  `app/api/internal/reconcile/route.ts` after payment, refund, and account
  closure processing. Scheduler authentication, `no-store`, single hourly cron,
  and per-worker failure isolation remain unchanged.
- Guarded `app/api/guest-free-analysis/generate/route.ts` so a minimized
  tombstone cannot be treated as an active generatable guest record.

## Local-Only Proof

Applied migration 035 only to local Docker database `supabase_db_unboda`. The
first PowerShell pipeline application corrupted Korean SQL literals; it was
corrected by copying the UTF-8 migration into the container and running `psql
-f`. No remote Supabase target was contacted.

`scripts/guest-retention-cleanup-regression.ts` passed and verified:

- first transfer copies member data and atomically scrubs the guest duplicate;
- the same member and secret retry successfully after scrubbing;
- a different member or secret cannot use the tombstone;
- rows under seven days survive, including minimized tombstones;
- rows at least seven days old are deleted based on `created_at` even when
  `updated_at` is current;
- concurrent cleanup claims assign each expired fixture row once;
- all disposable users and guest fixtures are removed in a `finally` block.

## Validation

- `npx tsc --noEmit`: passed.
- `scripts/guest-free-analysis-server-regression.ts`: passed.
- `scripts/guest-free-analysis-transfer-regression.ts`: passed.
- `scripts/guest-free-analysis-revisit-regression.ts`: passed.
- `scripts/guest-retention-cleanup-regression.ts`: passed.
- `scripts/phase3e3-shared-cron-dispatcher-regression.ts`: passed its static,
  authentication, and live dispatcher assertions with the fourth worker.
- `npm run build`: passed, 43 routes generated.
- `git diff --check`: passed.

Two pre-existing static scripts still fail on stale unrelated UI/content string
expectations: `guest-ui-integration-regression.ts` expects an obsolete root-route
pattern, and `guest-birth-date-and-result-regression.ts` expects a removed result
renderer text fragment. They were not changed because this implementation does
not modify those product surfaces.

## Non-Changes

No remote database/provider action, payment/refund behavior, paid/account
eligibility behavior, customer-facing 24-hour guest access behavior, commit, or
push was performed.

## Checkpoint Blocker Resolution

The final pre-checkpoint audit identified that
`guest_free_analyses_unconsumed_data_required` had originally been added with
`NOT VALID`. That enforced the invariant for new writes but did not prove that
all existing rows satisfied it.

FIX1 preserves the original invariant and its intended exception: every
unconsumed row requires `secret_hash`, `profile_input`, and
`profile_fingerprint`; consumed transfer tombstones may have those personal
fields and `content` scrubbed. The existing deterministic 035 backfill first
minimizes only consumed rows, then runs:

```sql
alter table public.guest_free_analyses
  validate constraint guest_free_analyses_unconsumed_data_required;
```

Fresh local replay from repository source applied migrations 001 through 035
without manual SQL correction. PostgreSQL metadata reported
`guest_free_analyses_unconsumed_data_required|t`, proving `convalidated = true`.

The disposable retention regression additionally proved that an invalid active
generating row is rejected, a valid generating row is accepted, a consumed
minimized tombstone remains valid, same-member/same-secret retry still works,
and the transferred tombstone is hard-deleted after crossing the seven-day
`created_at` boundary.

FIX1 validation results:

- Guest server, transfer, revisit, and retention regressions: passed.
- Shared cron dispatcher regression: passed with exit 0.
- TypeScript `--noEmit`: passed.
- Production build: passed, 43 routes generated.
- `git diff --check`: passed.
- No remote action, provider call, commit, or push occurred.

The original `NOT VALID` finding is retained here for audit history and was
resolved before checkpoint review.