# UNBODA PROMPT LIBRARY

이 문서는 운보다에서 사용하는 Prompt의 역할과 위치를 관리한다.

실제 Prompt 구현은 코드가 Source of Truth이다.

문서와 코드가 충돌할 경우
실제 구현 코드와 회귀 테스트를 우선 확인한다.

---

# 1. Common Premium Rules

구현 위치:

app/lib/paidAnalysisPromptPlugins/commonPrompt.ts

역할:

- 모든 Premium 상품 공통 분석 원칙
- Premium Writer 공통 규칙
- 현실 언어
- 판단 기준
- 실천 방향
- 과도한 영역 확장 방지

---

# 2. Product Prompt Plugins

## MONEY

구현 위치:

app/lib/paidAnalysisPromptPlugins/moneyPrompt.ts

역할:

재물운 전용 분석 규칙

## CAREER

구현 위치:

app/lib/paidAnalysisPromptPlugins/careerPrompt.ts

역할:

직업·사업 관련 분석 규칙

## HEALTH

구현 위치:

app/lib/paidAnalysisPromptPlugins/healthPrompt.ts

역할:

건강운 분석 및 안전 규칙

## RELATIONSHIP

구현 위치:

app/lib/paidAnalysisPromptPlugins/relationshipPrompt.ts

역할:

연애·관계 분석 규칙

---

# 3. Premium Decision Prompt

구현 위치:

app/lib/paidAnalysisDetailPrompt.ts

역할:

- Premium Output 구조
- V2 / V3 Prompt
- Product Plugin 연결
- AI Insight
- Past Pattern
- Current Core Problem
- Confidence
- 리포트 일관성 원칙

---

# 4. Prompt 변경 원칙

Prompt를 변경할 때는 다음 순서를 따른다.

Prompt 수정
→ TypeScript 검증
→ Parser 영향 확인
→ Validator 영향 확인
→ Regression Test
→ 실제 AI 출력
→ 품질 평가
→ Git 저장

Prompt 문구만 변경하고
Regression Test를 갱신하지 않은 상태로 완료 처리하지 않는다.

---

# 5. Source of Truth

Prompt의 실제 Source of Truth는 코드이다.

이 문서는

Prompt의 목적,
책임,
파일 위치,
변경 원칙을 관리한다.

긴 Prompt 원문을 문서와 코드 양쪽에 중복 저장하지 않는다.

기존 원칙:

"실제 Prompt 구현은 코드가 Source of Truth이다."

이 원칙은 반드시 유지한다.


Product Prompt Plugin 영역에 Period Analysis를 담당하는 FORTUNE 계열을 명확하게 기록한다.

예:

## FORTUNE

역할:

- 세운 종합
- 월운 종합
- 대운 종합
- 기간 흐름 분석

Period Analysis 역시
Core Decision Engine을 새로 만드는 방식이 아니라
공통 Core Engine + Product Plugin 구조를 사용한다.
