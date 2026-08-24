AI 전체 구조

이 문서는 실제 코드를 기준으로 작성한다. 파이프라인은 하나가 아니라
서로 다른 OpenAI 호출을 갖는 두 개의 흐름으로 나뉜다.

## 1. Free Analysis 흐름 (`app/lib/freeAnalysisPipeline/server.ts`)

`buildFreeAnalysisResponse()` 기준:

사용자 입력
↓
사주 생성 — `getSaju()` (`app/lib/manse`)
↓
무료 분석(규칙 기반, AI 아님) — `buildFreeAnalysis()`
↓
추천 신호 계산 — `buildPremiumAnalysis()` (fortuneBrain/strength/elementRelations/fortuneFlow 계산, AI 아님)
↓
추천 상품 TOP3 계산 — `buildAnalysisProductRecommendations()` (`app/lib/analysisProductRecommendations.ts`)
↓
추천 문구 조립 — `buildAnalysisRecommendation()`
↓
GPT 호출 #1: 무료 분석 리포트 텍스트 — `generateMainAnalysis()` → `generateAnalysisText(prompt, { callType: "main-analysis" })`
GPT 호출 #2: 추천 설명 텍스트 — `generateRecommendationExplanation()` → `generateAnalysisRecommendation()`
↓
`/result` 페이지 렌더

`buildPremiumAnalysis()`는 유료 분석 검증 체인의 일부가 아니라, **무료 흐름 안에서 추천 신호를 계산하는 함수**다.

## 2. Paid Analysis 흐름 (production에서 실제로 호출되는 버전: V2/V3)

API: `POST /api/paid-analysis-detail-v2` → `app/lib/paidAnalysisDetailService.ts`의 `generatePaidAnalysisDetailV2()`(내부적으로 `generatePaidAnalysisDetailV2Core()` 호출).

Prompt Builder — `buildPaidAnalysisDetailPromptV3()`
↓
GPT 호출 — `generatePaidAnalysisTextWithUsage()` → `generateAnalysisText()`
↓
Parser — `parseGeneratedPaidAnalysisDetailV3()`
↓
Consistency 검증 — `validatePaidAnalysisConsistency()`
↓
Self Review — `reviewPaidAnalysisDetail()` (`app/lib/paidAnalysisSelfReview.ts`)
↓
Safety Check — **HEALTH 플러그인 상품에 한해서만** `validatePaidAnalysisHealthSafety()` 실행(전체 54종 공통 단계 아님)
↓
`/paid-analysis/{productId}/report` 페이지 렌더

### Planned / 아직 wired되지 않음

`generatePaidAnalysisDetailV4()`(V4 계약: Prompt Builder V4 → GPT → Parser → Consistency → Self Review → 품질 검증들 → evidence linkage)는 코드와 regression에는 존재하지만,
`paidAnalysisDetailService.ts` 주석에 명시된 대로 **API 라우트에 아직 연결되지 않았다**("Not wired into the API route yet"). 현재 리포트 UI는 V3 결과 형태를 읽으므로, production에서 실제로 도는 것은 V2/V3 흐름이다. V4는 "Planned" 상태로 표기한다.

## 3. 54-Product Launch Catalog와의 관계

- `app/lib/analysisTopics.ts`(`ANALYSIS_TOPICS`, 80개)와 `app/lib/analysisPeriodProducts.ts`(`PERIOD_ANALYSIS_PRODUCTS`, 8개)는 **전체 taxonomy**이며 판매 카탈로그가 아니다.
- `app/lib/premiumProductRegistry.ts`는 이 taxonomy + legacy 4종(`career`/`wealth`/`relationship`/`health`)을 하나의 조회 가능한 registry(`ALL_PREMIUM_PRODUCTS`, `getPremiumProduct()`)로 통합한다.
- `app/lib/paidAnalysisTopicConfig.ts`의 `getLaunchProductIds()`가 **판매 대상(Launch) 54종(TOPIC 47 + PERIOD 7)의 source of truth**다.
- `app/lib/premiumCatalog.ts`(`listTopicCatalogProducts()`/`listPeriodCatalogProducts()`)는 registry 전체가 아니라 `getLaunchProductIds()`와 교집합인 상품만 `/result` Premium Catalog에 노출한다.
- `/checkout/[productId]`, `/paid-analysis/[productId]`, `/paid-analysis/[productId]/report`는 registry 전체(88+legacy)를 대상으로 동작하는 **범용 dynamic route**이며, Launch 54종으로 제한되어 있지 않다. 즉 카탈로그 노출은 54종으로 제한되어 있지만, 그 외 상품도 URL을 직접 알면 상세/구매 페이지 자체는 열린다.
- `getPaidAnalysisEngine()`(`app/lib/paidAnalysisEngine.ts`)의 `PRODUCT_ENGINE_MAP`도 정확히 Launch 54종만 매핑하며, 나머지 taxonomy 상품(Phase 2)은 의도적으로 제외되어 있다("Launch-scope mapping only; Phase 2 products are intentionally absent").

## 4. 공용 OpenAI 호출 지점

Free/Paid 두 흐름 모두 결국 `app/lib/ai.ts`의 `generateAnalysisText()` 하나를 통해서만 OpenAI를 호출한다. `callType`(`"main-analysis"` / `"paid-analysis-detail"` 등)으로 호출 목적을 구분한다.
