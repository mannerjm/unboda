# Pricing & Revenue Architecture

> STEP 55 조사 결과를 정리한 장기 source-of-truth 사업 문서.
> 이 문서의 숫자는 별도 표기가 없는 한 전부 **ASSUMPTION**이며, production 코드에는
> 반영되어 있지 않다. Production 가격의 실제 source of truth는 여전히
> `app/lib/productPricing.ts`다.

## 1. Purpose

54개 Launch 상품(TOPIC 47 + PERIOD 7)을 단일 가격(9,900원)으로만 운영하는 현재 상태에서,
tiered pricing / bundle / repeat purchase / solo-operator 자동화로 확장하기 위한
가격·매출·운영 설계를 CURRENT / NEXT RELEASE / PLANNED / LONG-TERM으로 구분해 기록한다.

## 2. Current Production

| 항목 | 상태 |
|---|---|
| Launch 상품 수 | 54개(TOPIC 47 + PERIOD 7), `getLaunchProductIds()` 기준 |
| 가격 | **전 상품 9,900원 고정**(`app/lib/productPricing.ts`, productId 무시) |
| Tiered pricing | **미적용**(코드에 tier 개념 자체가 없음) |
| Bundle | **미구현**(별도 bundle productId/entitlement 없음) |
| Subscription | **미구현**(`Subscription`/`hasSubscriptionBenefits` 타입만 존재, 실제 구매/과금 로직 없음) |
| 결제(PG) | **mock 상태** — `/api/orders` + `/api/orders/{id}/mock-confirm`, 실제 PG 연동 없음 |
| Refund automation | **미구현**(refund API/로직 0건) |
| CS automation | **미구현**(FAQ/자동응답/티켓 시스템 0건) |

## 3. Pricing Principles

가격은 사주 리포트의 글자 수가 아니라 다음 축으로 실험한다.

- **Decision value**: 이 분석이 실제로 어떤 의사결정을 돕는가(이직/창업/결혼 등)
- **Pain intensity**: 고객이 이 문제로 느끼는 절박도
- **Information depth**: 리포트가 제공하는 정보 밀도(예: 대운/평생운은 밀도가 높음)
- **Repeatability**: 반복 구매 가능성(월운처럼 매달 재구매되는가)
- **Bundle role**: 단독 판매용인지 번들 앵커/구성요소인지
- **Conversion role**: 첫 구매 유도용(ENTRY)인지 상위 전환용(DEEP/PREMIUM)인지
- **LTV role**: 장기 고객 관계에 기여하는 상품인지(예: 평생운은 1회성 고가, 월운은 반복 저가)

## 4. Candidate Pricing Tiers

**모든 가격은 EXPERIMENT CANDIDATE이며 production price가 아니다.**

| Tier | 가격대(candidate) | 성격 |
|---|---|---|
| FREE | 0원 | 무료 사주/무료 분석 |
| ENTRY | 4,900~6,900원 | 첫 구매 유도, 저부담 탐색형 |
| CORE | 9,900원 | 현재 production 기본값과 동일한 표준 심층분석 |
| DEEP | 14,900~19,900원 | 의사결정 임팩트가 큰 주제 |
| PREMIUM | 29,000~39,000원 | 장기·통합형(대운/평생운 등) |

## 5. 54 Product Pricing Matrix

STEP 55 조사에서 작성한 54개 상품별 matrix(카테고리별 표, upstream/downstream 추천, bundle 후보,
재구매 가능성, pain intensity 포함)를 그대로 보존한다. 모든 "권장가"는 **Candidate Launch Price**이며
production 가격(9,900원 고정)을 대체하지 않는다.

전체 표는 STEP 55 조사 응답(세션 기록)에 원본이 있으며, 요약은 다음과 같다.

| 카테고리 | 상품 수 | ENTRY 후보 | CORE 후보 | DEEP 후보 | PREMIUM 후보 |
|---|---|---|---|---|---|
| 직업운(career) | 10 | 3 | 5 | 2 | 0 |
| 재물운(money) | 10 | 3 | 5 | 2 | 0 |
| 관계운(relationship) | 13 | 6 | 6 | 1 | 0 |
| 건강운(health) | 6 | 4 | 2 | 0 | 0 |
| 성장운(study) | 4 | 2 | 2 | 0 | 0 |
| 사업운(business) | 4 | 0 | 2 | 2 | 0 |
| 시기운(period) | 7 | 2(월운) | 2 | 1 | 2(대운/평생운) |

## 6. Bundle Architecture

Bundle 후보(재물/커리어/사업/연애/인간관계/성장/건강/올해종합/미래흐름/인생종합)는
STEP 55 원안을 유지한다.

**Correction (STEP 55B):** "인생 종합 99,000원 = 창업자 직접 케어" 문구는 **삭제한다.**
Founder의 개인 시간을 상품으로 판매하지 않는다(솔로 오퍼레이터 확장성과 충돌).
대신 인생 종합 번들의 가치는 다음으로 설계한다.

- AI-generated premium synthesis(여러 리포트를 하나의 결론으로 통합하는 AI 합성 요약)
- Cross-report integrated summary(재물/커리어/관계 등 리포트 간 교차 결론)
- Priority roadmap(우선순위 실행 로드맵)
- Long-horizon timeline(대운/평생운 스케일의 장기 타임라인)

이 가치는 전부 AI/소프트웨어로 생성되며 founder의 수작업 개입을 전제하지 않는다.

| Bundle | 구성 productId | 가격 후보(candidate) |
|---|---|---|
| 재물/돈 번들 | wealth, money-wealth-accumulation, money-leak-risk, money-saving-discipline | 39,000 |
| 직업/커리어 번들 | career, career-job-fit, career-specialization, career-promotion-readiness | 39,000 |
| 사업 번들 | business-startup-readiness, business-expansion-control, business-client-relationship, business-team-management | 49,000 |
| 연애/관계 번들 | relationship, relationship-current, relationship-conflict, relationship-partner-pattern | 39,000 |
| 인간관계 번들 | relationship-friendship, relationship-family-role, career-workplace-relationships | 29,000 |
| 성장 번들 | study-learning-strategy, study-focus-routine, study-exam-preparation, study-credential-decision | 29,000 |
| 건강 번들 | health-energy-recovery, health-sleep-rhythm, health-stress-regulation, health-burnout-risk | 29,000 |
| 올해 종합 번들 | yearly-current, monthly-current, monthly-next | 19,900 |
| 미래 흐름 번들 | annual-next, annual-3years, daeun-current | 49,000 |
| 인생 종합 번들 | daeun-current, lifetime-overview, wealth, career | 69,000~99,000 (AI 통합 합성 리포트 가치 기준, founder 개입 없음) |

## 7. Revenue Ladder

```
Free → Entry → Core/Deep → Bundle → Repeat → Seasonal Return
```

## 8. KPI Framework

STEP 55의 KPI 정의(visitor→profile, profile→free completion, free→recommendation click,
recommendation→checkout, checkout→payment, payment→report completion, first→second purchase,
bundle attach rate, 30/90/365 day repeat, refund rate, chargeback rate)를 그대로 보존한다.

**실측치와 assumption을 절대 혼동하지 않는다.** 위 KPI들은 전부 정의(definition)일 뿐이며,
실제 값은 아직 측정되지 않았다(서비스 트래픽/결제 데이터 없음).

## 9. Financial Model

시나리오를 3개로 분리한다. 아래 표의 모든 수치는 **ASSUMPTION**이다.

| 변수 | BASE | STRONG | STRETCH |
|---|---|---|---|
| AOV | 9,900원(현재 고정가 유지) | 14,000원(tiered+일부 번들) | 20,000원(번들/구독 비중 높음) |
| CVR(방문→결제) | 1.0% | 1.5% | 2.0% |
| Repeat rate(재구매) | 15% | 30% | 45%(구독/월운 정착) |
| CAC | 12,000원 | 9,000원 | 6,000원(오가닉/입소문 비중 증가) |
| Refund rate | 5% | 3% | 2% |
| AI cost/건 | 500원 | 500원 | 400원(모델 효율화) |
| PG fee | 3.0% | 2.8% | 2.5% |
| CS cost/건 | 5,000원 | 4,000원 | 3,000원(자동화 고도화) |
| Contribution margin | 55% | 65% | 75% |
| Operating margin | 20% | 40% | 60%+ |

**"연매출 150억 / 영업이익 100억"은 STRETCH 시나리오에서도 operating margin 65~70% 이상이
필요한 극단적 efficiency target이다.** 이를 BASE forecast처럼 사용하지 않는다.

## 10. Revenue Milestones

각 milestone은 매출 금액 자체가 아니라 **필요 MAU / CVR / AOV / LTV / CAC / contribution margin**과
함께 판단한다(단독 숫자로 목표를 설정하지 않는다).

| 매출 목표 | 시나리오 | 필요 MAU(개략) | 비고 |
|---|---|---|---|
| 1억 | BASE | ~4.6만 | PMF 검증 단계 |
| 3억 | BASE~STRONG | ~14만~9만 | CS part-time 검토 임계 근접 |
| 10억 | STRONG | ~30만 | CS 아웃소싱 필수 |
| 30억 | STRONG | ~90만 | 마케팅 채널 다각화 필요 |
| 100억 | STRONG~STRETCH | ~150만~230만 | 번들/구독 attach율이 핵심 변수 |
| 150억 | STRETCH | ~230만+ | AOV 20,000원 전제, 구독/번들 실구현 필요 |

## 11. Solo Operator Architecture

정상 주문은 **100% automated**를 목표로 한다(target, 현재 미달성).

Founder가 직접 개입하는 것은 다음 예외 상황에 한정한다.

- Exception(자동 처리 실패 케이스)
- Fraud/high-risk 거래
- Policy ambiguity(정책 해석이 필요한 애매한 케이스)
- System failure(생성/결제 시스템 장애)
- 고액 거래 또는 법적 분쟁 소지가 있는 사안

## 12. CS Automation

```
FAQ → self service(주문조회/mypage) → automated resolution(재시도 자동 트리거)
→ exception queue → outsourced human → founder(only when necessary)
```

**현재 상태: 전부 미구현.** FAQ 페이지, 자동응답, 티켓 시스템, exception queue 모두 코드에 없음.

## 13. Refund Architecture

**현재 미구현.**(refund API/로직 저장소 전체 검색 0건)

향후 설계 방향(PLANNED):

```
eligibility check → use/generation state check → PG cancel/refund
→ entitlement reconciliation → notification → audit log → exception queue
```

**단, 실제 환불 정책은 전자상거래법 등 관련 법률 및 PG사 정책 검토 후 확정한다.**
이 문서의 refund 설계는 기술 아키텍처 초안일 뿐 법률 자문을 대체하지 않는다.

## 14. Failure Recovery

```
AI generation failure → bounded retry(최대 2~3회) → recovery
→ customer notification → refund/exception path
```

**Infinite retry는 절대 만들지 않는다.** 현재 `paid_generation_attempts` 테이블과
`retryIndex` 개념(013 migration)이 이미 존재해, bounded retry의 데이터 기반 일부는
갖춰져 있으나 자동 알림/환불 연결은 아직 없다(PLANNED).

## 15. Human Scaling Threshold

STEP 55 제안 threshold를 **INITIAL OPERATING ASSUMPTION**으로 기록한다. 실제 운영 데이터가
쌓이면 재조정한다.

| 지표 | 임계값(initial assumption) | 조치 |
|---|---|---|
| tickets/day | 5건 초과 3일 지속 | CS part-time 검토 시작 |
| tickets/100 orders | 3건 초과 | 자동화 결함 우선 조사 |
| founder CS hours/week | 5시간 초과 | 파트타임 채용 확정 |
| refund exception rate | 전체 환불의 20% 초과가 human 처리 | 환불 자동화 규칙 재설계 |
| manual minutes/order | 평균 3분 초과 | 자동화 우선순위 상향 |

## 16. Pricing Decision Gate

매출 시작 전에 가격을 코드에 무조건 확정 반영하지 않는다. 최종 가격 결정 전 검토 항목:

- Competitor benchmark
- Willingness-to-pay 조사
- Conversion test(A/B 등)
- 실측 AOV
- Bundle attach rate
- Refund rate
- Repeat purchase rate
- Contribution margin

월운 4,900원 등 이 문서의 모든 후보 가격은 **확정값이 아니라 실험 후보**다.

## 17. Long-Term Business Model

목표는 "사주 리포트를 많이 파는 사이트"가 아니라 다음이 이어지는 AI 명리 플랫폼이다.

```
무료 명리 경험 → 개인화 해석 → 개인화 상품 추천 → 유료 의사결정 분석
→ 기간별 재방문 → 장기 고객 관계
```
