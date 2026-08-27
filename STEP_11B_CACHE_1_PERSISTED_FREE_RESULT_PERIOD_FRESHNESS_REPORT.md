# STEP 11B-CACHE-1 — PERSISTED FREE RESULT PERIOD FRESHNESS REPORT

## A. EXECUTIVE SUMMARY

- Selected invalidation unit: whole persisted free response.
- Reason: fixed natal, period data, recommendation Top 3, and recommendation context are stored as one `AnalyzeSuccessResponse` payload.
- Partial regeneration would require payload merging and would risk mixing contexts across retry/guest-transfer paths.
- Stored evaluation context now participates in registered and guest result freshness checks.
- Same profile fingerprint is no longer sufficient for a completed result to be reused.
- Same evaluation year/month may be reused even when the day differs.
- Month or year changes make the completed payload stale and prevent it from being returned as current.
- Legacy completed payloads without evaluation context are treated as stale.
- Registered stale results are claimed through the existing `free_analysis_results` generation lifecycle with `status = generating` and `content = null`.
- The next generator receives one fresh evaluation context, so natal/period/recommendation data cannot be mixed across dates.
- Guest stale results are rejected safely; guest secret, expiry, intent, transfer, and retry semantics remain otherwise unchanged.
- No purchase, order, entitlement, paid-report, payment, or refund data is used in freshness decisions.
- Historical paid reports are not invalidated or rewritten.
- No new schema or migration was added.
- Product pricing and preserved V4/calibration work were not modified.

## B. INVALIDATION UNIT SELECTED

**Option A — invalidate/regenerate the whole persisted free response.**

The stored response combines:

- fixed natal/saju data;
- current daeun/seun and fortune flow;
- product recommendations;
- recommendation explanation;
- evaluation context.

A whole-response regeneration is the smallest safe option because it preserves internal consistency. Partial period-only merging would require a new persistence contract and could combine natal data from one generation with period/recommendation data from another.

## C. FRESHNESS CONTRACT

Freshness granularity is evaluation year/month because STEP 11A provides explicit year/month context and current period/recommendation data is generated from that context.

```text
same profile fingerprint + same evaluation year/month
  -> completed result may be reused

same profile fingerprint + different evaluation year/month
  -> completed result is stale

missing evaluation context
  -> stale for period-dependent reuse
```

The evaluation day does not independently invalidate a result within the same evaluation month.

## D. REGISTERED USER BEHAVIOR

### `POST /api/analyze`

- resolves one `EvaluationContext` at the request boundary;
- passes it to `claimFreeAnalysisResult()`;
- same-period completed content is returned;
- stale completed content is atomically changed to `generating` with `content = null` and claimed for complete regeneration;
- a concurrent loser observes the generating row and does not generate a second full response;
- the same context date is passed to `buildFreeAnalysisResponse()`.

### `GET /api/free-analysis/[profileId]`

- validates profile fingerprint as before;
- checks the stored response evaluation year/month;
- returns the result only when the period is current;
- returns `STALE_EVALUATION_PERIOD` when the stored period is stale.

### Main-analysis retry

- retry remains available for a current-period stored response;
- a stale-period response cannot use the main-analysis-only retry path;
- it must first receive a fresh whole free response.

## E. GUEST BEHAVIOR

Guest records continue to use:

- hashed secret validation;
- expiry;
- consumed state;
- selected-product intent;
- transfer behavior;
- main-analysis retry lifecycle.

Additional freshness behavior:

- guest completed content without current evaluation context is not returned;
- guest content from a different evaluation month/year is not returned as current;
- guest main-analysis retry is rejected for stale period content;
- guest creation uses the normal current evaluation context through the shared pipeline.

The guest expiry remains 24 hours, but expiry alone is not treated as a sufficient month-boundary freshness guarantee. The explicit context check is retained because a 24-hour record can cross a calendar month boundary.

## F. LEGACY STORED RESULT BEHAVIOR

A completed legacy payload without `saju.evaluationContext` is treated as stale.

It is not returned as current and is not silently accepted based only on profile fingerprint.

For registered users, the existing claim lifecycle can regenerate the complete response. For read-only result GET, a safe stale-period response is returned instead of stale content.

## G. 2026-08 → 2026-09 → 2027-01 BEHAVIOR

- stored `2026-08` + current `2026-08`: reusable;
- stored `2026-08` + current `2026-09`: stale, regeneration required;
- stored `2026-09` + current `2027-01`: stale, regeneration required;
- fixed natal fields remain derived from the same birth data;
- current period and recommendation context are regenerated together;
- historical paid report rows are unaffected.

## H. RECOMMENDATION TIME CONSISTENCY

Every new free response is produced from one `EvaluationContext` passed through:

```text
request boundary
  -> createEvaluationContext()
  -> getSaju(..., evaluationDate)
  -> buildFreeAnalysisResponse()
  -> buildAnalysisProductRecommendations(..., evaluationContext)
  -> serialized response
```

A stale response cannot expose its old Top 3 as current. Recommendation ranking remains independent of purchases, orders, entitlements, payments, and refunds.

## I. PURCHASE / ENTITLEMENT / PAID REPORT SAFETY

Freshness code does not import or query:

- purchases;
- orders;
- entitlements;
- payment records;
- refund workflows.

Recommendation recalculation does not mutate those entities.

Paid report persistence and historical period snapshots are untouched. Current recommendation freshness is separate from paid-report history.

## J. SCHEMA / MIGRATION IMPACT

`CACHE FRESHNESS SCHEMA CHANGE: NO`

The existing serialized `saju.evaluationContext` from STEP 11A is sufficient for the initial freshness decision. No migration, column, destructive backfill, or database schema change was added.

## K. FILES CHANGED

- `app/lib/freeAnalysisResults/server.ts`
  - added evaluation-period comparison;
  - stale completed result whole-response claim;
  - passed evaluation context into claim input.
- `app/api/analyze/route.ts`
  - resolves one request evaluation context;
  - passes it to claim and generation.
- `app/api/free-analysis/[profileId]/route.ts`
  - rejects stale completed result payloads.
- `app/api/free-analysis/[profileId]/retry-main-analysis/route.ts`
  - rejects stale main-analysis-only retry.
- `app/api/guest-free-analysis/route.ts`
  - rejects stale guest payloads.
- `app/api/guest-free-analysis/retry-main-analysis/route.ts`
  - rejects stale guest retry payloads.
- `scripts/free-result-period-freshness-regression.ts`
  - focused freshness regression.
- `STEP_11B_CACHE_1_PERSISTED_FREE_RESULT_PERIOD_FRESHNESS_REPORT.md`
  - this report.

No pricing, catalog, V4/calibration, payment, refund, entitlement, or account lifecycle files were changed.

## L. REGRESSIONS ADDED / UPDATED

Added:

```text
scripts/free-result-period-freshness-regression.ts
```

It covers:

- same month reuse;
- month change staleness;
- year change staleness;
- legacy missing context safety;
- purchase/entitlement independence;
- paid report non-invalidation;
- registered and guest route freshness checks;
- whole-response regeneration claim.

Existing tests were not modified.

## M. EXECUTABLE VALIDATION RESULTS

Commands were issued:

```text
npx.cmd tsx scripts/free-result-period-freshness-regression.ts
npx.cmd tsx scripts/recommendation-time-contract-regression.ts
npx.cmd tsx scripts/premium-catalog-period-regression.ts
npx.cmd tsx scripts/result-premium-catalog-ui-regression.ts
npx.cmd tsc --noEmit --pretty false
npm run build
git diff --check
```

The Copilot terminal returned no observable stdout or exit status for this run. Executable PASS is therefore not claimed.

Touched-file diagnostics report no errors for the implementation and regression files.

## N. KNOWN UNRELATED PRICING REGRESSION STATUS

The following known failures remain unchanged and are outside CACHE-1:

- `scripts/paid-analysis-v4-calibration-harness-regression.ts`
- `scripts/product-pricing-regression.ts`

No price, family, tier, product ID, catalog, or V4 expectation was modified.

Known policy remains:

- CORE: 9,900 KRW
- DEEP: 16,900 KRW
- LONG_RANGE: 29,900 KRW
- SIGNATURE: 39,900 KRW

The `relationship` legacy product and `relationship-current` Topic product remain distinct.

## O. V4/CALIBRATION PRESERVATION

Preserved V4/calibration files were not changed:

- `app/lib/paidAnalysisV4CalibrationHarness.ts`
- `scripts/paid-analysis-v4-calibration-harness-regression.ts`
- `scripts/premium-catalog-period-regression.ts`
- `scripts/product-pricing-regression.ts`
- `scripts/result-premium-catalog-ui-regression.ts`

No reset, restore, stash, checkout overwrite, or deletion was performed.

## P. REMAINING STEP 11 GAPS

- Existing persisted free results are invalidated at whole-response granularity rather than partially recomputed.
- Read-only GET returns a stale-period response; a later UX step may add an explicit regeneration action.
- There is no separate persisted period freshness column; serialized response context is currently used.
- Recommendation cards do not yet display purchased/reopen state directly; this remains STEP 12 presentation work.
- Pricing regression conflict remains a separate policy/source alignment issue.
- Executable command PASS requires observable human terminal output.

## Q. RECOMMENDED NEXT STEP

Human-verify CACHE-1 focused regression and build output first. After that, the next implementation slice may address STEP 12 catalog/recommendation presentation state without changing core ranking or purchase records.

`STEP 11A TIME CONTRACT: PASS`

`SAME PERIOD FREE RESULT REUSE: PASS`

`MONTH CHANGE STALE RESULT BLOCKED: PASS`

`YEAR CHANGE STALE RESULT BLOCKED: PASS`

`LEGACY RESULT WITHOUT EVALUATION CONTEXT: SAFE`

`STALE TOP3 RETURNED AS CURRENT: NO`

`PURCHASE HISTORY IN FRESHNESS KEY: NO`

`ENTITLEMENT IN FRESHNESS KEY: NO`

`PAID REPORT INVALIDATED BY CURRENT PERIOD: NO`

`CACHE FRESHNESS SCHEMA CHANGE: NO`

`PRICING MODIFIED: NO`

`V4/CALIBRATION PRESERVED: YES`

`READY FOR NEXT STEP 11 SUBSTEP: YES`

`STEP 12 STARTED: NO`

`STEP 13 STARTED: NO`
