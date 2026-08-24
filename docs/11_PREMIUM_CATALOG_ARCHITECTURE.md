# 50-Topic Premium Catalog Architecture

> **STATUS: Historical Design.** This document is preserved as the original
> Step 4D-70 planning artifact for the TOPIC layer.
>
> **CURRENT PRODUCTION (2026-08-24)**: the actual Launch sales catalog is
> **54 products = TOPIC 47 + PERIOD 7**, defined by `getLaunchProductIds()`
> (`app/lib/paidAnalysisTopicConfig.ts`). The 47-TOPIC breakdown below
> (Career 10 / Money 10 / Relationship 13 / Health 6 / Study 4 / Business 4)
> matches production exactly. The PERIOD side does not: this document
> planned only 3 period products, while production shipped 7
> (`monthly-current`, `monthly-next`, `yearly-current`, `annual-next`,
> `annual-3years`, `daeun-current`, `lifetime-overview`). The historical
> "total 50" below is therefore superseded by the current total of 54.
> Do not read this document as the current catalog contract; use
> `app/lib/premiumCatalog.ts` / `getLaunchProductIds()` for that.

## Scope and Decision

This document is the Step 4D-70 implementation plan. It is not a product registry,
does not activate V4, and does not change existing TopicConfig ownership. The source
of truth for implemented products remains `paidAnalysisTopicConfig.ts`.

Catalog target: 50 paid deep-analysis products.

- Existing launch products: 18
- Proposed products: 32
- Total: 50
- High-overlap closest-sibling pairs: 0

Every topic must produce a decision artifact, not another general saju summary:
evidence -> mechanism -> observable condition -> product implication -> action or
review responsibility.

## Existing Launch Inventory (18)

| ID | Customer-facing job | Domain | Core boundary / action artifact |
|---|---|---|---|
| `career` | 직업운 심층 분석 | Career | workload/responsibility operating structure; workload-priority review |
| `career-job-change` | 이직 결정 분석 | Career | leave/stay/move decision; comparison criteria |
| `career-job-fit` | 직무 적합성 분석 | Career | work-style and environment fit; fit observation sheet |
| `career-specialization` | 전문성 축적 분석 | Career | specialization depth and recognition; proof-asset plan |
| `wealth` | 재물운 심층 분석 | Money | whole financial operating structure; money-operation priority map |
| `money-wealth-accumulation` | 자산 축적 구조 분석 | Money | preservation and accumulation capacity; reserve-allocation review |
| `money-leak-risk` | 돈 새는 구조 분석 | Money | authority/liability/exit exposure; loss-control checklist |
| `money-saving-discipline` | 저축 루틴 분석 | Money | budget-rule continuity; weekly/monthly reset routine |
| `relationship` | 연애·관계 심층 분석 | Relationship | broad recurring relationship operating pattern; relationship-pattern review |
| `relationship-current` | 현재 관계 유지·조정 분석 | Relationship | current state, reciprocity, follow-through, continue/adjust; observation window |
| `relationship-marriage` | 결혼 준비 분석 | Relationship | shared-life readiness; life/role/finance agreement checklist |
| `relationship-partner-pattern` | 파트너 선택 패턴 분석 | Relationship | partner-selection pattern; compatible-pattern comparison |
| `relationship-new-connection` | 새 인연 접근 분석 | Relationship | new-connection opening and screening; early-signal protocol |
| `relationship-intimacy` | 친밀감 속도 분석 | Relationship | intimacy pace and disclosure; pace/boundary agreement |
| `relationship-conflict` | 갈등 수습·재발 분석 | Relationship | trigger -> response -> repair -> recurrence; repair evidence log |
| `relationship-boundary` | 관계 경계 분석 | Relationship | distance/role/permission boundaries; boundary framework |
| `relationship-reunion` | 재연결 판단 분석 | Relationship | separation context and recontact evidence; reconnect/hold matrix |
| `daeun-current` | 현재 대운 분석 | Period | current ten-year transition; transition review framework |

Existing sibling boundaries are already enforced by TopicConfig required insights,
excluded focus, action focus, and prohibited claims. No existing ownership is changed
by this plan. The only material watch point is the broad `relationship` product: it
must remain a portfolio-level relationship-pattern report and not absorb the new
narrow relationship jobs below.

## Proposed Products (32)

Notation used below:

- **Evidence** is the allowed primary evidence family, not a guarantee that every
  response uses every key.
- **Signals** are observable checks, never claimed facts about the customer.
- **Risk** is closest-sibling duplication risk after the listed exclusion is applied.

### Career: six additions

| ID / title | Customer question and exclusive ownership | Closest sibling; explicit exclusion | Four required insights | Evidence -> mechanism; signals; action architecture | Commercial value |
|---|---|---|---|---|---|
| `career-promotion-readiness` / 승진 준비 분석 | What evidence shows readiness for a larger role, and what responsibility gap must be closed first? Owns readiness for **internal advancement**, not changing jobs. | `career-specialization`; excludes skill-depth/portfolio as the main decision and excludes leave/stay. | role-scope gap; leadership evidence; evaluation signal; readiness action | `gyeokguk`, `strength`, `fortune_flow` -> responsibility capacity -> delegated scope, decision ownership, feedback pattern -> role-scope evidence plan. | 15K: promotion readiness checklist. 50K hook: role-evidence scorecard. Risk LOW. |
| `career-workplace-adaptation` / 직장 적응 분석 | What operating conditions make the current workplace sustainable, and what must be adjusted before judging fit? Owns **onboarding/current workplace adaptation**. | `career-job-fit`; excludes whole-job aptitude and job-change decision. | adaptation friction; communication rhythm; role-expectation alignment; adjustment protocol | `strength`, `element_balance`, `fortune_flow` -> energy/expectation mismatch -> handoff clarity, meeting load, feedback cadence -> 30-day adaptation protocol. | 15K: workplace adjustment map. 50K hook: role-environment diagnostic. Risk LOW. |
| `career-leadership-readiness` / 리더십 전환 분석 | What leadership responsibility can be assumed without overload, and how should influence be tested? Owns **leading people**, not promotion outcome. | `career-promotion-readiness`; excludes title/approval prediction. | authority style; delegation risk; feedback loop; leadership experiment | `gyeokguk`, `fortune_brain`, `strength` -> authority/delegation mechanism -> decision bottleneck, team response, follow-up quality -> leadership experiment. | 15K: delegation and feedback protocol. 50K hook: leadership failure-mode map. Risk MEDIUM: both relate to advancement; one owns role approval, the other daily people leadership. |
| `career-freelance-transition` / 프리랜서 전환 분석 | Is an independent-work operating model viable, and what client/control conditions must be proven first? Owns **employment-to-independent transition**. | `career-job-change`; excludes generic move decision and income guarantee. | autonomy-capacity fit; client-boundary risk; pipeline stability signal; transition test | `strength`, `fortune_brain`, `fortune_flow` -> self-directed workload/control -> repeat clients, scope changes, recovery capacity -> paid pilot and exit criteria. | 15K: transition readiness test. 50K hook: client-risk and runway matrix. Risk LOW. |
| `career-workload-recovery` / 업무 과부하 회복 분석 | Which work pattern depletes capacity, and what workload boundary restores sustainable performance? Owns **work-specific capacity recovery**, not medical burnout. | `career`; excludes broad career operating structure and health diagnosis. | overload trigger; recovery deficit; priority conflict; workload reset action | `strength`, `element_balance`, `fortune_flow` -> capacity-demand mismatch -> after-hours spillover, rework, decision fatigue -> workload boundary protocol. | 15K: overload signal and reset checklist. 50K hook: workload scenario planner. Risk LOW. |
| `career-workplace-relationships` / 직장 관계 분석 | Which work interactions improve or drain performance, and what collaboration boundary should be set? Owns **workplace interaction mechanics**. | `relationship`; excludes romance/general social profile and manager-promotion outcome. | stakeholder pattern; conflict-of-role signal; reciprocity in work; collaboration action | `element_relations`, `fortune_brain`, `gyeokguk` -> role/communication mechanism -> request clarity, credit sharing, escalation pattern -> stakeholder boundary plan. | 15K: stakeholder interaction map. 50K hook: role-specific collaboration matrix. Risk LOW. |

### Money: six additions

| ID / title | Customer question and exclusive ownership | Closest sibling; explicit exclusion | Four required insights | Evidence -> mechanism; signals; action architecture | Commercial value |
|---|---|---|---|---|---|
| `money-income-stability` / 수입 안정성 분석 | What makes income volatile or dependable, and what proof should precede a fixed-cost commitment? Owns **income continuity**, not wealth accumulation. | `money-wealth-accumulation`; excludes saving routine and investment choices. | income-volatility mechanism; dependency signal; fixed-cost vulnerability; stability action | `fortune_flow`, `strength`, `fortune_brain` -> income/control mismatch -> source concentration, payment delay, recurring demand -> income-stability review. | 15K: income reliability checklist. 50K hook: source-concentration map. Risk LOW. |
| `money-debt-repayment` / 부채 상환 구조 분석 | Which repayment pressure threatens control, and what review order protects cash flow? Owns **debt obligations**, not legal/loan advice. | `money-leak-risk`; excludes creditor negotiation or borrowing recommendation. | obligation pressure; repayment-priority signal; rollover risk; review action | `strength`, `element_balance`, `fortune_flow` -> payment-pressure mechanism -> due-date clustering, rollover, essential-cost squeeze -> repayment review ladder. | 15K: payment-pressure map. 50K hook: obligation calendar dashboard. Risk LOW. |
| `money-shared-finance` / 공동 재정 경계 분석 | How should shared expenses and financial responsibility be separated to prevent one-sided exposure? Owns **household/partner shared finance**. | `money-leak-risk`; excludes generic contract loss and relationship-continuation judgment. | authority split; liability boundary; change-condition signal; shared-finance action | `element_relations`, `fortune_brain`, `fortune_flow` -> decision/payer mismatch -> approval rights, settlement timing, changed terms -> shared-expense agreement checklist. | 15K: responsibility ledger. 50K hook: shared-finance scenario matrix. Risk MEDIUM: both cover liability; leak-risk owns loss exposure broadly, this owns recurring joint financial governance. |
| `money-contract-commitment` / 계약·고정비 검토 분석 | Which long commitment requires a stop, review, or exit condition before acceptance? Owns **contract and fixed-cost commitment**, not investment advice. | `money-leak-risk`; excludes generic spending habits and actual legal review. | commitment exposure; term-change mechanism; exit signal; review action | `fortune_flow`, `element_relations`, `strength` -> lock-in/control mechanism -> automatic renewal, unilateral change, termination cost -> contract review protocol. | 15K: commitment exit checklist. 50K hook: contract exposure map. Risk MEDIUM: both mention contracts; this owns pre-commitment terms and exit. |
| `money-emergency-buffer` / 비상자금 회복력 분석 | What disruptions would break financial resilience, and what protection order should be reviewed? Owns **shock resilience**, not saving discipline. | `money-wealth-accumulation`; excludes target amounts and product recommendation. | disruption exposure; liquidity signal; support dependency; buffer action | `strength`, `fortune_flow`, `element_balance` -> recovery-capacity mechanism -> unexpected-cost response, liquidity gap, backup support -> resilience review sequence. | 15K: financial shock checklist. 50K hook: disruption scenario map. Risk LOW. |
| `money-spending-decision` / 큰 지출 판단 분석 | What conditions distinguish a necessary major spend from pressure, image, or sunk-cost spending? Owns **one major discretionary decision**. | `money-saving-discipline`; excludes routine budgeting and purchase recommendation. | decision trigger; affordability boundary; sunk-cost signal; pause/review action | `fortune_brain`, `strength`, `fortune_flow` -> urgency/control mechanism -> deadline pressure, rationale change, exit cost -> major-spend decision card. | 15K: purchase decision protocol. 50K hook: scenario comparison matrix. Risk LOW. |

### Relationship: four additions

| ID / title | Customer question and exclusive ownership | Closest sibling; explicit exclusion | Four required insights | Evidence -> mechanism; signals; action architecture | Commercial value |
|---|---|---|---|---|---|
| `relationship-long-distance` / 장거리 관계 운영 분석 | What communication, visit, and expectation conditions make distance sustainable? Owns **distance logistics**, not current relationship verdict. | `relationship-current`; excludes continue/adjust judgment as the primary conclusion. | distance-friction pattern; coordination signal; expectation alignment; operating action | `fortune_flow`, `element_relations`, `strength` -> distance/response mechanism -> scheduling follow-through, contact rhythm, unmet expectation -> distance operating protocol. | 15K: long-distance operating checklist. 50K hook: visit/contact scenario planner. Risk LOW. |
| `relationship-unrequited` / 짝사랑 접근 판단 분석 | What observable reciprocity should precede emotional escalation or disclosure? Owns **one-sided attraction screening**. | `relationship-new-connection`; excludes broad new-connection opening and partner selection. | reciprocity threshold; approach signal; fantasy-risk condition; disclosure action | `fortune_brain`, `strength`, `fortune_flow` -> projection/response mechanism -> initiative balance, follow-up, boundary response -> approach-or-hold protocol. | 15K: reciprocity screening card. 50K hook: staged disclosure matrix. Risk LOW. |
| `relationship-friendship` / 친구 관계 분석 | Which friendship pattern is reciprocal, draining, or worth recalibrating? Owns **non-romantic peer friendship**. | `relationship-boundary`; excludes general boundary framework and current romantic relationship decision. | friendship exchange pattern; reliability signal; emotional labor condition; recalibration action | `element_relations`, `strength`, `fortune_flow` -> reciprocity/role mechanism -> contact initiation, support symmetry, request response -> friendship review framework. | 15K: friendship reciprocity map. 50K hook: social-energy portfolio. Risk LOW. |
| `relationship-family-role` / 가족 역할 경계 분석 | Which family role expectation creates recurring burden, and what role adjustment can be tested safely? Owns **family-role dynamics**. | `relationship-boundary`; excludes generic personal-distance design and medical/family diagnosis. | role expectation pattern; obligation signal; guilt mechanism; family-boundary action | `element_relations`, `gyeokguk`, `strength` -> obligation/role mechanism -> request escalation, unequal caregiving, decision exclusion -> family-role agreement script. | 15K: family-role boundary checklist. 50K hook: responsibility scenario map. Risk LOW. |

### Health and wellbeing: six additions

| ID / title | Customer question and exclusive ownership | Closest sibling; explicit exclusion | Four required insights | Evidence -> mechanism; signals; action architecture | Commercial value |
|---|---|---|---|---|---|
| `health-energy-recovery` / 에너지 회복 리듬 분석 | Which daily demand/recovery pattern erodes energy, and what recovery rhythm should be tested? Owns **energy rhythm**, not diagnosis. | `career-workload-recovery`; excludes work-role overload and medical treatment. | depletion pattern; recovery signal; rhythm mismatch; recovery action | `strength`, `element_balance`, `fortune_flow` -> demand/recovery mechanism -> morning/evening energy, rebound delay, rest response -> recovery rhythm experiment. | 15K: energy log protocol. 50K hook: recovery dashboard. Risk LOW. |
| `health-sleep-rhythm` / 수면 리듬 점검 분석 | What behavioral conditions destabilize sleep rhythm, and what observation loop should be used? Owns **sleep routine observation**, not illness diagnosis. | `health-energy-recovery`; excludes treatment and biological claims. | sleep-disruption pattern; pre-sleep signal; next-day effect; routine action | `element_balance`, `fortune_flow`, `strength` -> activation/rest mechanism -> bedtime drift, wake consistency, next-day recovery -> sleep-rhythm review. | 15K: sleep signal log. 50K hook: rhythm trend dashboard. Risk LOW. |
| `health-stress-regulation` / 스트레스 반응 조절 분석 | Which external demands turn into stress escalation, and what regulation sequence prevents spillover? Owns **stress response sequence**. | `health-burnout-risk`; excludes burnout severity/medical assessment. | stress trigger; escalation signal; regulation resource; response action | `strength`, `element_relations`, `fortune_brain` -> reactivity mechanism -> rumination, irritability, avoidance, recovery delay -> stress interruption protocol. | 15K: trigger-to-regulation map. 50K hook: personal stress failure-mode map. Risk LOW. |
| `health-burnout-risk` / 번아웃 위험 분석 | What cumulative work/life pattern signals burnout risk, and when should load be reduced? Owns **burnout risk observation**, not diagnosis. | `career-workload-recovery`; excludes work-priority redesign as the primary job. | cumulative load; detachment signal; recovery failure; load-reduction action | `strength`, `element_balance`, `fortune_flow` -> cumulative depletion mechanism -> cynicism, reduced efficacy, no-rest rebound -> burnout risk review. | 15K: burnout early-warning checklist. 50K hook: workload/recovery scenario map. Risk MEDIUM: one owns role workload, this owns whole-life cumulative recovery risk. |
| `health-habit-continuity` / 생활 습관 유지 분석 | Why do health-supporting routines break, and what reset condition makes them repeatable? Owns **habit continuity**, not diet/exercise prescription. | `money-saving-discipline`; excludes financial routines and clinical lifestyle advice. | routine-break condition; cue signal; restart friction; reset action | `fortune_brain`, `strength`, `fortune_flow` -> consistency mechanism -> skipped-cue pattern, all-or-nothing reset, environmental friction -> habit reset protocol. | 15K: habit continuity loop. 50K hook: adherence review dashboard. Risk LOW. |
| `health-body-signal-review` / 몸의 신호 점검 분석 | What non-diagnostic body signals should trigger rest, review, or professional consultation? Owns **escalation threshold**, not medical interpretation. | `health-energy-recovery`; excludes diagnosis, treatment, and symptom prognosis. | signal category; persistence condition; safety threshold; review action | `strength`, `element_balance`, `fortune_flow` -> load-awareness mechanism -> persistent fatigue, recovery failure, functional disruption -> rest/review/consultation checklist. | 15K: escalation checklist. 50K hook: symptom-context review log. Risk LOW. |

### Study and learning: four additions

| ID / title | Customer question and exclusive ownership | Closest sibling; explicit exclusion | Four required insights | Evidence -> mechanism; signals; action architecture | Commercial value |
|---|---|---|---|---|---|
| `study-learning-strategy` / 학습 전략 분석 | Which learning method converts effort into retained, applied knowledge? Owns **learning-method fit**. | `career-specialization`; excludes professional-recognition decision. | learning intake pattern; retention signal; application gap; strategy action | `fortune_brain`, `strength`, `element_balance` -> intake/structure mechanism -> recall, explanation, application output -> learning-method experiment. | 15K: study-method comparison card. 50K hook: individualized learning system. Risk LOW. |
| `study-exam-preparation` / 시험 준비 분석 | What review and pressure-management system should be used before a defined exam? Owns **exam execution**, not result prediction. | `study-learning-strategy`; excludes broad method discovery. | preparation gap; practice signal; pressure response; exam action | `fortune_flow`, `fortune_brain`, `strength` -> preparation/pressure mechanism -> mock performance, error pattern, review consistency -> exam readiness protocol. | 15K: exam preparation checklist. 50K hook: milestone and error dashboard. Risk LOW. |
| `study-focus-routine` / 집중 루틴 분석 | What conditions fragment focus, and what observation-based routine restores a work block? Owns **attention operating routine**, not health diagnosis. | `health-habit-continuity`; excludes wellbeing treatment. | distraction trigger; focus signal; recovery interval; routine action | `fortune_brain`, `element_balance`, `strength` -> attention-switching mechanism -> interruption rate, restart delay, output block -> focus routine experiment. | 15K: focus interruption map. 50K hook: concentration dashboard. Risk LOW. |
| `study-credential-decision` / 자격증·유학 판단 분석 | Which credential or study investment deserves commitment, and what proof should precede it? Owns **credential/study commitment decision**, not career move. | `career-specialization`; excludes profession selection and outcome guarantee. | decision purpose; opportunity-cost signal; proof requirement; commit/hold action | `fortune_brain`, `fortune_flow`, `strength` -> commitment/return mechanism -> program relevance, practice use, time burden -> credential decision matrix. | 15K: commitment criteria. 50K hook: opportunity-cost comparison model. Risk LOW. |

### Business: four additions

| ID / title | Customer question and exclusive ownership | Closest sibling; explicit exclusion | Four required insights | Evidence -> mechanism; signals; action architecture | Commercial value |
|---|---|---|---|---|---|
| `business-startup-readiness` / 창업 준비 분석 | What operating proof must exist before starting a business? Owns **startup readiness**, not market-success prediction. | `career-freelance-transition`; excludes solo-work transition and revenue guarantee. | problem/role readiness; capacity signal; commitment risk; pilot action | `fortune_brain`, `strength`, `fortune_flow` -> operating-readiness mechanism -> customer validation, role clarity, capacity buffer -> pilot/hold checklist. | 15K: startup readiness gate. 50K hook: assumption-risk map. Risk LOW. |
| `business-expansion-control` / 사업 확장 통제 분석 | Which expansion condition should be controlled before adding scope, people, or commitments? Owns **scaling control**, not startup launch. | `business-startup-readiness`; excludes launch decision. | expansion trigger; control capacity; failure signal; review action | `fortune_flow`, `strength`, `element_relations` -> scale/control mismatch -> quality drift, approval bottleneck, cash/role strain -> expansion control dashboard. | 15K: expansion stop/go checklist. 50K hook: scaling scenario matrix. Risk LOW. |
| `business-client-relationship` / 고객 관계 분석 | Which client expectation and delivery pattern supports repeatable, bounded work? Owns **client relationship operations**. | `career-workplace-relationships`; excludes employee/colleague dynamics. | expectation gap; scope-change signal; trust mechanism; client action | `fortune_brain`, `element_relations`, `fortune_flow` -> promise/scope mechanism -> change requests, approval lag, repeat order -> client boundary protocol. | 15K: client expectation checklist. 50K hook: client portfolio risk map. Risk LOW. |
| `business-team-management` / 직원·팀 운영 분석 | What team-role and feedback conditions prevent owner dependence and recurring execution failure? Owns **team execution management**. | `career-leadership-readiness`; excludes personal leadership transition. | role clarity; delegation signal; feedback loop; team action | `gyeokguk`, `fortune_brain`, `strength` -> role/feedback mechanism -> decision bottleneck, missed handoff, repeated correction -> team operating cadence. | 15K: team-role checklist. 50K hook: responsibility and handoff dashboard. Risk LOW. |

### Period: two additions

| ID / title | Customer question and exclusive ownership | Closest sibling; explicit exclusion | Four required insights | Evidence -> mechanism; signals; action architecture | Commercial value |
|---|---|---|---|---|---|
| `yearly-current` / 올해 흐름 종합 분석 | What decision themes, opportunity/caution conditions, and review checkpoints define this calendar year? Owns **annual integrated review**, not a domain-specific decision. | `daeun-current`; excludes ten-year identity/transition analysis. | annual theme; seasonal condition; decision checkpoint; yearly review action | `seun`, `fortune_flow`, `element_relations`, `strength` -> annual pressure/opportunity mechanism -> domain changes, calendar checkpoints -> quarterly review framework. | 15K: yearly decision calendar. 50K hook: annual scenario dashboard. Risk LOW. |
| `monthly-next` / 다음 달 흐름 분석 | What short observation/review priorities should guide the next month without deterministic prediction? Owns **next-month operational review**. | `yearly-current`; excludes annual strategy and exact-event forecast. | monthly context; short-cycle signal; caution condition; monthly action | `seun`, `fortune_flow`, `element_relations`, `strength` -> short-cycle condition -> weekly observation, decision pause, review trigger -> monthly review card. | 15K: next-month review protocol. 50K hook: rolling monthly dashboard. Risk LOW. |

## Full 50-Topic Domain Map

| Domain | Existing | Proposed | Total |
|---|---:|---:|---:|
| Career | 4 | 6 | 10 |
| Money | 4 | 6 | 10 |
| Relationship | 9 | 4 | 13 |
| Health and wellbeing | 0 | 6 | 6 |
| Study and learning | 0 | 4 | 4 |
| Business | 0 | 4 | 4 |
| Period | 1 | 2 | 3 |
| **Total** | **18** | **32** | **50** |

## Closest-Sibling Duplication Matrix

The matrix is a closest-sibling graph: every product is paired with its most
plausible alternative. `L` means LOW, `M` means MEDIUM. There are no HIGH pairs.

| Pair | Question | Evidence | Mechanism | Timeline | Action | Decision | Rating and boundary |
|---|---|---|---|---|---|---|---|
| career / career-workload-recovery | M | M | L | L | L | L | M: career owns operating portfolio; recovery owns capacity reset. |
| career-job-change / career-freelance-transition | M | M | L | L | L | L | M: move decision vs independent-work viability. |
| career-job-fit / career-workplace-adaptation | M | M | L | L | L | L | M: fit diagnosis vs current-environment adjustment. |
| career-specialization / career-promotion-readiness | M | M | L | L | L | L | M: proof depth vs role-scope readiness. |
| career-promotion-readiness / career-leadership-readiness | M | M | L | L | L | L | M: promotion evidence vs people-leadership mechanics. |
| career-workplace-relationships / relationship-friendship | L | M | L | L | L | L | L: work-role interactions vs non-work friendship. |
| wealth / money-wealth-accumulation | M | M | L | L | L | L | M: operating structure vs preservation/accumulation. |
| money-wealth-accumulation / money-emergency-buffer | M | M | L | L | L | L | M: long accumulation vs disruption resilience. |
| money-leak-risk / money-shared-finance | M | M | M | L | L | L | M: general loss exposure vs joint financial governance. |
| money-leak-risk / money-contract-commitment | M | M | M | L | L | L | M: loss path vs pre-commitment/exit terms. |
| money-saving-discipline / money-spending-decision | L | M | L | L | L | L | L: routine continuity vs one major decision. |
| money-income-stability / money-debt-repayment | L | M | L | L | L | L | L: source continuity vs obligation pressure. |
| relationship / relationship-friendship | M | M | L | L | L | L | M: broad relationship portfolio vs peer-friendship exchange. |
| relationship-current / relationship-conflict | L | M | L | L | L | L | L: state/continue-adjust vs trigger/repair/recurrence. |
| relationship-current / relationship-long-distance | M | M | L | L | L | L | M: verdict vs distance logistics. |
| relationship-new-connection / relationship-unrequited | M | M | L | L | L | L | M: mutual new opening vs one-sided reciprocity screening. |
| relationship-boundary / relationship-family-role | M | M | L | L | L | L | M: general boundary vs family-role obligations. |
| relationship-intimacy / relationship-partner-pattern | L | M | L | L | L | L | L: disclosure pace vs selection pattern. |
| relationship-marriage / money-shared-finance | L | M | L | L | L | L | L: shared-life readiness vs financial governance. |
| health-energy-recovery / health-sleep-rhythm | M | M | L | L | L | L | M: energy rhythm vs sleep-specific observation. |
| health-stress-regulation / health-burnout-risk | M | M | L | L | L | L | M: immediate response sequence vs cumulative risk. |
| health-habit-continuity / study-focus-routine | L | M | L | L | L | L | L: wellbeing habit vs attention work block. |
| health-body-signal-review / health-energy-recovery | M | M | L | L | L | L | M: escalation threshold vs rhythm recovery. |
| study-learning-strategy / study-exam-preparation | M | M | L | L | L | L | M: general method vs bounded exam execution. |
| study-credential-decision / career-specialization | M | M | L | L | L | L | M: commitment choice vs specialization accumulation. |
| business-startup-readiness / business-expansion-control | L | M | L | L | L | L | L: launch proof vs scale control. |
| business-client-relationship / business-team-management | L | M | L | L | L | L | L: external client scope vs internal team execution. |
| business-team-management / career-leadership-readiness | M | M | L | L | L | L | M: business operating system vs personal leader transition. |
| daeun-current / yearly-current | L | M | L | L | L | L | L: ten-year transition vs annual review. |
| yearly-current / monthly-next | M | M | L | L | L | L | M: annual calendar vs next-month protocol. |

Counts: HIGH `0`; MEDIUM `17`; LOW `13`. Every MEDIUM pair has a distinct
customer decision, mechanism, timeline, action object, and conclusion above.

## Coverage Review

- **Strongest separate-purchase jobs:** money leak risk, career specialization,
  relationship conflict/current, business expansion control, and study credential
  decision. Each has a tangible decision artifact.
- **Weakest separate-purchase jobs:** broad `relationship`, broad `wealth`, and
  health energy recovery. Their implementation must keep the core problem narrow
  enough that they do not become generic saju interpretation.
- **Overrepresented domain:** relationship (13). This is intentional only because
  romantic, family-role, friendship, distance, and one-sided-attraction decisions
  have distinct buyers and explicit boundaries.
- **Underrepresented domain:** Period (3). This is deliberate; period reports are
  wider and should not be multiplied into deterministic event-prediction products.
- **Missing jobs intentionally excluded:** investment product recommendations,
  medical diagnosis, legal/loan advice, partner-intent inference, outcome/timing
  guarantees, and compatibility products requiring a second person's verified data.
- **Cannibalization controls:** no new generic “social,” “business fortune,”
  “investment,” or duplicate relationship-repair topic is proposed.

## Implementation Batches

| Batch | Products | Expected files | Static checks | Live recommendation |
|---|---|---|---|---|
| 1 | `career-promotion-readiness`, `career-workplace-adaptation`, `career-leadership-readiness`, `career-freelance-transition` | TopicConfig, registry, premium-depth and career boundary regressions | count/insight/sibling contract plus career prompt regression | 2 calls: promotion + freelance |
| 2 | `career-workload-recovery`, `career-workplace-relationships`, `money-income-stability`, `money-debt-repayment`, `money-emergency-buffer` | TopicConfig, registry, career/money boundaries | money safety, career boundary, premium depth | 2 calls: workload + debt |
| 3 | `money-shared-finance`, `money-contract-commitment`, `money-spending-decision`, `relationship-long-distance`, `relationship-unrequited` | TopicConfig, registry, money/relationship boundaries | money safety, relationship sibling comparisons | 2 calls: shared finance + long distance |
| 4 | `relationship-friendship`, `relationship-family-role`, six health products | TopicConfig, registry, health prompt rules and boundaries | health safety wording, relationship boundaries, premium depth | 2 calls: family role + burnout risk |
| 5 | four study products and four business products | TopicConfig, registry, study/business prompt rules | business safety, credential boundary, premium depth | 2 calls: credential + startup readiness |
| 6 | `yearly-current`, `monthly-next` plus catalog integration | Period strategy, registry, period output/prompt tests | period timelines, catalog-count validator, sibling matrix review | 2 calls: yearly + monthly |

No batch is authorized to run live calls until a separate call budget is approved.

## Static Enforcement Decision

No parallel 50-topic registry or validator is added in this architecture step.
The 32 proposals are not TopicConfigs yet, and duplicating them in a second static
registry would create two ownership sources of truth. At implementation time,
`getPaidAnalysisTopicConfigs()` plus the existing premium-depth validator should be
extended with a count and completeness regression derived directly from actual
TopicConfig entries:

- total implemented catalog count
- unique product IDs
- non-empty customer question and action focus
- exactly four required insights
- non-empty prohibited-claim boundary
- excluded focus for sibling-prone products

This keeps enforcement derived from TopicConfig instead of treating this planning
document as executable product metadata.