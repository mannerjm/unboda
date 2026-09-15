# Compatibility Engine

## Status

This document defines the deterministic foundation for the future `전문 분석 > 궁합` product.

The current phase is **engine foundation + internal domain aggregation only**. It does not add a customer-facing menu, product, checkout item, recommendation candidate, or paid-report route.

## Product principle

Compatibility must not be generated from an unconstrained AI prompt.

The intended pipeline is:

```text
Person A saju calculation
        \
         -> deterministic relationship evidence -> domain aggregation -> personal-structure adjustment -> structured report data
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

## Phase 2: relationship-domain aggregation

Implemented in `app/lib/compatibilityDomainAggregation.ts`.

Phase 2 converts Phase 1 evidence into five separate internal result domains:

- `communication`
- `conflict`
- `recovery`
- `intimacy`
- `long_term`

There is deliberately **no overall compatibility score**.

### Four pressure channels

Every domain retains evidence in four separate channels:

- `support` — supportive relationship evidence
- `tension` — tension-producing evidence
- `mixed` — evidence that can create both activation and friction and must not be forced positive/negative
- `context` — descriptive relationship evidence such as directional 십성 that is retained for interpretation but does not by itself manufacture a positive/negative judgment

This prevents a rule such as `충 = bad` or `합 = good` from becoming the whole result.

### Internal domain score

An internal 0-100 balance score is allowed only at the individual-domain level.

The score is derived from support versus tension, while mixed pressure remains in the denominator and therefore reduces polarity. Context pressure does not move the score.

Examples:

```text
support only -> high domain balance

tension only -> low domain balance

mixed only -> neutral internal balance + mixed classification

context only -> no score / insufficient directional evidence
```

These scores are engine values for stable downstream behavior. They are not currently customer-visible and are not combined into one total compatibility score.

### Domain levels

Each domain resolves to one of:

- `supportive`
- `steady`
- `mixed`
- `adjustment_needed`
- `insufficient_evidence`

`mixed` takes precedence when mixed pressure is substantial or when meaningful support and tension coexist near the middle. This is intentional: conflicting signals must remain visible instead of being averaged away.

### Evidence-to-domain salience

Phase 2 applies domain-specific salience on top of Phase 1 position strength.

Examples:

- 육합 contributes most strongly to intimacy, then recovery and long-term stability
- 충 contributes to communication and conflict as mixed pressure
- 형 contributes to conflict and long-term tension
- 해 contributes to communication and conflict tension
- 파 contributes to recovery and long-term mixed pressure
- completed 삼합 contributes to recovery and long-term support
- 천간합 contributes to communication and intimacy support
- directional 일간 오행 and cross-chart 십성 remain comparatively light contextual signals at this stage

The exact values are Unboda engine calibration values, not claims of one universally accepted traditional weighting formula.

### Confidence is separate from balance

Each domain also gets a 0-1 confidence value.

Confidence depends on:

1. how much weighted evidence is available for the domain
2. the Phase 1 data-completeness score

Missing birth time therefore lowers confidence. It does not rewrite identical existing evidence into a different balance judgment.

### Auditable leading signals

Each domain stores:

- all contributing evidence ids
- up to three strongest support signals
- up to three strongest tension signals
- up to three strongest mixed signals
- up to three strongest context signals

This is required for the later structured report layer so the explanation model can say *why* a domain was classified a certain way without inventing reasons.

## Mixed evidence is preserved

The engine deliberately does not collapse every relation into `good` or `bad`.

For example, 寅-亥 can produce both combination and break evidence under the current rule registry. Both remain in the evidence set and Phase 2 can retain support and mixed pressure simultaneously in the relevant domains.

This is a core design requirement:

```text
support + tension + mixed + context -> domain-specific interpretation
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
- domain confidence reflects the reduced completeness

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

1. element-balance adjustment using each person's full weighted element structure

2. useful-element / unfavorable-element interaction

3. strength/weakness load adjustment

4. daeun and seun relationship timing

5. customer-visible compatibility labels or scores

6. AI report prompt

7. database persistence

8. pricing, checkout, product registry entry, recommendation integration

9. `전문 분석` customer UI

## Planned sequence

### Phase 1 — deterministic evidence foundation

Implemented.

### Phase 2 — domain aggregation

Implemented internally. Evidence is now separated into communication, conflict, recovery, intimacy, and long-term domains while preserving support/tension/mixed/context channels.

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
