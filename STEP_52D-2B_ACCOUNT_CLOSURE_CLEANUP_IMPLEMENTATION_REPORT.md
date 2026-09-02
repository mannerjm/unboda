# STEP 52D-2B Account Closure Cleanup Implementation Report

## 1. Verdict and Baseline

**PASS for the approved local implementation slice.**

Baseline: `main` at `4e0ec892e3ed411e950524851a95028c44daed3b`, equal to
`origin/main` before implementation. No commit or push was performed.

The existing account-closure request, financial-blocker, claim/retry/lease,
Auth-tombstone, and `CLOSED` architecture remains intact.

## 2. Exact Files Changed

- `supabase/migrations/036_account_closure_personal_data_cleanup.sql`
- `scripts/account-closure-personal-data-cleanup-regression.ts`
- `STEP_52D-2B_ACCOUNT_CLOSURE_CLEANUP_IMPLEMENTATION_REPORT.md`

No existing application source, payment/refund code, provider code, NICE code,
52D-1B code, or stale Guest UI/content regression was modified.

## 3. Migration and RPC Changes

Migration 036 is additive after migration 035. It replaces the body of the
existing `execute_account_closure_db_cleanup(uuid)` RPC without changing its
signature or service-role authorization.

Inside the existing per-user advisory-lock transaction it now:

- preserves active-profile deletion and existing profile tombstoning;
- preserves paid-report content scrubbing;
- scrubs `free_analysis_results.content`, `profile_snapshot`, and
  `profile_fingerprint` to `NULL` for every permitted state;
- reduces `orders.analysis_reference_snapshot` and
  `purchases.analysis_reference_snapshot` to an allowlisted `{ "anchorDate" }`
  object when the anchor is a valid string, otherwise `NULL`;
- preserves clearing of order/purchase `analysis_input_snapshot`;
- deletes the closing user's `interested_analyses` rows;
- deletes only consumed Guest rows whose `transferred_user_id` equals the
  closing user;
- preserves entitlement revocation and the `data_scrubbed_at` completion marker.

The migration also:

- makes only the free-result personal fields nullable;
- adds a trigger that rejects incomplete personal fields for ordinary active
  accounts, while allowing closure-state and legacy-`CLOSED` tombstones;
- runs deterministic backfill for already-`CLOSED` accounts covering free
  results, reference snapshots, interests, and transferred Guest tombstones.

No financial rows are deleted or financially meaningful statuses changed.

## 4. Free-Analysis Cleanup Proof

The disposable local regression passed for `generating`, `completed`, and
`failed` member free-analysis rows. After cleanup, all three personal payload
categories were `NULL`:

- `content`;
- `profile_snapshot`;
- `profile_fingerprint`.

The active-write guard rejected an incomplete ordinary active row and accepted a
valid generating row. Already-null fields and repeated cleanup were treated as
successful idempotent states.

## 5. Reference-Snapshot Minimization Proof

The local fixture included an anchor plus Fortune/DAEUN/SEUN-derived fields and
an unexpected extra field. After cleanup, both order and purchase snapshots
contained only the generic anchor object. `analysis_edition_key`, order ID,
purchase ID, amount, status, and linkage remained unchanged.

Malformed or non-object snapshots are mapped to `NULL`; no birth-derived or
personalized context is retained.

## 6. Interests and Guest Closure-Delete Proof

The closing user's `interested_analyses` rows were deleted. No purchase or
entitlement row was affected.

A consumed transferred Guest tombstone linked to the closing user was deleted
immediately. An equivalent Guest row linked to another user remained. The
untransferred Guest lifecycle and independent 52D-1B seven-day cleanup behavior
were not changed.

## 7. Profile Tombstone Re-Verification

The existing profile tombstone behavior remains unchanged and was verified for:

- label;
- relationship type;
- birth date;
- birth time;
- gender;
- calendar type;
- leap-month flag.

Profile UUIDs remain to satisfy actual financial/report foreign-key integrity.
The DB cleanup remains before Auth tombstoning and before the final `CLOSED`
transition.

## 8. Paid Cleanup Re-Verification

The local closure proof confirmed that existing behavior remains intact:

- `paid_reports.content` becomes the existing scrub marker;
- `orders.analysis_input_snapshot` becomes `NULL`;
- `purchases.analysis_input_snapshot` becomes `NULL`;
- active entitlements become inactive with `ACCOUNT_CLOSED` revocation reason.

Order, purchase, payment, entitlement, report, and edition linkage remained
intact.

## 9. Financial-Integrity Proof

The existing phase 3D-1 closure regression and the new local fixture proof
confirmed that closure cleanup does not delete or mutate:

- order/purchase identity;
- amount and paid status;
- payment reconciliation linkage;
- provider transaction evidence;
- refund workflow history or owner-review semantics;
- exact edition key;
- purchase/entitlement linkage.

The existing unresolved refund, owner-review, reconciliation, and unknown-state
blockers continued to prevent cleanup in phase 3D-1 validation.

## 10. CLOSED-Account Backfill Proof

The new regression created a synthetic already-`CLOSED` account with legacy free
result data, a personalized reference snapshot, an interest row, and a
transferred Guest tombstone. It replayed the exact repository migration source
locally. The migration backfill removed the free-result payload, reduced the
reference snapshot, deleted the interest, and deleted the transferred Guest
row. No financial record was involved in the backfill fixture.

The backfill is deterministic and idempotent. It does not delete orders,
purchases, payment records, refunds, entitlements, or operator audit records.

## 11. Retry and Idempotency Proof

The following local cases passed:

- cleanup succeeds twice;
- free-result fields are already `NULL`;
- reference snapshot is already minimized;
- interests are already deleted;
- Guest tombstone is already gone;
- paid report is already scrubbed;
- input snapshots are already `NULL`;
- entitlement is already revoked.

The existing closure regressions continue to prove that DB cleanup occurs before
Auth finalization, Auth failure leaves a retryable closure state, and scheduler
claim/lease retry and owner-review paths remain unchanged.

## 12. Security and Privacy Review

No new customer-facing cleanup endpoint was added. The cleanup remains inside
the service-role-only closure RPC. New regression output contains only sanitized
assertion text and never prints fixture IDs, emails, profile input, snapshots,
fingerprints, content, credentials, or payment values.

No cleanup response exposes personal payloads. No payment key, scheduler secret,
service-role key, or provider credential was added. Cleanup is scoped by the
verified closing user ID and exact consumed Guest transfer linkage.

## 13. Regression Results

Passed on local disposable Supabase after a clean migration replay through 036:

- `scripts/account-closure-personal-data-cleanup-regression.ts`
- `scripts/phase3d-account-closure-finalization-regression.ts`
- `scripts/phase3e2-account-closure-batch-worker-regression.ts`
- `scripts/guest-retention-cleanup-regression.ts`
- `scripts/phase3e3-shared-cron-dispatcher-regression.ts`
- `scripts/guest-free-analysis-server-regression.ts`
- `scripts/guest-free-analysis-transfer-regression.ts`
- `scripts/guest-free-analysis-revisit-regression.ts`

The known stale scripts `guest-ui-integration-regression.ts` and
`guest-birth-date-and-result-regression.ts` were not modified. Their prior
failures remain unrelated to this implementation.

## 14. TypeScript, Build, and Diff Validation

- TypeScript `--noEmit`: passed, exit 0.
- Production build: passed, 43 routes generated.
- `git diff --check`: passed.
- A workspace Next dev process was not running during the production build.

## 15. Remaining Risks and Deferred Legal Work

- Retention periods and lawful bases for financial, provider, refund, order,
  entitlement, and operator-audit metadata remain a later legal-mapping task.
- The existing profile UUID retention is required by current restrictive FKs;
  any future archival identity redesign requires separate review.
- The generic `anchorDate` retention is an explicit allowlisted technical choice;
  legal/owner review may later choose to remove it entirely.
- Existing error fields and external exports should receive separate production
  data-quality review before rollout.

## 16. Confirmation

- No remote Supabase access occurred.
- No provider calls occurred.
- No payment or refund behavior changed.
- No paid eligibility or adult-verification behavior changed.
- No NICE behavior was added.
- No 52D-1B normal 24-hour/7-day behavior changed.
- No commit occurred.
- No push occurred.

## 17. Final Checkpoint Audit

The final audit was run against baseline
`4e0ec892e3ed411e950524851a95028c44daed3b` on `main`, with `HEAD` equal to
`origin/main` before this uncommitted work. The expected implementation scope
contains only migration 036 and the focused closure-cleanup regression; this
report and the prior 52D-2A design are the associated documentation. Existing
logs and unrelated checkpoint artifacts remain untracked and excluded.

Fresh local `supabase db reset --local --no-seed` replayed repository migrations
001 through 036 without manual SQL correction. Migration 036 is valid UTF-8,
the free-result guard trigger is enabled, the scrubbed columns are nullable by
design, and no temporary container SQL remains.

The active-account guard audit passed: incomplete personal fields are rejected
for ordinary active rows, valid generating/failed/completed lifecycle rows remain
supported, and closure-state tombstones may contain null personal fields.

The reference-snapshot audit passed: cleanup constructs a new object from the
explicitly allowed `anchorDate` field, removes `fortune` and future unknown
fields, safely maps null/malformed snapshots to null, and leaves edition and
financial identity unchanged.

The disposable regression passed the complete finalized-closure proof:

- free-analysis content, profile snapshot, and fingerprint scrubbed to null;
- profile tombstone fields preserved according to the existing contract;
- order/purchase input snapshots cleared;
- paid report content scrubbed;
- entitlements revoked without losing linkage;
- interests deleted;
- only the closing user's consumed transferred Guest tombstone deleted;
- unrelated Guest data preserved;
- financial/payment/order/purchase/edition linkage preserved;
- repeated cleanup idempotent.

The same regression passed the deterministic legacy `CLOSED` backfill proof for
free results, reference snapshots, interests, and transferred Guest tombstones.
The existing Guest retention integration passed, confirming the 24-hour/7-day
policy is unchanged. Existing phase 3D-1 and phase 3E-2 closure regressions and
the phase 3E-3 shared scheduler regression passed, including financial blocker,
retry, lease, owner-review, and response-safety assertions.

Final validation passed:

- account-closure personal-data cleanup regression;
- phase 3D-1 closure regression;
- phase 3E-2 closure worker regression;
- Guest retention, server, transfer, and revisit regressions;
- shared cron dispatcher regression, exit 0;
- TypeScript `--noEmit`, exit 0;
- production build, 43 routes;
- `git diff --check`;
- affected-file diagnostics with no errors.

The security review found no new sensitive logging or response exposure. No
free/paid content, snapshots, fingerprints, birth data, Guest credentials,
payment keys, customer emails, service-role keys, or scheduler secrets are
emitted by the new cleanup path or regression output. No client-accessible
service-role path was added.

No remote Supabase access, provider call, commit, or push occurred during this
audit. The two known stale Guest UI/content regressions were not modified.
