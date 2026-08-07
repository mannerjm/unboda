# UNBODA PREMIUM PRODUCTS

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
3. Premium Decision Engine 구조

운보다의 모든 심층분석은 다음 구조를 따른다.

Core Decision Engine
+
Product Plugin
+
Product Context
+
User Context
3-1. Core Decision Engine

모든 상품이 공통으로 사용하는 영역:

Executive Summary
AI Insight
명리학적 근거
현재 핵심 문제
미래 시나리오
AI Decision
Action Plan
Avoid Guide
Checklist
AI Coach
3-2. Product Plugin

상품별로 해석 기준과 행동 기준을 바꾸는 모듈이다.

초기 Plugin:

MONEY
CAREER
LOVE
RELATIONSHIP
HEALTH
STUDY
BUSINESS
FORTUNE
3-3. Cross Plugin Intelligence

분석 중 현재 상품 외의 다른 영역이 핵심 원인으로 확인될 수 있다.

예:

재물운
→ 수입 문제의 핵심 원인이 직업 변화에 있음
→ CAREER 연계 분석 제안
건강운
→ 생활 습관보다 인간관계 스트레스 영향이 큼
→ RELATIONSHIP 연계 분석 제안

연계 추천은 가장 비싼 상품이 아니라
현재 문제를 더 정확하게 이해하는 데 필요한 분석을 기준으로 한다.

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