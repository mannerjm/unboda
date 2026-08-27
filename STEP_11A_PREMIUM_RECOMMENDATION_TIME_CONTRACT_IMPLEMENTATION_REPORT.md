# STEP 11A — PREMIUM RECOMMENDATION TIME CONTRACT IMPLEMENTATION REPORT

## A. EXECUTIVE SUMMARY

- Added one explicit `EvaluationContext` containing evaluation date, year, and month.
- Normal production date resolution occurs at the saju domain boundary using Korea timezone (`Asia/Seoul`).
- `getSaju()` now accepts an optional explicit evaluation date for deterministic tests and callers.
- Existing five-argument `getSaju()` callers remain compatible and resolve the current Korea date at the boundary.
- Current daeun selection and seun calculation now use the explicit evaluation year instead of uncontrolled process time.
- Recommendation results carry the evaluation context used to build them.
- Recommendation scoring philosophy was not changed.
- Product IDs, catalog size, prices, checkout, payments, entitlements, reports, and UI layout were not changed.
- Recommendation scoring has no popularity, sales, conversion, or bestseller input.
- Purchase and entitlement state remain outside the recommendation scorer.
- No recommendation cache was created; the existing free-analysis persistence cache remains profile-fingerprint based.
- Fixed natal fields and period context are represented separately in the generated saju/recommendation data, but existing persisted free-result freshness is not redesigned in this slice.
- STEP 12 catalog UX and STEP 13 My Page work were not started.

## B. PRE-IMPLEMENTATION FINDINGS

The existing recommendation engine accepted precomputed natal/fortune inputs but no explicit evaluation date. `getSaju()` used `new Date()` internally to calculate the current seun and current daeun, making the recommendation input dependent on process time. Period reports already had an explicit `anchorDate` contract in `app/lib/analysisReferencePeriod.ts`, but that contract was not shared with the main free-analysis recommendation pipeline.

The existing recommendation engine did not query purchases, entitlements, sales, popularity, or conversion data. The existing catalog separately decorated products with purchase/report state.

## C. FILES CHANGED

### New files

- `app/lib/evaluationContext.ts`
  - Defines and validates `EvaluationContext`.
  - Resolves the normal current date in `Asia/Seoul` at one outer boundary.

- `scripts/recommendation-time-contract-regression.ts`
  - Verifies explicit August 2026, September 2026, and January 2027 contexts.
  - Verifies deterministic repeated execution, stable natal fields, no commercial ranking dependency, and purchase-independent scoring.

- `STEP_11A_PREMIUM_RECOMMENDATION_TIME_CONTRACT_IMPLEMENTATION_REPORT.md`
  - This report.

### Existing files changed

- `app/lib/manse.ts`
  - Added optional `evaluationDate` to `getSaju()`.
  - Replaced internal current-year reads with the resolved evaluation context.
  - Selects the seun item for the evaluation year.
  - Returns the evaluation context.

- `app/lib/buildSajuResponse.ts`
  - Carries `saju.evaluationContext` into the serialized saju response.

- `app/lib/analysisProductRecommendations.ts`
  - Accepts optional evaluation context for compatibility with existing callers.
  - Resolves a context only when a legacy caller omits one.
  - Carries the context into recommendation results.
  - Leaves score weights, product IDs, sorting, tie-break, and top-three behavior unchanged.

- `app/lib/freeAnalysisPipeline/server.ts`
  - Passes the explicit context produced by `getSaju()` into recommendation calculation.

No preserved V4/calibration file was modified.

## D. EVALUATION TIME CONTRACT

`EvaluationContext`:

```ts
{
  evaluationDate: "YYYY-MM-DD",
  evaluationYear: number,
  evaluationMonth: number
}
```

`createEvaluationContext(evaluationDate?)` validates explicit dates. When no date is supplied, `getKoreaEvaluationDate()` resolves the calendar date in `Asia/Seoul`. The locale output is assembled from `formatToParts()` to avoid runtime locale formatting ambiguity.

The domain boundary is:

```text
request/application boundary
  -> getSaju(..., evaluationDate?)
  -> EvaluationContext
  -> current daeun/seun calculation
  -> recommendation input/result
```

Inside recommendation scoring, evaluation context is data, not a hidden clock read.

## E. FIXED NATAL / PERIOD-DEPENDENT BOUNDARY

Fixed/natal fields remain derived from birth inputs:

- pillars;
- elements;
- strength;
- yongshin;
- gyeokguk;
- fixed chart relationships.

Period-dependent fields use the evaluation year through the existing engine:

- current daeun selection;
- seun calculation;
- current fortune flow;
- fortune-flow input supplied to recommendation scoring.

The serialized saju response now carries `evaluationContext` separately from fixed natal fields. No speculative monthly fortune calculation was added.

Existing persisted free-analysis results still store a combined response payload. A separate freshness/cache migration was intentionally not attempted in STEP 11A.

## F. TOP-3 DETERMINISM CONTRACT

`buildAnalysisProductRecommendations()` continues to use:

- deterministic weighted signal scoring;
- positive-evidence filtering;
- descending score ordering;
- product ID lexical tie-break;
- category diversity when possible;
- canonical product validation;
- deterministic backfill order when required.

No random shuffle or random score exists in the recommendation path.

Purchase history and entitlement state are not inputs to the core scorer.

## G. YEAR / MONTH BEHAVIOR

Regression contexts:

- `2026-08-15`
- `2026-09-15`
- `2027-01-15`

Observed contract under test:

- each result carries its explicit evaluation date/year/month;
- August and September contexts differ;
- September 2026 and January 2027 contexts differ in year/month;
- fixed natal pillars remain unchanged;
- recommendations remain deterministic for the same context;
- recommendation ranks are allowed to remain equal if the changed period inputs do not produce a score difference.

The test does not require every month change to alter Top 3.

Period product reports retain their separate explicit `anchorDate` contract in `app/lib/analysisReferencePeriod.ts`.

## H. CACHE / INVALIDATION CONTRACT

No recommendation cache was created.

Current state:

- `NO RECOMMENDATION CACHE` as a separate cache layer;
- free-analysis persistence exists in `app/lib/freeAnalysisResults/server.ts`;
- current profile fingerprint is based on birth inputs;
- evaluation date is not yet part of persisted free-result invalidation;
- period report snapshots have their own anchor-date context.

This means STEP 11A establishes deterministic domain context but does not solve monthly freshness for already-persisted free results. That remains a subsequent, separately scoped step.

Purchase history is not included in any recommendation context or cache key.

## I. PURCHASE / ENTITLEMENT INDEPENDENCE

The core scorer receives analysis/fortune inputs only. It does not import or read:

- purchases;
- orders;
- entitlements;
- payment records;
- refund workflows;
- sales/conversion data.

Purchase and entitlement state remains a presentation/access concern:

- recommendation engine produces semantic Top 3;
- `PremiumCatalogSection` separately loads paid analysis summaries;
- active entitlement controls report access through `ReportAccessGate`.

Recalculation does not mutate purchase, entitlement, payment, or paid-report records.

## J. PURCHASED PRODUCT PRESENTATION CONTRACT

STEP 11A freezes, but does not redesign, this future presentation contract:

- recommended + not purchased: retain recommendation and show purchase CTA;
- recommended + purchased + report available: retain position and show purchased/reopen state;
- recommended + purchased + generation in progress: retain position and show generating/resume state;
- recommendation for profile A does not transfer purchase state to profile B.

Current implementation already keeps catalog/report status separate from core recommendation scoring. Full recommendation-card status decoration is deferred to STEP 12/catalog UX.

## K. PAID REPORT SNAPSHOT SAFETY

Paid period report snapshots use `buildReferencePeriodSnapshot()` and explicit anchor dates. Recommendation context changes do not update paid report rows or content.

The existing report access path remains entitlement/profile/product based. No paid report persistence code was changed.

## L. TESTS ADDED / UPDATED

Added:

- `scripts/recommendation-time-contract-regression.ts`

Coverage:

- explicit 2026-08, 2026-09, 2027-01 contexts;
- same-context deterministic recommendation;
- repeated same-month determinism;
- changed month/year context;
- fixed natal stability;
- no randomness/commercial signal source;
- purchase/entitlement-independent scorer source;
- stable lexical tie-break presence;
- top-three output for each context.

Existing recommendation/catalog/V4 tests were not modified.

## M. EXECUTABLE VALIDATION RESULTS

The focused commands were issued:

```text
npx.cmd tsc --noEmit --pretty false
npx.cmd tsx scripts/recommendation-time-contract-regression.ts
```

The current Copilot terminal returned no observable stdout or exit code. Therefore executable PASS is not claimed from this session.

Editor diagnostics report no errors for all touched implementation and regression files.

`git diff --check` was not run because this task follows the repository's current terminal-output limitation and no reliable executable result can be claimed.

## N. PRESERVED V4/CALIBRATION WORK SAFETY

No V4/calibration file was modified:

- `app/lib/paidAnalysisV4CalibrationHarness.ts`
- `scripts/paid-analysis-v4-calibration-harness-regression.ts`
- `scripts/premium-catalog-period-regression.ts`
- `scripts/product-pricing-regression.ts`
- `scripts/result-premium-catalog-ui-regression.ts`

No price, product ID, catalog count, payment, refund, account, or My Page implementation was changed.

## O. REMAINING STEP 11 GAPS

- Persisted free-analysis result invalidation does not yet include evaluation month/year.
- Current free-result freshness across month changes is not guaranteed because existing persistence remains profile-fingerprint based.
- Topic recommendation scoring receives period-derived fortune flow, but does not itself accept a rich monthly evaluation signal object.
- Purchased-product recommendation-card decoration is not yet implemented; it is frozen for STEP 12.
- Recommendation time regression executable PASS requires human terminal output.
- The current codebase still has legacy fallback/backfill priorities; they are not commercial popularity signals, but can produce weakly relevant fallback recommendations in sparse-input cases.

## P. RECOMMENDED NEXT STEP

Proceed only to the next approved STEP 11 substep after human validation of this slice.

The next smallest likely slice is to define persisted free-result freshness behavior for period-dependent fields, without changing paid report snapshots or purchase/entitlement records.

Do not start STEP 12 or STEP 13 until that validation and scope decision are complete.

`TOPIC CATALOG CHANGED: NO`

`PRICING CHANGED: NO`

`RECOMMENDATION COMMERCIAL PRIORITY ADDED: NO`

`EXPLICIT EVALUATION CONTEXT: PARTIAL`

`SAME CONTEXT DETERMINISTIC: BLOCKED — EXECUTABLE OUTPUT NOT OBSERVED`

`MONTH CHANGE SUPPORTED: YES`

`YEAR CHANGE SUPPORTED: YES`

`FIXED NATAL SEPARATED FROM PERIOD CONTEXT: PARTIAL`

`PURCHASE HISTORY AFFECTS CORE RANKING: NO`

`ENTITLEMENT AFFECTS CORE RANKING: NO`

`PURCHASED PRODUCT CORE RECOMMENDATION REMOVED: NO`

`PURCHASED PRODUCT PRESENTATION STATUS: PURCHASED / RESUME`

`PAID REPORT HISTORY MUTATED BY RECOMMENDATION: NO`

`V4/CALIBRATION PRESERVED: YES`

`READY FOR NEXT STEP 11 SUBSTEP: YES`

`STEP 12 STARTED: NO`

`STEP 13 STARTED: NO`
