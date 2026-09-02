# STEP 57D-48F-D2 — Immutable Analysis Input Snapshot — FINAL REPORT

STATUS: PASS

## 1. WHAT THIS STEP ADDS

Freezes the canonical birth-data input (not just the reference anchor/edition
key) at order/purchase time, so that a later profile edit — or a retry of a
delayed/failed report generation — can never change what a *specific paid
purchase* produces. Complements 57D-48F-C (which froze `analysis_edition_key`
and `analysis_reference_snapshot`) by also freezing the underlying saju input.

## 2. SNAPSHOT SCHEMA

- FILE: [app/lib/analysisInputSnapshot.ts](app/lib/analysisInputSnapshot.ts)
- SNAPSHOT VERSION: `1` (`ANALYSIS_INPUT_SNAPSHOT_VERSION`)
- SNAPSHOT FIELDS:
  - `version` (literal `1`)
  - `birthData.birthDate` (`YYYY-MM-DD`, regex-validated)
  - `birthData.birthTime` (`HH:MM`, regex-validated)
  - `birthData.calendarType` (`양력` | `음력`)
  - `birthData.isLeapMonth` (boolean)
  - `birthData.gender` (`남성` | `여성`)
- WHY EACH FIELD IS REQUIRED: these are exactly the five inputs
  `getSaju()`/`buildFreeAnalysis()` consume to deterministically compute a
  saju/fortune result; nothing more, nothing less.
- UNNECESSARY PERSONAL DATA STORED: NO — profile `label`, `relationshipType`,
  `id`, and timestamps are explicitly excluded by `buildAnalysisInputSnapshot()`.

## 3. FREEZE / TRUST BOUNDARY

- ORDER/PURCHASE SNAPSHOT SOURCE: server-side `getUserProfile(profileId, userId)`
  (ownership-checked) inside `resolveAnalysisEditionForOrder()`, for every
  edition policy (not just DAEUN).
- CLIENT CAN SUPPLY SNAPSHOT: NO — never accepted from request body.
- REPORT GENERATION INPUT SOURCE: the frozen `purchases.analysis_input_snapshot`
  (via `getPurchaseById(entitlement.purchaseId)`), parsed with
  `parseAnalysisInputSnapshot()` and fail-closed (409
  `ANALYSIS_INPUT_SNAPSHOT_INVALID`) on corruption — never the live profile,
  when a snapshot is present.
- PROFILE EDIT CHANGES OLD REPORT: NO (proven live, §7).
- RETRY USES CURRENT PROFILE: NO — retry still uses the original frozen
  snapshot (proven live, §7 retry case).
- TWO PURCHASES PRESERVE DISTINCT A/B SNAPSHOTS: YES (proven live, §8).
- DAEUN/TOPIC FROZEN-INPUT CONSISTENCY AFTER FURTHER PROFILE CHANGE: PASS
  (proven live, §9 — recomputed edition key from frozen snapshot + reference
  matches the original).
- LEGACY MISSING-SNAPSHOT POLICY: rows with `analysis_input_snapshot = null`
  (all pre-migration rows) fall back to the live profile at generation time —
  unchanged, backward-compatible behavior.
- ACCOUNT CLOSURE SNAPSHOT CLEANUP: `execute_account_closure_db_cleanup` now
  also nulls `orders.analysis_input_snapshot` /
  `purchases.analysis_input_snapshot` for the closing user, alongside existing
  profile-birth-data tombstoning and paid_reports content scrubbing.

## 4. CORE BUG FIX DISCOVERED DURING THIS STEP

`buildPaidAnalysisInputFromProfile()` already accepted an `anchorDate` param
(threaded through since 48F-C) but only used it for the reference-period
snapshot's cosmetic labels — the actual `getSaju()` call did not receive it,
so real fortune/daeun/seun computation always used live "now", not the frozen
order date. Fixed with one line: `anchorDate` is now passed as `getSaju()`'s
existing (already-supported) 6th `evaluationDate` parameter. Proven via
regression that a frozen 2010 vs 2026 anchor produces materially different
`fortuneTiming` output.

## 5. MIGRATION

- FILE: [supabase/migrations/031_immutable_analysis_input_snapshot.sql](supabase/migrations/031_immutable_analysis_input_snapshot.sql)
- Adds nullable `analysis_input_snapshot jsonb` to `orders` and `purchases`
  only (not `entitlements`/`paid_reports`).
- Updates `execute_account_closure_db_cleanup` (same signature/safety checks)
  to scrub the new column on closure.
- LOCAL MIGRATION APPLIED: YES (`supabase migration up --local --yes`),
  verified via `docker exec supabase_db_unboda psql` — all 25 pre-existing
  orders / 20 purchases / 4 entitlements survived, 0 unexpected NULLs
  introduced.

## 6. EDITION/SNAPSHOT NOT-NULL HARDENING REVIEW (READ-ONLY, SECTION 19)

- Live DB check (this session): `analysis_edition_key` is NOT NULL in practice
  for all current rows — 0 of 25 orders, 0 of 20 purchases, 0 of 4
  entitlements are NULL (029's backfill already assigned `'LIFETIME'` or
  `'LEGACY'` to every historical row).
- BLOCKER: ~40+ pre-existing regression/fixture scripts (e.g. r10a–r10f,
  refund-r3/r4/r5, phase3d-account-closure-finalization) insert directly into
  `orders`/`purchases`/`entitlements` without setting `analysis_edition_key`,
  and would break under a hard `NOT NULL` constraint. `analysis_input_snapshot`
  has the same issue plus many more legitimate legacy-null rows (any purchase
  made before this step).
- RECOMMENDATION: `analysis_edition_key` could technically become `NOT NULL`
  today (data-wise), but only after updating those ~40 fixture scripts —
  out of scope for this step. `analysis_input_snapshot` should remain nullable
  indefinitely; it is legitimately absent for all pre-D2 rows and the
  generation code path already handles both cases correctly. No CHECK/trigger
  is needed: application code (`createPendingOrder`,
  `createPurchaseFromPaidOrder`) already fails closed if edition resolution
  fails, so new rows are guaranteed non-null in practice without a DB-level
  constraint.
- NO code changes made for this section (read-only per spec).

## 7. REGRESSIONS (SECTION 20)

All run individually against the same local Supabase instance except where noted.

| Check | Result |
|---|---|
| Frozen-input snapshot construction (`analysis-input-snapshot-regression.ts`) | PASS |
| Snapshot validation (schema mismatch fail-closed) | PASS |
| Order→purchase verbatim copy | PASS |
| Profile edit after order doesn't change paid generation (live, §7) | PASS |
| Retry after profile edit still uses original snapshot (live, §7 retry) | PASS |
| Two editions retain distinct profile-input snapshots (live, §8) | PASS |
| DAEUN old-edition reproduction (live, §9) | PASS |
| MONTHLY/TOPIC reproduction | PASS |
| Account closure cleanup scrubs `analysis_input_snapshot` | PASS |
| Refund edition isolation (`analysis-edition-commercial-core-*`) | PASS |
| Reconciliation remains frozen (`toss-payment-reconciliation-regression.ts`, `refund-reconciliation-*`) | PASS |
| P0 duplicate guard (`purchase-persistence-phase3b-regression.ts`) | PASS |
| Edition commercial core (`analysis-edition-commercial-core-regression.ts`) | PASS |
| Edition order freeze (`analysis-edition-order-freeze-regression.ts`) — assertion #10 updated for D2's "always fetch profile" behavior | PASS (fixed, re-verified) |
| Edition policy/key (`analysis-edition-policy-key-regression.ts`) | PASS |
| Edition migration (`analysis-edition-migration-regression.ts`) | PASS |
| `paid-report-persistence-regression.ts` — updated for `generationProfile` variable name | PASS (fixed, re-verified) |
| `paid-report-profile-input-regression.ts` | PASS |
| `profile-scoped-purchase-server-regression.ts` | PASS |
| `profile-context-access-regression.ts` | PASS |
| `mypage-paid-analysis-summary-regression.ts` | PASS |
| `mypage-library-regression.ts` | PASS |
| `interested-analyses-save-state-truth-regression.ts` | PASS |
| `launch-v1-pricing-mapping-regression.ts` (54 products) | PASS |
| `purchased-analyses-library-regression.ts` | PASS |
| `premium-product-detail-convergence-regression.ts` | PASS |
| `e2e-purchase-funnel-regression.ts` | PASS |
| `checkout-profile-selector-regression.ts` | PASS |
| `navigation-contract-regression.ts` | PASS |
| `account-lifecycle-foundation-regression.ts` | PASS |
| `local-reconciliation-worker-readiness-regression.ts` | PASS |
| TypeScript (`tsc --noEmit`) | PASS (no output) |
| Production build (`next build`) | PASS (43/43 routes) |
| `git diff --check` | PASS (clean) |

Two test-only assertions were fixed as a direct, intended consequence of D2's
behavior change (profile now always fetched for the input snapshot regardless
of edition policy):
- [scripts/analysis-edition-order-freeze-regression.ts](scripts/analysis-edition-order-freeze-regression.ts) assertion #10.
- [scripts/paid-report-persistence-regression.ts](scripts/paid-report-persistence-regression.ts) line 49 (`generationProfile` variable rename).

## 8. FILES MODIFIED

- `app/lib/analysisInputSnapshot.ts` (new)
- `app/lib/analysisEditionForOrder.ts` (always builds/freezes input snapshot)
- `app/lib/paidAnalysisProfileInput.ts` (anchorDate → getSaju fix)
- `app/lib/purchases/server.ts` (types, createPendingOrder, createPurchaseFromPaidOrder, getPurchaseById)
- `app/lib/purchases/types.ts` (`analysisInputSnapshot` fields)
- `app/lib/refunds/server.ts` (literal fix for new required field)
- `app/api/paid-analysis-detail-v2/route.ts` (consumes frozen snapshot, fail-closed on corruption)
- `supabase/migrations/031_immutable_analysis_input_snapshot.sql` (new)
- `scripts/analysis-input-snapshot-regression.ts` (new)
- `scripts/analysis-input-snapshot-live-integration.ts` (new)
- `scripts/analysis-edition-order-freeze-regression.ts` (assertion fix)
- `scripts/paid-report-persistence-regression.ts` (assertion fix)

## 9. FINAL DECLARATIONS

COMMIT: NO
PUSH: NO
REMOTE SUPABASE CONTACTED: NO
STOP.
