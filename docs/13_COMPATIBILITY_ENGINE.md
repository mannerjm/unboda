# Compatibility Engine

## Status

This document defines the deterministic foundation for the future `전문 분석 > 궁합` product.

The current phase includes **deterministic relationship evidence, domain aggregation, personal-structure adjustment, and current timing analysis**. It still does not add a customer-facing menu, product, checkout item, recommendation candidate, or paid-report route.

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
         -> structured report data
        /
Person B saju calculation

structured report data -> AI explanation
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

Phase 4 keeps basic natal compatibility separate from current timing. It answers:

> Given the already-calculated current daeun and seun for both people, what relationship pressure is active in the supplied evaluation year?

### Timing input contract

The timing layer accepts an explicit `evaluationYear` and optional current-cycle ganji for each person:

```text
A.daeunGanji
A.seunGanji
B.daeunGanji
B.seunGanji
```

The layer intentionally does **not** call the system clock and does not calculate a hidden current date. The caller must supply the evaluation year and current cycles from the existing Unboda fortune calculations.

This keeps repeated runs deterministic and prevents a report generated later from silently changing because server time changed.

### Hangul / Hanja normalization

Existing Unboda daeun and seun modules use Korean ganji such as `갑자`, while compatibility natal pillars use Hanja such as `甲子`.

Phase 4 accepts either form and normalizes both to one Hanja contract before analysis.

### Individual timing load

For each person, current daeun and seun stem / branch elements are evaluated against that person's Phase 3 yongshin usefulness scores.

This produces separate current-period values for:

- support pressure
- burden pressure
- neutral pressure
- internal timing balance
- timing level
- confidence

The existing Phase 3 `scoreCompatibilityElementSupply` rule is reused, so a current-cycle element is not treated as beneficial merely because it is scarce in the natal chart.

Daeun and seun remain distinct horizons. Seun has greater short-term timing salience, while daeun provides broader background pressure.

### Cycle-to-partner natal activation

Each supplied current cycle is compared with the other person's natal branches.

Target-position salience follows the same product principle used elsewhere:

- day branch strongest
- month next
- hour and year lower

The timing layer reuses the existing `fortuneRelations` rules for:

- 합
- 충
- 형
- 파
- 해

Multiple simultaneous relations remain multiple evidence items. For example, a relation that qualifies for both 합 and 파 is not forced into only one category.

### Same-horizon cycle alignment

When both people have current daeun, the two daeun branches are compared.

When both people have current seun, the two seun branches are compared.

This captures whether the pair is experiencing a broadly supportive, activating, or pressured relationship environment at the same horizon without mixing natal compatibility and current timing into one number.

### Relationship timing domains

Cross-person timing evidence is aggregated separately into the same five domains:

- communication
- conflict
- recovery
- intimacy
- long-term stability

These are exposed as `relationshipTimingDomains`, not as replacements for the natal Phase 2 domains.

A timing domain may expose an internal balance score and one of:

- `supportive`
- `steady`
- `mixed`
- `adjustment_needed`
- `insufficient_evidence`

There is still no total compatibility score.

### Pair timing pattern

The two individual timing loads are summarized only as a coarse state:

- `mutually_supported`
- `jointly_pressured`
- `asymmetric`
- `mixed`
- `insufficient`

This is a timing-state label, not a prediction that a relationship will succeed or fail.

### Timing data completeness

There are four possible timing slots across the pair:

```text
A daeun
A seun
B daeun
B seun
```

The engine exposes timing completeness independently from natal completeness:

- all four: `full`
- two or three: `partial`
- one: `limited`
- zero: `unavailable`

Missing current cycles are never synthesized.

This is particularly important when a partner's birth time is unknown and an exact current daeun cannot be safely resolved. Available seun or other current-cycle data may still be analyzed without inventing the missing layer.

## Separation of evidence families

The final engine architecture now intentionally keeps four families distinct:

```text
Phase 1: raw natal relationship evidence
Phase 2: natal relationship domains
Phase 3: directional personal-structure influence
Phase 4: current relationship timing
```

A future report can explain all four, but they must not be double-counted into one opaque score.

## Explicitly not implemented yet

The following are intentionally deferred:

1. structured compatibility report contract for the explanation model
2. customer-visible compatibility wording and report sections
3. database persistence for compatibility reports / temporary partner data
4. pricing, checkout, product registry entry, recommendation integration
5. `전문 분석` customer UI

## Planned sequence

### Phase 1 — deterministic evidence foundation

Implemented.

### Phase 2 — domain aggregation

Implemented.

### Phase 3 — personal-structure adjustment

Implemented.

### Phase 4 — timing layer

Implemented internally. Current daeun / seun are accepted as explicit calculated inputs, personal timing load is evaluated against the existing yongshin structure, and cross-person timing evidence remains separate from natal compatibility.

### Phase 5 — structured compatibility report contract

Create the JSON contract consumed by the explanation model. The model must be constrained to supplied natal, structural, and timing evidence and must not invent relationship events or future outcomes.

### Phase 6 — 전문 분석 UI and product flow

Only after the engine contract is stable:

- add `전문 분석` hub
- expose 궁합 first
- select my stored profile
- enter or temporarily use partner birth data
- support unknown partner birth time
- calculate available current timing without filling missing inputs
- generate report
- later connect pricing/payment/recommendations

Until Phase 6, this engine remains non-customer-facing and does not change the currently reviewed Toss payment catalog.
