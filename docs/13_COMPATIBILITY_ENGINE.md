# Compatibility Engine

## Status

This document defines the deterministic foundation for the future `전문 분석 > 궁합` product.

The current phase includes **deterministic relationship evidence, domain aggregation, personal-structure adjustment, current timing analysis, and a structured report contract for the explanation model**.

It still does not add a customer-facing menu, product, checkout item, recommendation candidate, database report persistence, or paid-report route.

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

structured report contract -> AI explanation -> runtime validation
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

Phase 5 does **not** generate a report by itself. It defines what evidence the future explanation model is allowed to see, what JSON it must return, and how returned output is validated before it can become customer-facing content.

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

Timing report facts also avoid passing unnecessary raw ganji into the explanation context once the deterministic engine has already resolved the relationship signal.

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

`buildCompatibilityReportPrompt()` produces a provider-independent system/user prompt pair but does not call OpenAI or another model.

The prompt explicitly prohibits:

- new calculations
- invented evidence IDs
- one overall compatibility score
- exposing internal confidence / pressure / usefulness numbers as customer claims
- guaranteed future outcomes
- using technical myeongri vocabulary as the center of the explanation
- creating dates or timing outside the supplied evaluation year

Phase 5 therefore keeps the future AI call replaceable while preserving one deterministic validation boundary.

## Separation of evidence families

The architecture now intentionally keeps the following layers distinguishable:

```text
Phase 1: raw natal relationship evidence
Phase 2: natal relationship domains
Phase 3: directional personal-structure influence
Phase 4: current relationship timing
Phase 5: closed explanation context + validated report contract
```

The report can explain all of them, but they must not be double-counted into one opaque score.

## Explicitly not implemented yet

The following are intentionally deferred:

1. actual AI-provider call for compatibility report generation
2. customer-visible compatibility report UI
3. database persistence for compatibility reports / temporary partner data
4. pricing, checkout, product registry entry, recommendation integration
5. `전문 분석` customer UI and partner-entry flow

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

Implemented internally. The future explanation model receives a closed evidence context, must return the fixed JSON structure with evidence references, and its output must pass runtime grounding and customer-safety validation.

### Phase 6 — 전문 분석 UI and product flow

Only after the engine contract is stable:

- add `전문 분석` hub
- expose 궁합 first
- select my stored profile
- enter or temporarily use partner birth data
- support unknown partner birth time
- calculate available current timing without filling missing inputs
- generate and validate the structured compatibility report
- later connect pricing/payment/recommendations

Until Phase 6, this engine remains non-customer-facing and does not change the currently reviewed Toss payment catalog.
