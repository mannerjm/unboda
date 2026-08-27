# STEP 11B-CACHE-2 — EXPLICIT FREE ANALYSIS REFRESH REPORT

## A. PREVIOUS CACHE-1 STALE BEHAVIOR

CACHE-1 correctly detected stale evaluation periods, but its registered-user claim path immediately changed a stale completed row to `generating` and cleared `content`. That meant a period change could begin whole-response regeneration through the ordinary analysis claim path and could hide the only previous completed result before a new response succeeded.

CACHE-2 separates detection from user-triggered mutation.

## B. FINAL STALE/REFRESH STATE CONTRACT

- `CURRENT`: stored evaluation year/month matches the current normalized Korea evaluation context.
- `STALE`: stored completed/failed historical content has the same profile fingerprint but a different evaluation year/month, or lacks evaluation context.
- `GENERATING`: explicit refresh owns the existing generation claim.
- `FAILED`: explicit refresh failed while the historical content remains stored for viewing/retry.

No new database enum or state column was added.

## C. READ-PATH SIDE EFFECTS

Ordinary registered GET:

- reads the profile and stored result;
- validates profile fingerprint;
- compares stored/current evaluation context;
- returns stale historical content plus safe freshness metadata;
- does not claim generation;
- does not clear content;
- does not call the AI pipeline.

My Page summary:

- derives CURRENT/STALE status from stored evaluation year/month;
- does not claim or generate;
- does not mutate financial or report data.

Guest GET:

- validates the existing secret/expiry/consumed contract;
- rejects stale guest content rather than presenting it as current;
- does not invoke AI or create a new guest record.

## D. EXPLICIT REFRESH FLOW

New endpoint:

`POST /api/free-analysis/[profileId]/refresh`

Flow:

1. authenticate the current user;
2. verify profile ownership;
3. resolve one current `Asia/Seoul` evaluation context;
4. call the existing free-result claim lifecycle with `allowPeriodRefresh: true`;
5. return current content without regeneration if already current;
6. return generating if another refresh owns the row;
7. atomically claim stale/failed content for whole-response regeneration;
8. call `buildFreeAnalysisResponse()` with the same evaluation date;
9. persist the new response only after generation completes.

Only this explicit user action opts into stale-period claim.

## E. FAILURE / OLD RESULT PRESERVATION

The stale refresh claim now preserves the existing `content` field while changing the row to `generating`.

If generation fails:

- the existing `failFreeAnalysisResult()` sets the row to `failed`;
- the old completed content remains stored;
- GET can still return the old content with stale status/metadata;
- a later explicit refresh can retry.

No history-table redesign was added.

## F. MY PAGE METADATA CONTRACT

`/api/mypage/summary` now reads stored evaluation year/month from the persisted response and passes the current context to `resolveProfileFreeAnalysisStatus()`.

Conceptual states available to STEP 13:

- current result: current period;
- stale result: historical period plus update available;
- generating: refresh in progress;
- failed/needs retry: generation failure state.

No AI generation occurs while My Page loads.

## G. FREE RESULT PAGE CONTRACT

When a stale registered result is opened through `GET /api/free-analysis/[profileId]`, the response includes:

- `analysis`: preserved historical content;
- `status`: `stale` or `generating`;
- `freshness: STALE`;
- stored evaluation context when available;
- current evaluation context;
- `refreshAvailable` metadata.

The old response is not silently labeled as current. STEP 12 can consume this metadata for presentation without changing the core calculation.

## H. GUEST POLICY

Guest analysis retains its existing short-lived 24-hour expiry and secret/consumption flow.

Because a 24-hour guest record can cross a calendar month boundary, stale guest content is not presented as current. It is rejected safely rather than adding a separate guest history/refresh architecture.

No guest scheduler or background refresh was added.

## I. AI COST / BACKGROUND REGENERATION SAFETY

- My Page does not call the generation pipeline.
- Result GET does not call the generation pipeline.
- stale read does not claim a row.
- no monthly automatic refresh exists.
- no scheduler/background batch AI refresh exists.
- explicit refresh uses the existing claim/lease-style row lifecycle.
- concurrent refresh requests cannot both win the completed-row claim because the update requires `status = completed`.

## J. PURCHASE / PAID REPORT SAFETY

Refresh code does not query or mutate:

- orders;
- purchases;
- entitlements;
- payment records;
- refund workflows;
- paid reports.

Recommendation recalculation remains purchase-independent. Historical paid reports remain immutable and are not invalidated by current evaluation period changes.

## K. FILES CHANGED

- `app/lib/freeAnalysisResults/server.ts`
  - opt-in period refresh claim;
  - stale state result;
  - current-period summary freshness metadata;
  - previous content preservation.
- `app/api/analyze/route.ts`
  - stale analysis request returns explicit refresh metadata instead of auto-claiming.
- `app/api/free-analysis/[profileId]/route.ts`
  - stale content remains readable with freshness metadata.
- `app/api/free-analysis/[profileId]/retry-main-analysis/route.ts`
  - stale payload cannot use main-analysis-only retry.
- `app/api/free-analysis/[profileId]/refresh/route.ts`
  - explicit authenticated refresh endpoint.
- `app/api/guest-free-analysis/route.ts`
  - stale guest content is not presented as current.
- `app/api/guest-free-analysis/retry-main-analysis/route.ts`
  - stale guest retry is rejected.
- `app/api/mypage/summary/route.ts`
  - current evaluation context supplied for status derivation.
- `scripts/free-analysis-explicit-refresh-regression.ts`
  - explicit refresh and read-path side-effect contract regression.
- `STEP_11B_CACHE_2_EXPLICIT_FREE_ANALYSIS_REFRESH_REPORT.md`
  - this report.

No catalog, pricing, V4/calibration, checkout, payment, refund, entitlement, account lifecycle, or My Page visual redesign files were changed.

## L. TESTS

Added:

```text
scripts/free-analysis-explicit-refresh-regression.ts
```

Coverage:

- same-period read remains current;
- stale read is side-effect free;
- explicit refresh is the only period-refresh claim path;
- refresh regenerates and persists a complete response;
- refresh failure preserves old content;
- current refresh is a no-op;
- duplicate refresh uses existing lifecycle protection;
- purchase/entitlement/paid-report independence;
- no scheduler/background refresh path.

Existing `scripts/free-result-period-freshness-regression.ts` remains in place.

## M. EXECUTABLE RESULTS

The following commands were issued:

```text
npx.cmd tsx scripts/free-analysis-explicit-refresh-regression.ts
npx.cmd tsx scripts/free-result-period-freshness-regression.ts
npx.cmd tsc --noEmit --pretty false
npm run build
git diff --check
```

The Copilot terminal returned no observable stdout or exit status. Therefore executable PASS is not claimed for these commands.

Editor diagnostics reported no errors for the touched implementation, routes, and regressions.

## N. REMAINING STEP 11 GAPS

- STEP 12 must add the actual stale/current/generating/failed presentation controls without moving ranking logic into the UI.
- Read-only stale response is available, but browser E2E of the refresh button is not included in CACHE-2.
- Guest stale handling is rejection/re-request rather than a guest history refresh experience.
- Existing free-result persistence still stores fixed and period content together; whole-response refresh was intentionally selected.
- Pricing regression conflicts remain unrelated and untouched.

`STALE GET AUTO-REGENERATES: NO`

`MY PAGE LOAD TRIGGERS AI: NO`

`RESULT PAGE LOAD TRIGGERS AI: NO`

`BACKGROUND MONTHLY AI REFRESH: NO`

`STALE RESULT REMAINS VIEWABLE BEFORE REFRESH: YES`

`USER EXPLICIT REFRESH REQUIRED: YES`

`EXPLICIT REFRESH REGENERATES TOP3: YES`

`DUPLICATE REFRESH GENERATION BLOCKED: PASS`

`PURCHASE/ENTITLEMENT MUTATED BY REFRESH: NO`

`PAID REPORT MUTATED BY REFRESH: NO`

`READY TO COMPLETE STEP 11: YES`

`STEP 12 STARTED: NO`

`STEP 13 STARTED: NO`
