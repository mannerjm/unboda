# UNBODA PREMIUM PRODUCTS

> **STATUS: Historical Design.** 이 문서는 Premium 상품 체계의 초기 설계 문서다.
> 실제 canonical productId / Plugin / 카테고리의 **source of truth는 코드**다:
> `app/lib/premiumProductRegistry.ts`(등록/조회), `app/lib/paidAnalysisTopicConfig.ts`(Launch 54종 계약).
> 아래 초기 설계 내용은 삭제하지 않고 역사적 설계 의도로 보존하되,
> 현재 CURRENT PRODUCTION과 다른 부분은 각 절에 표기했다.

운보다 유료 심층분석 상품 정의 문서

이 문서는 운보다에서 제공하는 모든 Premium 상품의 기준 문서이다.

모든 상품은 이 문서를 기준으로 다음 영역에서 동일한 Product ID와 상품 정의를 사용한다.

- 개인 맞춤 추천 시스템
- 상품 소개 화면
- 결제 및 이용 권한
- AI Prompt Builder
- Premium Decision Engine
- 리포트 생성
- Validator 및 Self Review
- AI 명리 상담
- 마케팅 및 성과 측정

---

# 1. 상품 철학

운보다는 단순한 사주풀이를 판매하지 않는다.

사용자의 현재 고민과 선택을 이해하고,
계산 엔진에서 생성된 명리 데이터를 근거로
판단과 행동을 돕는 AI 명리 컨설팅을 제공한다.

유료 상품은 풀이의 길이가 아니라 다음 가치를 판매한다.

- 왜 현재 이런 흐름이 나타나는지
- 무엇이 핵심 기회와 위험인지
- 언제 변화가 강해지는지
- 어떤 선택을 우선해야 하는지
- 실제 생활에서 어떻게 대응할지

무료 분석과 유료 분석은 정확도의 차이가 아니라
분석의 깊이와 문제 해결 범위의 차이로 구분한다.

---

# 2. Premium Product 기본 구조

모든 Premium 상품은 공통적으로 다음 정보를 가진다.

```ts
type PremiumProduct = {
  id: string;
  title: string;
  shortTitle?: string;
  category: PremiumProductCategory;
  plugin: PremiumProductPlugin;
  releaseLevel: "V1" | "V2" | "V3" | "ULTIMATE";
  description: string;
  details: readonly string[];
  analysisType: string;
};

필수 원칙:

Product ID는 전체 서비스에서 유일해야 한다.
상품명과 분석 목적이 명확하게 구분되어야 한다.
모든 상품은 독립적인 추천 이유를 가질 수 있어야 한다.
모든 상품은 Premium Decision Engine에서 생성할 수 있어야 한다.
모든 상품은 하나 이상의 Product Plugin에 연결되어야 한다.
단순히 카드만 존재하고 실제 분석 엔진이 없는 상품은 출시하지 않는다.

## 3. Premium Decision Engine 구조

운보다의 Premium 심층분석은 동일한 출력 섹션을 강제하지 않는다.

모든 Premium 상품은 공통된 품질 원칙과 판단 구조를 공유하되,
실제 Output Schema와 리포트 섹션은 분석 목적에 따라 달라질 수 있다.

기본 구조:

Core Premium Rules
+
Product Plugin
+
Product Context
+
User Context
+
Product-specific Output Schema

공통으로 유지해야 하는 것은 다음과 같다.

- 계산 엔진의 명리 사실을 근거로 사용할 것
- 계산되지 않은 명리 사실을 AI가 임의로 생성하지 않을 것
- 사용자 입력에 없는 현실 상황을 현재 사실처럼 가정하지 않을 것
- 핵심 결론과 명리 근거가 연결될 것
- 판단 기준과 행동 방향을 제공할 것
- 과도한 단정과 공포 표현을 사용하지 않을 것
- 분석의 신뢰도와 한계를 명확하게 표현할 것
- 무료 분석과 불필요하게 같은 내용을 반복하지 않을 것

중요:

공통 Premium Engine을 사용한다는 것은
모든 상품이 동일한 리포트 섹션을 가져야 한다는 의미가 아니다.

예:

- Career Analysis:
  원인 → 명리 구조 → 현재 상황 → 변화 조건 → 행동 판단

- Yearly Analysis:
  연간 핵심 테마 → 연간 구조 → 상·하반기 흐름 → 분야별 흐름 → 변곡 조건

- Monthly Analysis:
  월 핵심 흐름 → 이전 달 대비 변화 → 초·중·후반 흐름 → 분야별 흐름 → 행동 조건

따라서 공통되는 것은 Premium 분석의 품질 기준이며,
Output Schema는 Product Plugin과 분석 목적에 따라 달라질 수 있다.

### 3-1. Core Premium Rules

모든 Premium 상품이 공통으로 준수하는 것은
고정된 섹션 목록이 아니라 분석 품질과 판단 구조다.

공통 분석 흐름:

1. 핵심 판단
2. 명리 근거
3. 현재 적용 해석
4. 변화 조건 또는 흐름
5. 행동 방향
6. 판단 전 확인 기준
7. 분석 신뢰도와 한계

실제 섹션명과 JSON 구조는 상품별 Product Plugin이 결정한다.

예를 들어 Career 상품은 다음과 같은 구조를 사용할 수 있다.

- heroSummary
- decisionAnchor
- causeAnalysis
- fortuneStructure
- currentSituation
- futureTimeline
- actionGuide
- avoidGuide
- checklist
- coachMessage
- confidence

중요 원칙:

- 모든 상품에 Executive Summary, AI Insight, AI Decision, AI Coach 등의 섹션을 강제하지 않는다.
- 동일한 의미를 여러 섹션에서 반복하지 않는다.
- 요약 섹션은 짧게 유지하고, 분석 근거와 행동 가이드는 서로 역할을 분리한다.
- checklist는 actionGuide를 문장만 바꿔 반복하지 않고 판단 전 확인 조건을 제공한다.
- futureTimeline은 계산되지 않은 미래 사건을 예언하지 않고 변화 조건, 확인 신호, 준비 방향을 설명한다.
- 상품별 분석 목적에 따라 필요한 섹션만 사용한다.

3-2. Product Plugin

상품별 분석 목적, 해석 기준, 행동 기준, 출력 섹션 구조를 정의하는 모듈이다.

Product Plugin은 공통 Premium 품질 규칙을 유지하면서,
각 상품에 필요한 데이터 사용 방식과 Output Schema를 결정한다.

따라서 Career, 재물, 연애, 건강, 학업, 사업, 종합운은
동일한 섹션 구성을 강제로 공유하지 않는다.

초기 Plugin(Historical Design):

MONEY
CAREER
LOVE
RELATIONSHIP
HEALTH
STUDY
BUSINESS
FORTUNE

> **CURRENT PRODUCTION**: 실제 `PremiumProductPlugin` enum(`app/lib/premiumProductRegistry.ts`)은
> `MONEY | CAREER | RELATIONSHIP | HEALTH | FORTUNE | COMMON` 6종이다. `LOVE`는 존재하지 않으며,
> `STUDY`/`BUSINESS`는 Plugin이 아니라 별도 개념인 `PaidAnalysisEngine`(`app/lib/paidAnalysisEngine.ts`)에서만 쓰인다.
> Plugin(상품 메타데이터 분류)과 Engine(AI 생성 로직 분류)을 혼동하지 않는다.

### 3-3. Cross Plugin Intelligence

Premium 분석은 현재 상품의 분석 목적을 우선 완결한다.

분석 과정에서 현재 상품만으로 설명하기 어려운 핵심 원인이
다른 분석 영역과 명확하게 연결되는 경우,
관련 Product Plugin을 보조 관점으로 참조하거나
추가 심층분석을 제안할 수 있다.

예:

재물 분석
→ 현재 재물 흐름의 핵심 변수가 직업·수입 구조의 변화와 연결됨
→ 현재 재물 분석 안에서 해당 연결 관계를 먼저 설명
→ 추가적인 직업 판단이 필요한 경우 CAREER 심층분석 제안

건강 분석
→ 현재 건강 흐름의 부담 요인이 관계·생활환경과 연결됨
→ 현재 건강 분석 안에서 해당 연결 관계를 먼저 설명
→ 관계 영역의 독립적인 심층 판단이 필요한 경우 RELATIONSHIP 분석 제안

핵심 원칙:

- Cross Plugin은 현재 분석을 다른 상품으로 대체하지 않는다.
- 현재 구매한 상품의 질문과 분석 목적을 먼저 충분히 완결한다.
- 다른 영역은 현재 분석을 설명하는 보조 근거로 사용할 수 있다.
- 추가 상품 추천은 실제로 독립적인 추가 분석 가치가 있을 때만 제공한다.
- 단순 키워드 일치만으로 다른 상품을 추천하지 않는다.
- 가장 비싼 상품이나 상위 상품을 우선 추천하지 않는다.
- 사용자가 이미 구매했거나 조회 가능한 분석은 신규 구매보다 기존 결과 조회를 우선한다.

4. 상품 카테고리
4-1. 재물·자산

Plugin: MONEY

재물운 심층 분석
투자운
부동산운
현금 흐름 분석
소비 습관 분석
자산 축적 분석
부채 관리 흐름
계약운
상속운
평생 재물 흐름

### V1 대표 상품 상세 정의

#### 재물운 심층 분석

```ts
{
  id: "wealth",
  title: "재물운 심층 분석",
  shortTitle: "재물운",
  category: "MONEY",
  plugin: "MONEY",
  releaseLevel: "V1",
  analysisType: "재물운 심층 분석"
}

4-2. 직업·커리어

Plugin: CAREER

직업운 심층 분석
이직운
승진운
퇴사 판단
직업 적성
천직 분석
프리랜서운
직장 적응
리더십
커리어 로드맵
4-3. 사업·창업

Plugin: BUSINESS

사업운 심층 분석
창업운
사업 확장
매출 흐름
고객운
파트너운
직원 관리
계약·협상
개업운
사업 전환기
4-4. 연애·인연

Plugin: LOVE

연애운 심층 분석
인연 시기
썸 가능성
짝사랑운
재회운
연애 패턴
이상형 분석
배우자운
장거리 연애
관계 발전 시기
4-5. 결혼·부부

Plugin: LOVE + RELATIONSHIP

결혼운 심층 분석
결혼 적기
배우자 성향
결혼 후 흐름
부부 관계
결혼 준비
재혼운
갈등 관리
관계 회복
결혼 의사결정
4-6. 인간관계·가족

Plugin: RELATIONSHIP

인간관계 심층 분석
귀인운
친구운
상사운
동료운
직장 인간관계
가족운
부모 관계
자녀 관계
사회적 관계 확장
4-7. 건강·생활 리듬

Plugin: HEALTH

건강운 심층 분석
체력 흐름
회복운
스트레스 흐름
수면 리듬
생활 습관
번아웃 관리
컨디션 변화
활동량 조절
장기 생활 관리

건강 상품은 의료 진단이나 치료를 제공하지 않는다.
명리 해석에 따른 생활 리듬 참고 정보로 제한한다.

4-8. 학업·시험·진로

Plugin: STUDY

학업운 심층 분석
시험운
집중력 분석
공부 방법
자격증운
진로운
입시운
유학운
전공 선택
학습 전환기
4-9. 운세·시기

Plugin: FORTUNE

올해운 심층 분석
월운
세운
10년 대운
인생 전환기
행운 시기
주의 시기
이동운
이사운
중요한 결정 시기
5. 출시 우선순위
V1 — 핵심 상품

초기 유료 가치와 전환 퍼널을 검증하는 상품이다.

재물운 심층 분석
연애·관계 심층 분석
직업운 심층 분석
건강운 심층 분석
인간관계 심층 분석
결혼운 심층 분석
학업운 심층 분석
사업운 심층 분석
이직운 심층 분석
올해운 심층 분석
10년 대운 심층 분석

V1 목표:

상품 메타데이터 통일
상품별 Prompt Plugin 연결
상품별 Validator 연결
동일한 Premium 품질 기준 적용
단품 구매 전환 검증
V2 — 확장 상품
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
V3 — 전문 세분화 상품
현금 흐름
소비 습관
자산 축적
부채 관리
직장 적응
리더십
프리랜서운
사업 확장
고객운
직원 관리
썸 가능성
짝사랑운
연애 패턴
장거리 연애
결혼 후 흐름
재혼운
친구운
상사운
동료운
체력 흐름
생활 습관
번아웃 관리
집중력
자격증운
유학운
월운
행운 시기
주의 시기
이동운

목표: 총 50개 이상의 독립적인 심층분석 상품 구성

ULTIMATE — 전문 서비스와 통합 상품
종합 인생 리포트
평생 재물 흐름
평생 직업 로드맵
통합 관계 리포트
가족 전체 흐름
연인·부부 궁합
부모·자녀 궁합
사업 파트너 궁합
택일
작명
개명
이사
개업
풍수
타로
통합 AI 의사결정 분석
6. Product ID 기준

Product ID는 소문자 영문과 하이픈을 사용한다.

예:

wealth
investment
real-estate
career
job-change
promotion
business
startup
love
reunion
marriage
relationship
health
recovery
study
exam
yearly
daeun

원칙:

출시 후 Product ID를 쉽게 변경하지 않는다.
같은 의미의 중복 ID를 만들지 않는다.
UI 경로, 결제, Entitlement, Analysis Asset에서 같은 ID를 사용한다.
기존 ID와 신규 ID가 혼재하지 않도록 중앙 상품 정의에서 관리한다.
7. 상품 출시 조건

새로운 상품은 아래 조건을 모두 충족해야 출시할 수 있다.

기존 상품과 목적이 명확히 구분된다.
독립적인 사용자 고민을 해결한다.
독립적인 추천 이유를 생성할 수 있다.
적절한 Product Plugin이 정의되어 있다.
상품별 Prompt 규칙이 있다.
상품별 섹션 작성 규칙이 있다.
Parser 기준을 통과한다.
Consistency Validator를 통과한다.
Self Review를 통과한다.
필요한 경우 전용 Safety Validator를 통과한다.
무료 분석과 유료 분석의 차이가 명확하다.
15,000원 가치 기준을 만족한다.
결과가 Analysis Asset으로 저장될 수 있다.
8. 상품 품질 원칙

상품 수보다 품질을 우선한다.

다음 상태의 상품은 출시하지 않는다.

공통 문구만 바꾼 상품
다른 상품과 결과가 거의 같은 상품
상품 소개만 있고 실제 분석 로직이 없는 상품
행동 가이드만 있고 명리 근거가 부족한 상품
과장·공포·확정 예언에 의존하는 상품
사용자가 결제 후 새로운 정보를 얻지 못하는 상품

초기에는 V1 상품을 완성도 높게 출시한 뒤
검증된 Core Engine과 Plugin을 재사용하여 V2, V3로 확장한다.

9. 추천 시스템 연결 원칙

추천 순서:

계산 결과 분석
→ 현재 변화 발견
→ 명리학적 근거 설명
→ 관련 Premium 상품 추천

추천 엔진은 다음을 출력한다.

추천 Product ID
추천 제목
추천 이유
우선순위
관련 명리 근거
추천 시점
연계 Plugin

가장 비싼 상품이나 판매하고 싶은 상품을 우선 추천하지 않는다.

10. 운영 및 버전 관리

상품 변경 시 함께 확인해야 하는 영역:

paidAnalysisProducts.ts
Product ID 매핑
추천 엔진
Prompt Plugin
Output Schema
Validator
UI 카드
상품 상세 페이지
결제 및 Entitlement
Analysis Asset 저장
회귀 테스트
Release Note

상품 추가·수정·중단 내역은 08_RELEASE_NOTE.md에 기록한다.

출시 순서와 목표 일정은 09_PRODUCT_ROADMAP.md에서 관리한다.

# 3. Premium Product Writer 원칙

모든 Premium 상품은 동일한 Core Decision Engine과
공통 Premium Writer 기준을 사용한다.

다만 상품마다 사용자가 해결하려는 문제가 다르므로
상품별 Product Plugin은 다음을 독립적으로 정의한다.

- 핵심 분석 질문
- 우선적으로 사용할 명리 근거
- 현재 핵심 문제의 판단 기준
- 기회와 위험의 판단 기준
- 행동 전략
- 금지해야 할 단정 표현
- 상품별 현실 언어

공통 Writer는 글의 품질과 설명 방식을 통일하고,
Product Plugin은 분석의 내용과 전문성을 차별화한다.

따라서 모든 상품이 같은 문체를 사용할 수는 있지만
같은 내용의 리포트처럼 보여서는 안 된다.


---------------------------------------------------

Premium 상품을 크게 두 종류로 구분한다.

1) Topic Analysis
특정 문제나 관심사를 깊게 분석하는 상품이다.

예:
- 연애·관계 심층 분석
- 인간관계 심층 분석
- 재물운 심층 분석
- 직업운 심층 분석
- 이직운 심층 분석
- 사업운 심층 분석
- 건강운 심층 분석
- 결혼운 심층 분석
- 학업운 심층 분석
- 투자 관련 분석
- 현재 관계 지속성
- 직장 내 인간관계
- 번아웃 위험
등

최종적으로 약 50개의 세부 심층분석 Topic을 제공할 수 있도록 확장 가능한 구조로 설계한다.


2) Period Analysis
특정 기간의 운 흐름 전체를 종합적으로 분석하는 상품이다.

예:
- 올해 세운 종합 분석
- 내년 세운 종합 분석
- 이번 달 월운 종합 분석
- 다음 달 월운 종합 분석
- 앞으로 12개월 월별 흐름 분석
- 10년 대운 종합 분석


상품 타입에 다음 개념을 추가한다.

type PremiumProductKind =
  | "TOPIC"
  | "PERIOD";

type PremiumProduct = {
  id: string;
  title: string;
  shortTitle?: string;
  category: PremiumProductCategory;
  plugin: PremiumProductPlugin;
  kind: PremiumProductKind;
  releaseLevel: "V1" | "V2" | "V3" | "ULTIMATE";
  description: string;
  details: readonly string[];
  analysisType: string;
};


중요한 상품 관리 원칙:

추천용 상품과 사용자가 직접 선택하는 상품을 별도로 관리하지 않는다.

하나의 Product Registry를 기준으로 아래 기능이 모두 동작해야 한다.

Product Registry
→ AI Recommendation Top 3
→ User Browse / Direct Selection
→ Payment
→ Prompt Builder
→ Premium Report

AI 추천과 사용자 직접 선택은 동일한 productId를 사용한다.
