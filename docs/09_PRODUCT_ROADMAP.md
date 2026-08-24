# UNBODA PRODUCT ROADMAP

> **CURRENT PRODUCTION (2026-08-24 기준)**: Launch 판매 카탈로그는 `getLaunchProductIds()`
> 기준 총 **54개(TOPIC 47 + PERIOD 7)**로 확정되었다. 가격은 전 상품 **9,900원 고정**이다
> (`app/lib/productPricing.ts`). 아래 문서 내 "15,000원 가치 기준"은 **판매가가 아니라**
> 당시 품질 검증용 historical value criterion이었다. Tiered pricing(ENTRY/CORE/DEEP/PREMIUM)은
> **NEXT RELEASE candidate**일 뿐 아직 production에 적용되지 않았으며, 상세는
> `docs/12_PRICING_REVENUE_ARCHITECTURE.md`를 source of truth로 한다.

운보다 Premium Product 출시 및 고도화 로드맵

이 문서는 Premium 상품을 어떤 순서로 설계, 구현, 검증, 출시할지 정의한다.

모든 상품은 다음 기준을 통과한 뒤 출시한다.

- Product ID 정의
- Product Plugin 연결
- Prompt 규칙
- Output Schema
- Parser
- Consistency Validator
- Self Review
- 필요한 Safety Validator
- 실제 AI 출력 검증
- 15,000원 가치 기준(Historical Design 당시 품질 바, 판매가 아님)
- Analysis Asset 저장 가능 구조

---

# 1. 현재 개발 위치

> **CURRENT PRODUCTION**: 아래 "Stage 5 진행 중"은 작성 시점의 서술이며,
> 이후 Checkpoint A(Launch 54종 카탈로그 정렬)와 Checkpoint B(profiles service_role grant)가
> 이미 production에 반영되어 **이 단계는 완료된 상태**다. 현재 단계는
> pricing/revenue 구조 설계(STEP 55, `docs/12_PRICING_REVENUE_ARCHITECTURE.md`)로 이동했다.

현재 단계(작성 시점 기준, Historical):

Stage 5.
Premium 대표상품 품질 동결 및 Product Catalog 확장 준비


완료 또는 상당 부분 완료:

- 명리 핵심 분석 엔진
- 원국/대운/세운 연결
- Premium Decision Engine V3
- Premium Output V3
- Product Prompt Plugin 구조
- Output Parser
- Consistency Validator
- Self Review
- Health Safety Validator
- 명리 정확성 관련 회귀 테스트
- Premium 품질 회귀 테스트 구조
- Relationship Premium Quality Regression
- Relationship Output Quality Regression
- 실제 관계 심층분석 반복 출력 검증
- 관계 심층분석 Premium V1 품질 개선
- Career Premium 실제 OpenAI 생성 검증
- Career futureTimeline 비예측형 구조 적용
- Career 현실 직업정보 hallucination 제한
- Career section overlap 개선
- Career actionGuide / checklist 역할 분리
- Career Product ID regression 검증

현재 핵심 과제:

- 대표 Premium 상품 V1 품질 동결
- 전체 Premium Product Registry 정의
- 약 50개 Topic Analysis 정의
- Period Analysis 상품 정의
- AI 추천 Top 3와 직접선택 UI를 공통 Product Registry에 연결
- 구매/권한/리포트 생성 흐름 최종 검증

---

## 1-1. NEXT RELEASE / PLANNED — 판매 자동화 로드맵

> **STATUS: PLANNED.** 아래 항목은 전부 미구현이며, 순서대로 진행 예정인 로드맵이다.
> 구현되기 전까지 어떤 문서에서도 "이미 구현됨"으로 서술하지 않는다.

```
Pricing Architecture (docs/12, 설계만 완료)
→ Real PG Integration (PLANNED, 현재 mock 결제만 존재)
→ Order State Machine (PLANNED)
→ Payment Verification (PLANNED)
→ Refund/Cancellation (PLANNED, docs/12 §13)
→ Self-service CS (PLANNED, docs/12 §12)
→ Exception Queue/Admin (PLANNED)
→ Analytics/Funnel Measurement (PLANNED, docs/12 §8 KPI 정의만 존재)
→ Pricing Validation (PLANNED, docs/12 §16 Pricing Decision Gate)
→ Production QA
→ Launch
```

---

기존 "V1 핵심 상품 11개"는 전체 판매 상품 목록이라는 의미가 아니라
Premium 품질을 검증하는 "대표 분석 상품"으로 재정의한다.

문서 제목 또는 설명을 다음 의미로 수정한다.

"V1 대표 분석 상품"

대표 상품은 Premium Engine과 Report 품질을 검증하기 위한 기준 상품이다.

예:

1. 건강운 심층 분석
2. 재물운 심층 분석
3. 직업운 심층 분석
4. 연애·관계 심층 분석
5. 인간관계 심층 분석
6. 사업운 심층 분석
7. 이직운 심층 분석
8. 결혼운 심층 분석
9. 올해 세운 종합 분석
10. 10년 대운 종합 분석
11. 학업운 심층 분석

이 목록은 전체 판매 상품 수를 제한하지 않는다.

대표 상품 품질 기준이 안정화된 뒤
동일한 Core Decision Engine과 Product Plugin 구조를 이용하여
세부 Topic Analysis와 Period Analysis로 확장한다.
---

# 2. V1 출시 상품

V1 핵심 상품은 다음 11개다.

1. 건강운 심층 분석
2. 재물운 심층 분석
3. 직업운 심층 분석
4. 연애·관계 심층 분석
5. 인간관계 심층 분석
6. 사업운 심층 분석
7. 이직운 심층 분석
8. 결혼운 심층 분석
9. 올해운 심층 분석
10. 10년 대운 심층 분석
11. 학업운 심층 분석

V1 목표:

- 모든 상품의 카드와 메타데이터 통일
- 모든 상품에 Product Plugin 연결
- 모든 상품이 같은 Core Decision Engine 사용
- 상품별 결과가 명확하게 구분됨
- 무료 결과와 유료 결과의 차이가 분명함
- 실제 사용자 테스트 가능한 수준 확보

---

# 3. V1 구현 우선순위

## Stage 1. Core Engine V3

모든 상품의 공통 기반을 먼저 완성한다.

구현 항목:

- AI Insight
- 명리학적 근거 강화
- 과거 흐름 검증
- 현재 핵심 문제
- 미래 시나리오
- AI Decision
- Confidence & Limits
- Cross Plugin Insight
- 2,500~5,000자 권장 분량
- 무료 분석 중복 방지

완료 기준:

- Output V3 타입 정의
- Prompt V3 정의
- Parser V3
- Consistency Validator 확장
- Self Review 확장
- UI 섹션 추가
- 회귀 테스트 통과

---

## Stage 2. 건강운

상태:

부분 완료

이미 완료:

- 건강운 상품 라우팅
- 건강운 전용 Prompt 규칙
- 의료 진단 금지
- Health Safety Validator
- 실제 AI 출력 검증
- 로딩 화면 개선

남은 작업:

- AI Insight 추가
- 과거 흐름 검증 추가
- Confidence & Limits 추가
- 명리 근거 설명 강화
- 무료 분석과 중복 제거
- 건강운 전용 UI 문구 정리

완료 기준:

- 15,000원 가치 기준 통과
- 실제 출력 5건 이상 검증
- 안전성 테스트 통과

---

## Stage 3. 재물운

Plugin:

MONEY

핵심 목표:

- 수입과 축적 구조 구분
- 돈이 들어오는 흐름과 남는 흐름 구분
- 지출, 투자, 계약, 현금 흐름 분석
- 확대, 유지, 조정, 보류 판단
- 금융 확정 표현 차단

필요 작업:

- 재물운 Prompt Plugin 강화
- Money Safety Validator
- 재물운 전용 Self Review
- 실제 AI 출력 검증
- 상품 카드와 상세 페이지 통일

완료 기준:

- 특정 종목 추천 없음
- 수익률·대박·손실 확정 없음
- 행동 전략이 구체적임
- 명리 근거가 충분함
- Common Premium Writer 기준 통과
- 명리 용어가 현실 언어로 충분히 번역됨
- AI Insight가 단순 요약이 아닌 새로운 통찰을 제공함
- 실제 출력 최소 5건 품질 검증
- 15,000원 Premium Value Criteria 통과

---

## Stage 4. 직업운

상태:

대표 상품 품질 검증 완료 / 추가 고도화 가능

완료:

- Career Prompt Plugin 강화
- 실제 OpenAI 출력 검증
- 명리 grounding 검증
- 현실 직업정보 hallucination 제한
- futureTimeline 구조 개선
- 섹션 간 중복 개선
- actionGuide / checklist 역할 분리
- Product ID mapping regression
- Career output quality regression
- 실제 결과 화면 검증

남은 작업:

- Career Safety / Consistency 정책 최종 정리
- 다양한 사주 케이스 반복 품질 검증
- 이직운 Product Context와 범위 분리
- Analysis Asset 장기 저장 연결

---

## Stage 5. 연애·관계

Plugin:

LOVE

핵심 목표:

- 새로운 인연과 기존 관계 구분
- 관계 유지, 조정, 거리 설정 구분
- 인연 시기와 관계 발전 흐름 분석
- 상대방 의도 추정 방지

필요 작업:

- Love Prompt Plugin 강화
- Relationship Safety Validator
- 연애·관계와 인간관계 범위 분리
- 실제 AI 출력 검증

완료 기준:

- 외도·이별·결혼 확정 없음
- 상대방 성격·의도 단정 없음
- 관계 행동 기준이 구체적임

---

## Stage 6. 인간관계

Plugin:

RELATIONSHIP

핵심 목표:

- 귀인, 협력, 갈등, 경계 설정 분석
- 친구, 동료, 상사, 가족 관계 구분
- 관계 확장과 거리 조절 판단

필요 작업:

- Relationship Prompt Plugin 강화
- 연애 상품과 중복 제거
- 상품 메타데이터 통일
- 실제 AI 출력 검증

---

## Stage 7. 사업운

Plugin:

BUSINESS

핵심 목표:

- 확장, 보존, 전환 판단
- 계약과 파트너 구조 분석
- 매출, 비용, 책임 범위 구분
- 사업 성공 보장 방지

필요 작업:

- Business Prompt Plugin
- Business Safety Validator
- 재물운과 사업운 범위 분리
- 실제 AI 출력 검증

---

## Stage 8. 이직운

Plugin:

CAREER

핵심 목표:

- 현재 직장 유지와 이동 조건 비교
- 준비 시기와 실행 시기 분리
- 수입 안정성, 역할, 계약 조건 분석

필요 작업:

- 이직 전용 Product Context
- 직업운과 결과 중복 제거
- 실제 AI 출력 검증

---

## Stage 9. 결혼운

Plugin:

LOVE + RELATIONSHIP

핵심 목표:

- 결혼 적기
- 관계 안정성
- 현실적 준비 조건
- 결혼 확정 예언 방지

필요 작업:

- 결혼 전용 Product Context
- Relationship Safety Validator 확장
- 실제 AI 출력 검증

---

## Stage 10. 올해운

Plugin:

FORTUNE

핵심 목표:

- 올해 전체 방향
- 분기별 변화
- 핵심 기회와 위험
- 우선순위 제시

필요 작업:

- Fortune Prompt Plugin
- 시기 표현 검증
- 구체적 사건 날짜 생성 방지
- 실제 AI 출력 검증

---

## Stage 11. 10년 대운

Plugin:

FORTUNE

핵심 목표:

- 현재 대운의 장기 방향
- 10년 흐름의 변화
- 전환 시기
- 장기 전략

필요 작업:

- 대운 전용 UI
- 장기 타임라인 Schema
- 현재 대운과 다음 대운 비교
- 실제 AI 출력 검증

---

## Stage 12. 학업운

Plugin:

STUDY

핵심 목표:

- 집중력
- 학습 지속성
- 시험과 평가 흐름
- 진로 판단 기준

필요 작업:

- Study Prompt Plugin
- Study Safety Validator
- 합격 보장 방지
- 실제 AI 출력 검증

---

# 4. 공통 개발 절차

각 상품은 아래 순서로 개발한다.

```text
문서 기준 확인
→ Product Metadata
→ Product Plugin
→ Prompt 규칙
→ Output Schema
→ Parser
→ Validator
→ Self Review
→ UI
→ 실제 AI 테스트
→ 회귀 테스트
→ Git 저장

한 번에 여러 상품을 동시에 고도화하지 않는다.

한 상품을 실제 출력까지 완성한 뒤 다음 상품으로 넘어간다.

5. V1 완료 기준

V1은 다음 조건을 모두 만족해야 완료로 본다.

11개 상품 메타데이터 통일
모든 details 항목 5개 이상
모든 Product ID와 analysisType 매핑 정상
Premium Decision Engine V3 적용
상품별 Prompt Plugin 적용
상품별 결과 차별화
모든 필수 Validator 통과
실제 AI 출력 테스트 완료
로딩·오류·결과 UX 정상
결제 및 Entitlement 연결 가능
Analysis Asset 저장 가능
무료 결과와 유료 결과 차이 명확
15,000원 가치 기준 충족
6. V2 확장 상품

V1 안정화 이후 다음 상품을 추가한다.

투자운
부동산운
승진운
창업운
재회운
배우자운
결혼 적기
귀인운
부모 관계
자녀 관계
시험운
진로운
스트레스 흐름
회복운
수면 리듬
이사운
계약운
개업운
인생 전환기
직업 적성

V2는 V1 Core Engine과 Plugin을 재사용한다.

7. 출시 전략

초기에는 11개 상품을 한꺼번에 공개하지 않는다.

권장 순서:

건강운
재물운
직업운
연애·관계
인간관계
사업운
이직운
결혼운
올해운
대운
학업운

각 상품은 실제 사용자 반응을 확인한 뒤 다음 상품으로 확장한다.

측정 지표:

추천 노출률
상품 클릭률
결제 시작률
결제 완료율
리포트 완독률
만족도
AI 상담 시작률
재구매율
환불·불만 사유
8. 현재 다음 작업

현재 최우선 작업:

# 8. 현재 다음 작업

현재 최우선 작업:

Premium Product Catalog와 Product Registry 확장

현재 Core Premium 구조와
Career 대표 상품의 실제 생성 품질 검증까지 진행되었다.

다음 단계는
동일한 기반 구조를 사용하여
판매 가능한 전체 Premium 상품 체계를 정의하는 것이다.

구현 순서:

STEP 1
Premium Product Registry 구조 확정

STEP 2
Topic Analysis 상품 목록 정의

STEP 3
Period Analysis 상품 목록 정의

STEP 4
각 상품의
productId / kind / category / plugin /
analysisType / releaseLevel을 Registry에 등록

STEP 5
Recommendation Engine이
Registry의 canonical productId만 사용하도록 연결

STEP 6
무료 결과 화면에
AI 추천 Top 3와
전체 Premium 직접 선택 Catalog를 동시에 노출

STEP 7
구매한 상품의 접근 권한,
저장된 Analysis Asset,
결과 조회 경로 연결

STEP 8
Career를 기준으로
다음 대표 상품의 Premium 품질을 순차 검증
