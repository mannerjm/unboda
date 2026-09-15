# Compatibility Engine

## Status

This document defines the deterministic foundation and first customer flow for `전문 분석 > 궁합`.

Phases 1-5 provide **deterministic relationship evidence, domain aggregation, personal-structure adjustment, current timing analysis, and a structured report contract**. Phase 6 now exposes that stack through a member-only customer flow.

Phase 6 still does **not** add compatibility to the current paid product registry, Toss checkout catalog, recommendation scoring, or purchased-analysis persistence.

## Product principle

Compatibility must not be generated from an unconstrained AI prompt.

The intended pipeline is:

```text
Person A saju calculation
        \
         -> deterministic relationship evidence
         -> domain aggregation
         -> personal-structure adjustment
         -> current daeun / seun timing layer
         -> closed report evidence context
         -> structured report contract
        /
Person B saju calculation

structured report contract -> AI explanation -> runtime validation -> customer report
```

AI is an explanation layer. It must not invent compatibility evidence that is absent from deterministic engine output.

## Phase 1 — deterministic evidence foundation

Implemented in `app/lib/compatibilityEngine.ts`.

The engine receives already-calculated natal pillars for both people and creates auditable relationship evidence from:

- directional day-stem element relationship
- heavenly-stem combinations
- branch 육합 / 충 / 형 / 해 / 파
- completed cross-chart 삼합
- directional cross-chart 십성

A -> B and B -> A remain separate where direction matters.

Birth time is optional. An unknown hour is omitted; noon or midnight is never synthesized.

## Phase 2 — relationship-domain aggregation

Implemented in `app/lib/compatibilityDomainAggregation.ts`.

Natal relationship evidence is aggregated into five separate internal domains:

- `communication`
- `conflict`
- `recovery`
- `intimacy`
- `long_term`

Each domain preserves four channels:

- `support`
- `tension`
- `mixed`
- `context`

There is deliberately no overall compatibility score. A clash is not automatically converted into `bad`, and conflicting evidence is not deleted merely to create a single answer.

## Phase 3 — personal-structure adjustment

Implemented in `app/lib/compatibilityPersonalStructure.ts`.

Phase 3 reuses the existing Unboda calculations for each person:

- `calculateWeightedElements`
- `calculateStrength`
- `analyzeYongshin`

This layer asks whether the partner's actual weighted element supply is supportive, burdensome, or mixed **for that specific receiver**.

The result is directional:

```text
A receives B
B receives A
```

A missing element is not an automatic compatibility bonus. Direction is determined from the receiver's existing strength / yongshin usefulness calculation. Natal scarcity is retained as context only.

Phase 2 domain results are not rewritten by Phase 3. Traditional cross-chart relations and personal weighted-structure influence remain separate evidence families.

## Phase 4 — current relationship timing

Implemented in `app/lib/compatibilityTiming.ts`.

Phase 4 keeps basic natal compatibility separate from current timing. It accepts an explicit evaluation year plus already-calculated current daeun / seun values for both people.

The layer intentionally does not call the system clock and does not fill a missing current cycle.

It calculates:

- each person's current timing load against that person's existing usefulness structure
- current cycle -> partner natal branch interaction
- same-horizon daeun -> daeun and seun -> seun alignment
- separate timing-domain pressure for communication / conflict / recovery / intimacy / long-term stability
- a coarse pair timing state without creating one total compatibility score

Hangul and Hanja ganji normalize to one deterministic internal representation.

Natal compatibility, personal-structure influence, and current timing remain separate evidence families.

## Phase 5 — structured compatibility report contract

Implemented in `app/lib/compatibilityReportContract.ts`.

Phase 5 defines what evidence the explanation model is allowed to see, what JSON it must return, and how returned output is validated before it becomes customer-facing content.

### Closed evidence context

`buildCompatibilityReportContext()` converts Phase 1-4 output into a closed list of report facts.

The six report evidence families are:

- `natal_domain`
- `natal_relation`
- `personal_structure`
- `timing_load`
- `timing_domain`
- `timing_relation`

Every fact gets a stable report evidence ID.

The context exposes `allowedEvidenceRefs`, and the model is required to reference only those IDs. Unknown references fail validation.

The model does not receive names or a free-form relationship story from which it can invent facts. A is fixed as the user and B as the partner only as an internal role contract.

### Customer report order

The report contract fixes the intended customer reading order:

```text
relationshipCore
-> strengths
-> conflict
-> recovery
-> longTerm
-> currentTiming
-> actionGuide
```

Conceptually this corresponds to:

```text
관계 핵심
-> 잘 맞는 부분
-> 갈등
-> 회복
-> 장기 관계
-> 현재 시기
-> 실제 행동 기준
```

`strengths` is allowed to be empty. The model must not manufacture positive copy merely because the screen has a positive-sounding section name.

### Runtime output schema

`CompatibilityReportOutputSchema` constrains the explanation model to the fixed report structure.

Each substantive section must include `evidenceRefs`.

The runtime validator rejects:

- unknown evidence IDs
- natal sections that rely on timing-only evidence
- current-timing sections that rely on natal-only evidence
- current timing text when timing data is unavailable
- missing current timing text when timing data exists
- customer-visible numeric compatibility scores / percentages
- deterministic relationship claims such as guaranteed marriage or breakup
- internal A/B role labels and selected engine-state labels in customer prose

### Natal and timing claims cannot be blended silently

The following sections may use only natal / structure evidence:

- relationship core
- strengths
- conflict
- recovery
- long-term relationship

The `currentTiming` section may use only timing evidence.

Action guidance can cite either family because an action can be motivated by both stable relationship structure and current-period pressure.

This separation is intentional. A temporary pressured year must not be rewritten as a bad basic compatibility result, and a stable natal relationship must not erase current timing stress.

### Data completeness behavior

Natal completeness and timing completeness remain separate inputs to the report context.

If timing data is `unavailable`, `currentTiming` must be `null`.

If timing data is partial or limited, the model may describe only the supplied timing evidence and must lower certainty rather than fill missing daeun / seun values.

### Explanation prompt contract

`buildCompatibilityReportPrompt()` produces a provider-independent system/user prompt pair.

The prompt explicitly prohibits:

- new calculations
- invented evidence IDs
- one overall compatibility score
- exposing internal confidence / pressure / usefulness numbers as customer claims
- guaranteed future outcomes
- using technical myeongri vocabulary as the center of the explanation
- creating dates or timing outside the supplied evaluation year

## Phase 6 — 전문 분석 customer flow

Implemented through:

- `app/special-analysis/page.tsx`
- `app/special-analysis/compatibility/page.tsx`
- `app/components/CompatibilityAnalysisClient.tsx`
- `app/api/special-analysis/compatibility/route.ts`
- `app/lib/compatibilityCustomerInput.ts`
- `app/lib/compatibilityReportService.ts`

### Discovery and access

The shared application navigation now exposes `전문 분석` as a top-level destination. The professional-analysis hub currently exposes only `궁합 분석`; future engines are not shown as unusable placeholder cards.

Compatibility is member-only and uses the user's current active profile as Person A.

### Partner input and privacy boundary

Person B is entered for the current request with:

- a local display label
- birth date
- known / unknown birth-time state
- gender
- solar / lunar calendar
- leap-month state where applicable

The endpoint does not persist this partner input to a profile or compatibility-report table in Phase 6. Raw partner birth data is not included in the report explanation context; the model receives the closed calculated evidence context from Phase 5.

### Unknown partner birth time

No default noon value is inserted.

For an unknown partner birth time, the adapter calculates the date at all 24 hours and verifies that year / month / day pillars are stable across the day. If those date pillars are not stable, the request fails closed and asks for a known birth time rather than guessing.

When the date pillars are stable:

- year / month / day pillars may be used
- hour pillar remains `null`
- partner daeun remains unavailable because it cannot be safely resolved without time
- the current seun may still be calculated from the stable day stem and explicit evaluation year

The report UI explicitly tells the customer when this reduced scope applies.

### Explicit current-date boundary

The customer API resolves an explicit Korean service date (`Asia/Seoul`) and passes that date / year into the existing saju and compatibility timing calculations. Phase 4 itself remains free from a hidden system-clock dependency.

### Explanation generation and validation

`compatibilityReportService.ts` sends only the Phase 5 closed context and output contract through the existing bounded customer-facing generation lane, then runs `validateCompatibilityReportOutput()` before anything is returned to the browser.

The UI never renders internal evidence IDs.

### Payment boundary

Phase 6 is intentionally **not** a paid product integration yet.

It does not:

- add a compatibility product ID to the current premium registry
- add or change a Toss checkout item
- change current paid prices
- insert compatibility into recommendation scoring
- store the generated report in purchased analyses

Those decisions belong to a separate paid-product / entitlement phase after the customer flow and Toss-review impact are explicitly approved.

## Separation of evidence families

The architecture intentionally keeps the following layers distinguishable:

```text
Phase 1: raw natal relationship evidence
Phase 2: natal relationship domains
Phase 3: directional personal-structure influence
Phase 4: current relationship timing
Phase 5: closed explanation context + validated report contract
Phase 6: temporary customer input -> engine -> validated report UI
```

The report can explain all of them, but they must not be double-counted into one opaque score.

## Deferred work

The following are intentionally deferred:

1. compatibility pricing / entitlement
2. Toss checkout / product registry integration
3. compatibility report persistence and purchased-analysis history
4. recommendation integration
5. saved partner / relationship profiles
6. request throttling appropriate for a paid or quota-controlled launch

## Planned sequence

### Phase 1 — deterministic evidence foundation

Implemented.

### Phase 2 — domain aggregation

Implemented.

### Phase 3 — personal-structure adjustment

Implemented.

### Phase 4 — timing layer

Implemented.

### Phase 5 — structured compatibility report contract

Implemented.

### Phase 6 — 전문 분석 UI and customer flow

Implemented as a member-only, non-persisted compatibility flow. Payment/catalog integration remains intentionally separate.
