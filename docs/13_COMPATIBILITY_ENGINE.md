# Compatibility Engine

## Status

This document defines the deterministic foundation for the future `전문 분석 > 궁합` product.

The current phase is **engine foundation + domain aggregation + personal-structure adjustment only**. It does not add a customer-facing menu, product, checkout item, recommendation candidate, or paid-report route.

## Product principle

Compatibility must not be generated from an unconstrained AI prompt.

The intended pipeline is:

```text
Person A saju calculation
        \
         -> deterministic relationship evidence
         -> domain aggregation
         -> personal-structure adjustment
         -> timing layer
         -> structured report data
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

5. **Directional cross-chart 십성**

A -> B and B -> A are stored separately because the relationship experience is directional.

### Position strength

Position strength is stored as evidence salience, not as a final compatibility score.

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

These are Unboda engine calibration values. They are not presented as one universally accepted traditional-myeongri formula.

## Phase 2: relationship-domain aggregation

Implemented in `app/lib/compatibilityDomainAggregation.ts`.

Phase 2 converts Phase 1 evidence into five separate internal domains:

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
- `mixed` — evidence that can create activation and friction at the same time
- `context` — descriptive evidence such as directional 십성 that does not manufacture a positive/negative judgment by itself

This prevents a rule such as `충 = bad` or `합 = good` from becoming the whole result.

### Internal domain result

Each domain may expose an internal 0-100 balance score plus one of:

- `supportive`
- `steady`
- `mixed`
- `adjustment_needed`
- `insufficient_evidence`

The score remains an internal engine value and is not combined into one compatibility total.

Each domain also stores confidence, all contributing evidence IDs, and up to three leading signals for each pressure channel.

## Phase 3: personal-structure adjustment

Implemented in `app/lib/compatibilityPersonalStructure.ts`.

Phase 3 answers a different question from Phase 1 and 2:

> When this specific partner's element distribution reaches this specific person, is that influence structurally supportive, burdensome, or mixed for that receiver?

The answer is directional. `A receives B` and `B receives A` are calculated independently.

### Existing Unboda engines are reused

For each person, Phase 3 reuses the existing deterministic calculations rather than inventing a new compatibility-only version of myeongri logic:

1. `calculateWeightedElements`
   - weighted five-element distribution including the existing branch / hidden-stem weights

2. `calculateStrength`
   - day-master support versus opposing balance
   - 매우 신강 / 신강 / 중화 / 신약 / 매우 신약

3. `analyzeYongshin`
   - strength direction
   - current five-element balance
   - seasonal effect
   - climate adjustment
   - passage / mediation adjustment
   - excess-element penalty

This means the compatibility layer does **not** use the shortcut:

```text
missing element -> partner has that element -> automatically good
```

Instead it uses:

```text
receiver-specific usefulness of the element
x
partner's actual weighted supply of that element
=
directional structural influence
```

### Directional element influence

For every one of the five elements, the engine stores:

- partner/provider share
- receiver's own current share
- receiver-specific normalized usefulness score
- signed preference from -1 to +1
- support contribution
- burden contribution
- neutral contribution

An element with a low natal share can still create burden if the receiver's existing strength / yongshin structure ranks that element as low usefulness.

Conversely, a relatively abundant element can still remain useful if the receiver's structural calculation ranks it highly.

### Directional structure result

Each direction exposes:

- `balanceScore` — internal directional structure balance only
- `supportive | mixed | burdensome | neutral`
- confidence
- support pressure
- burden pressure
- neutral pressure
- all five element contributions
- up to three leading support elements
- up to three leading burden elements

This is **not an overall compatibility score**. It describes only how one person's weighted element supply interacts with the other person's personal structure.

### Phase 2 domain scores are intentionally not rewritten

Phase 3 does not silently modify the Phase 2 communication / conflict / recovery / intimacy / long-term scores.

The two layers represent different evidence families:

```text
traditional cross-chart relations -> Phase 2 domain balance
personal weighted structure -> Phase 3 directional influence
```

They remain separate and auditable so the future report contract can explain both without double-counting the same signal.

## Mixed evidence is preserved

The engine deliberately does not collapse every relation into `good` or `bad`.

For example, a pair can simultaneously contain supportive combination evidence, tension evidence, and a partner element supply that is burdensome for one receiver but supportive for the other.

The target model is:

```text
cross-chart support/tension/mixed/context
+
directional personal-structure influence
-> structured relationship interpretation
```

not:

```text
positive count - negative count -> one compatibility score
```

## Unknown birth time

Compatibility remains usable when one or both people do not know birth time.

Rules:

- never invent or substitute a noon/midnight hour pillar
- omit hour-derived evidence and weighted-element input completely
- expose deterministic data completeness
- both known hours: `full`
- one or both unknown hours: `standard`
- confidence cannot exceed the completeness contract

The current completeness score uses 8 possible pillar slots across two people. Year/month/day are required; hour is optional.

## Explicitly not implemented yet

The following are intentionally deferred:

1. daeun and seun relationship timing
2. customer-visible compatibility labels or scores
3. structured AI report prompt and output contract
4. database persistence
5. pricing, checkout, product registry entry, recommendation integration
6. `전문 분석` customer UI

## Planned sequence

### Phase 1 — deterministic evidence foundation

Implemented.

### Phase 2 — domain aggregation

Implemented internally.

### Phase 3 — personal-structure adjustment

Implemented internally. Weighted element balance, strength, and yongshin are now reused to calculate partner influence in both directions without the `missing element = automatically good` shortcut.

### Phase 4 — timing layer

Add current daeun/seun interaction separately from natal compatibility. Basic compatibility, personal-structure influence, and current relationship timing must remain distinguishable.

### Phase 5 — structured compatibility report contract

Create the JSON contract consumed by the explanation model. The model must be constrained to supplied evidence and structure results.

### Phase 6 — 전문 분석 UI and product flow

Only after the engine contract is stable:

- add `전문 분석` hub
- expose 궁합 first
- select my stored profile
- enter or temporarily use partner birth data
- support unknown partner birth time
- generate report
- later connect pricing/payment/recommendations

Until Phase 6, this engine remains non-customer-facing and does not change the currently reviewed Toss payment catalog.
