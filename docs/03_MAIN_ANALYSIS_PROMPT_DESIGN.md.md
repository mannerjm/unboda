# UNBODA MAIN ANALYSIS PROMPT DESIGN

## 1. 목적

메인 분석 프롬프트는
계산 엔진에서 생성된 명리 데이터를
AI가 임의로 계산하지 않고
사용자에게 이해하기 쉬운 분석으로 설명하도록 만드는
운보다의 표준 프롬프트 설계 문서다.

기본 흐름:

사용자 입력
→ 명리 계산 엔진
→ 구조화된 분석 데이터
→ Main Analysis Compact Facts
→ 메인 분석 프롬프트
→ AI 해석
→ 구조화된 결과
→ 사용자 결과

Main Analysis Compact Facts는 새로운 명리 계산을 수행하는 계층이 아니다.

계산 엔진에서 이미 생성된 사실 중
메인 분석에 필요한 핵심 정보를 선별·정리하여
AI가 안정적으로 사용할 수 있도록 만드는 입력 정규화 계층이다.

---

## 2. 핵심 원칙

### 2-1. Engine First

AI는 사주를 직접 계산하지 않는다.

AI는 반드시
계산 엔진에서 전달된 데이터를 기반으로 설명한다.

### 2-2. 계산과 해석 분리

계산 엔진:

- 사주 원국
- 오행
- 십신
- 신강 / 신약
- 용신
- 격국
- 대운
- 세운
- 합·충·형·파·해
- 통합 운세 흐름

AI:

- 계산 결과 설명
- 데이터 간 관계 연결
- 사용자 관점의 의미 해석
- 현실적인 행동 가이드 작성

### 2-3. 근거 없는 생성 금지

AI는 제공되지 않은 명리 데이터를
임의로 추가하거나 계산하지 않는다.

불확실한 내용은
확정적으로 표현하지 않는다.

### 2-4. 사용자 이해 우선

명리학 용어만 나열하지 않는다.

전문 용어를 사용할 경우
사용자의 성향, 상황, 선택과 연결해 설명한다.

### 2-5. 불안 조장 금지

사고, 질병, 파산, 이별 등을
확정적으로 예언하지 않는다.

주의 요인은
위험을 과장하지 않고
현실적인 대응 방향과 함께 설명한다.

### 2-6. 사실 / 해석 / 행동 분리

AI는 계산 사실, 해석, 행동 가이드를 구분한다.

계산 사실:
- 엔진 또는 Compact Facts에 실제 존재하는 명리 정보

해석:
- 계산 사실이 현재 흐름에서 갖는 의미

행동:
- 해석을 사용자가 현실에서 활용할 수 있는 판단 기준으로 변환한 내용

AI는 행동 가이드를 만들기 위해
입력에 없는 현실 상황을 사실처럼 생성하지 않는다.

예:

허용:
"현재 흐름에서는 속도보다 판단 기준을 먼저 정리하는 편이 유리합니다."

금지:
"현재 회사에서 상사가 업무 범위를 계속 확대하고 있습니다."

실제 직장, 상사, 계약, 프로젝트, 평가, 재산 상태,
연애 상태 등 입력되지 않은 현실 정보를 사실처럼 추정하지 않는다.

---

## 3. 프롬프트 입력 데이터 우선순위

메인 분석 프롬프트는
계산 엔진에서 생성된 사실을 기반으로
분석 목적에 필요한 데이터를 선별하여 전달한다.

핵심 데이터:

1. 사주 원국
2. 오행 분포
3. 십신 관계
4. 신강 / 신약
5. 용신
6. 격국
7. 대운
8. 세운
9. 합·충·형·파·해
10. 원국 + 대운 + 세운 통합 흐름

실제 Prompt에는 위 데이터를 무조건 원본 형태로 모두 전달하지 않는다.

Main Analysis Compact Facts를 통해
현재 분석에 필요한 핵심 사실을 정리하여 전달할 수 있다.

추천 결과와 Premium 분석 데이터는
Main Analysis의 명리 계산 근거를 대체하지 않는다.

추천은 Main Analysis 이후 별도의 Recommendation 단계에서 처리하고,
Premium 상세 분석은 Premium Prompt Layer에서 처리한다.

---

## 4. 프롬프트 기본 구역

메인 분석 프롬프트는
다음 구역으로 구성한다.

### 4-1. AI 역할

AI가 명리 계산기가 아니라
계산 결과를 설명하는 분석가임을 명시한다.

### 4-2. 작성 원칙

- 계산 결과 우선
- 사용자 이해 중심
- 과장 금지
- 단정 금지
- 반복 금지
- 현실적인 조언 제공

### 4-3. 명리 입력 데이터

- 원국
- 오행
- 십신
- 신강 / 신약
- 용신
- 격국
- 대운
- 세운
- 관계 작용

필요한 경우 원본 Engine Data를 그대로 전달하지 않고
Compact Facts 형태로 정규화하여 전달한다.

### 4-4. 엔진 분석 결과

엔진이 미리 계산한:

- 핵심 성향
- 기회 요인
- 주의 요인
- 현재 운의 흐름
- 변화 신호
- 추천 우선순위

### 4-5. 출력 지시

AI가 어떤 순서와 형식으로
결과를 작성해야 하는지 지정한다.

---

## 5. 무료와 유료의 공통 원칙

무료와 유료는
정확도의 차이로 구분하지 않는다.

무료:

- 현재 어떤 흐름인지
- 무엇이 중요한지
- 사용자가 이해할 수 있는 핵심 설명

유료:

- 왜 그런 흐름이 나타나는지
- 어떤 조건에서 흐름이 강해지거나 달라질 수 있는지
- 어떤 변화 신호를 확인해야 하는지
- 기회와 주의 요인은 무엇인지
- 어떤 선택을 고려할 수 있는지
- 현재 판단에서 무엇을 우선해야 하는지
- 현실에서 어떻게 대응할 수 있는지

기간에 대한 구체적인 표현은
실제 계산된 대운·세운·월운 등 시간 근거가 존재할 때만 사용한다.

계산되지 않은 미래 시점이나 사건을
AI가 임의로 생성하지 않는다.

---

## 6. 추천 시스템 연결 원칙

추천 흐름:

명리 계산 결과
→ Main Analysis
→ Recommendation Engine
→ 추천 Product / Topic 결정
→ AI 추천 설명
→ 사용자에게 Top Recommendation 제공

AI는 다음 내용만 담당한다.

- 왜 이 분석이 중요한지 설명
- 현재 흐름과 추천 분석을 연결
- 사용자가 얻을 수 있는 가치를 설명

AI는 가장 비싼 상품을 임의로 추천하지 않는다.

AI 추천과 사용자의 직접 선택은 별개의 진입 경로다.

AI 추천:
현재 명리 구조에서 우선 확인 가치가 높은 분석을 제안한다.

직접 선택:
사용자가 자신의 관심사에 따라 Premium 분석을 직접 선택한다.

두 경로는 최종적으로 동일한 Premium Product Registry의
canonical productId를 사용해야 한다.

---

## 7. Main Analysis 출력 구조

Main Analysis는 사용자에게 읽기 쉬운 결과를 제공하면서,
후속 Recommendation 및 UI에서 활용할 수 있도록
구조화된 출력 사용을 지향한다.

출력 구조는 실제 구현 Schema를 canonical source로 한다.

문서의 예시 필드가 실제 코드의 Schema보다 우선하지 않는다.

Main Analysis의 출력 책임은 다음과 같다.

- 현재 사주의 핵심 판단
- 판단을 뒷받침하는 명리 근거
- 현재 운 흐름
- 기회와 주의 요인
- 현실적인 판단 방향
- Recommendation 단계에서 활용할 수 있는 분석 맥락

Premium 상품의 상세 Output Schema는
Main Analysis Schema에 포함하지 않는다.

Premium 상품별 Output Schema는
Premium Prompt Layer와 Product Plugin에서 별도로 정의한다.

---

## 8. 현재 구현 상태

### 8-1. Main Analysis

현재 구현:

- Main Analysis Prompt Builder
- AnalysisAIService 연결
- SajuResult 기반 Engine First 구조
- 사주 원국 데이터 연결
- 오행 및 주요 명리 데이터 연결
- 신강 / 신약 관련 분석 데이터 연결
- 격국 관련 분석 데이터 연결
- 용신 관련 분석 데이터 연결
- 대운 연결
- 세운 연결
- 원국 + 대운 + 세운 통합 흐름 활용
- Main Analysis Compact Facts 계층 도입
- 구조화된 분석 데이터 기반 Prompt 생성
- AI 회귀 테스트 운영

### 8-2. Recommendation

현재 구현 또는 검증된 구조:

- Main Analysis 결과와 명리 데이터를 Recommendation 단계에서 활용
- 추천 Product ID validation
- canonical productId mapping 검증
- 추천 설명 생성 계층
- Recommendation regression test

Recommendation은 Premium 분석 자체를 생성하지 않는다.

추천 결과는 사용자가 추가로 확인할 가치가 높은
Premium 분석의 진입점을 제공한다.

### 8-3. Premium Analysis

현재 구현:

- Premium Detail Prompt
- Premium Product Plugin 구조
- Career Product Plugin
- Product Context
- Premium Output Schema
- Premium Output Parser
- malformed / polluted JSON 방어
- Consistency / validation 계층
- Premium Regression Test
- Career 실제 생성 품질 검증

### 8-4. Career Premium V2

Career는 현재 Premium Topic Analysis의
reference implementation 역할을 한다.

현재 적용된 주요 원칙:

- 명리 grounding 강화
- 입력되지 않은 현실 직업 정보 hallucination 제한
- causeAnalysis 유지
- fortuneStructure 유지
- currentSituation 유지
- futureTimeline 4단계 구조
- actionGuide와 checklist 역할 분리
- coachMessage 압축
- 섹션 간 의미 중복 감소
- Confidence & Limits 유지

Career futureTimeline:

1. 현재 흐름
2. 다음 변화의 조건
3. 중기적으로 확인할 신호
4. 장기적으로 준비할 방향

계산 근거가 없는
"3개월 뒤 / 6개월 뒤 / 1년 뒤" 형태의
고정 미래 예측을 사용하지 않는다.

### 8-5. 현재 개발 단계

현재 핵심 기반 구조는 구현되어 있으며,
다음 단계는 Premium 상품군 확장과
사용자 탐색 / 조회 구조를 정리하는 것이다.

주요 다음 작업:

- Topic형 Premium 상품 Registry 확장
- 기간형 Premium 상품 구조 분리
- 다른 Premium 심층분석 직접 선택 UI
- 구매 / 접근 권한과 결과 조회 연결
- 기존 구매 상품 결과 조회 UX
- Product별 regression 확대

# 9. Premium Prompt Layer 구조

Premium Prompt는 다음 계층으로 구성한다.

Engine Data
↓
Analysis Facts / Product Context
↓
Common Analysis Rules
↓
Premium Writer Rules
↓
Product Plugin Rules
↓
Output Schema
↓
Parser
↓
Self Review / Consistency / Safety Validation
↓
Premium Report

## 9-1. Engine Data

명리 계산 결과의 원본이다.

AI는 Engine Data를 임의로 변경하거나
새로운 계산 결과를 만들어내지 않는다.

## 9-2. Common Analysis Rules

모든 상품이 반드시 따라야 하는 공통 분석 원칙이다.

- 계산과 해석 분리
- 근거 없는 생성 금지
- 과도한 영역 확장 금지
- 현재 판단 기준 제시
- 불안 조장 금지
- 입력되지 않은 현실 상황 추정 금지
- 계산되지 않은 미래 시점 생성 금지

## 9-3. Premium Writer Rules

엔진의 분석 결과를 사용자가 이해할 수 있는 현실 언어로 변환한다.

Premium Writer는 새로운 명리 판단을 생성하는 엔진이 아니다.

이미 계산된 근거와 Product Plugin의 분석 방향을
더 명확하고 읽기 쉬운 언어로 전달하는 표현 계층이다.

## 9-4. Product Plugin Rules

재물, 직업, 건강, 연애 등
상품별 분석 목적과 전문 분석 기준을 정의한다.

Product Plugin은 다음을 결정할 수 있다.

- 상품의 핵심 분석 질문
- 우선적으로 사용할 명리 근거
- 해석 관점
- 행동 가이드 방향
- 섹션별 역할
- 미래 흐름 표현 방식
- 상품별 금지 규칙
- Output Schema 요구사항

공통 Premium 원칙은 모든 상품이 준수한다.

단, 실제 분석 내용과 출력 구조는
상품의 목적에 맞게 Product Plugin이 구체화한다.

모든 Premium 상품에 동일한 섹션 구성을 강제하지 않는다.

## 9-5. Output Schema

AI는 정의된 JSON 구조를 반드시 따른다.

Writer 품질을 높이기 위해
Output Schema를 임의로 변경하지 않는다.

Output Schema는 상품별 분석 목적에 따라 달라질 수 있다.

Career Topic Analysis,
Money Topic Analysis,
Yearly Period Analysis,
Monthly Period Analysis가
반드시 동일한 Schema를 사용할 필요는 없다.

Schema 변경은 Prompt 문구만 수정하여 처리하지 않는다.

Schema, Parser, Validator, Renderer 및 Regression Test에 미치는 영향을
함께 검토한다.

## 9-6. 핵심 원칙

Premium Writer는 Engine을 대체하지 않는다.

Premium Writer는 Product Plugin을 대체하지 않는다.

Premium Writer의 역할은

명리 근거
→ 의미
→ 현실에서 나타나는 모습
→ 판단 기준
→ 행동

"현실에서 나타나는 모습"은
입력되지 않은 실제 사건을 생성한다는 의미가 아니다.

명리 구조가 현실에서 나타날 수 있는 양상을
조건적이고 일반화된 형태로 설명하는 것을 의미한다.
