# Compatibility Engine

## Status

This document defines the deterministic foundation for the future `전문 분석 > 궁합` product.

The current phase is **engine foundation only**. It does not add a customer-facing menu, product, checkout item, recommendation candidate, or paid-report route.

## Product principle

Compatibility must not be generated from an unconstrained AI prompt.

The intended pipeline is:

```text
Person A saju calculation
        \
         -> deterministic relationship evidence -> domain aggregation -> structured report data
        /
Person B saju calculation

structured report data -> AI explanation
```

AI is an explanation layer. It must not invent compatibility evidence that is absent from the deterministic engine output.

## Phase 1: deterministic evidence foundation

Implemented in `app/lib/compatibilityEngine.ts`.

Input uses already-calculated four-pillar ganji values for each person:

- year pillar
- month pillar
- day pillar
- hour pillar when known

The engine intentionally does not accept names or other personally identifying display data.

### Evidence currently calculated

1. **Directional day-stem element relationship**
   - same
   - generate
   - generated_by
   - control
   - controlled_by

   A -> B and B -> A are stored separately because relationship experience is directional.

2. **Heavenly-stem combinations**
   - 甲己
   - 乙庚
   - 丙辛
   - 丁壬
   - 戊癸

3. **Earthly-branch relationships**
   - 육합
   - 충
   - 형, including supported self-punishment cases
   - 해
   - 파

4. **Completed 삼합 across the two charts**
   - 申子辰 -> 수
   - 亥卯未 -> 목
   - 寅午戌 -> 화
   - 巳酉丑 -> 금

   A full 삼합 is recorded only when both charts contribute at least one member. A 삼합 contained entirely inside one person's chart is not compatibility evidence.

5. **Directional cross-chart 십성**

   Person A's day stem is used to interpret Person B's stems, and the reverse direction is calculated independently.

### Position strength

Position strength is stored as evidence salience, not as a final compatibility score.

Current contract:

| Cross position | Strength |
| --- | ---: |
| day-day | 1.00 |
| month-month | 0.75 |
| day-month | 0.70 |
| day-hour | 0.60 |
| hour-hour | 0.55 |
| day-year | 0.50 |
| month-hour | 0.50 |
| year-year | 0.40 |
| month-year | 0.40 |
| year-hour | 0.35 |

These are Unboda engine weights for consistent interpretation. They are not presented to customers as an absolute traditional-myeongri formula.

## Mixed evidence is preserved

The engine deliberately does not collapse every relation into `good` or `bad`.

For example, 寅-亥 can produce both combination and break evidence under the current rule registry. Both remain in the evidence set. A later aggregation layer must explain mixed signals by domain rather than deleting one side.

This is a core design requirement:

```text
support evidence + tension evidence -> domain-specific interpretation
```

not:

```text
positive count - negative count -> one compatibility score
```

## Unknown birth time

Compatibility must remain usable when one or both people do not know their birth time.

Rules:

- never invent or substitute a noon/midnight hour pillar
- omit hour-derived evidence completely
- expose deterministic data completeness
- both known hours: `full`
- one or both unknown hours: `standard`

The current completeness score uses 8 possible pillar slots across two people. Year/month/day are required; hour is optional.

## Evidence shape

Every relationship signal records:

- stable evidence id
- evidence kind
- traditional relation label where relevant
- support/tension/mixed/context tone
- positional strength
- affected interpretation domains
- exact A/B pillar components that generated the evidence
- optional metadata such as direction, element, observer, or completed 삼합

This makes future explanations auditable and keeps repeated runs deterministic.

## Explicitly not implemented yet

The following are intentionally deferred to later phases:

1. domain aggregation and scoring
   - communication
   - conflict
   - recovery
   - intimacy
   - long-term stability

2. element-balance adjustment using each person's full weighted element structure

3. useful-element / unfavorable-element interaction

4. strength/weakness load adjustment

5. daeun and seun relationship timing

6. customer-visible compatibility labels or scores

7. AI report prompt

8. database persistence

9. pricing, checkout, product registry entry, recommendation integration

10. `전문 분석` customer UI

## Planned sequence

### Phase 2 — domain aggregation

Convert evidence into separate relationship domains without producing one simplistic overall score.

### Phase 3 — personal-structure adjustment

Use each person's existing Unboda calculations such as weighted element balance and strength so that partner influence is interpreted in context rather than by `missing element = automatically good` logic.

### Phase 4 — timing layer

Add current daeun/seun interaction separately from natal compatibility. Basic compatibility and current relationship timing must remain distinguishable.

### Phase 5 — structured compatibility report contract

Create the JSON contract consumed by the explanation model. The model must be constrained to supplied evidence.

### Phase 6 — 전문 분석 UI and product flow

Only after the engine contract is stable:

- add `전문 분석` hub
- expose 궁합 first
- select my stored profile
- enter or temporarily use partner birth data
- support unknown partner birth time
- generate report
- later connect pricing/payment/recommendations

Until that phase, this engine remains non-customer-facing and does not change the currently reviewed Toss payment catalog.
