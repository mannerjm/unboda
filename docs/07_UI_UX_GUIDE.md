운보다 디자인 철학.

예)

컬러

폰트

버튼

카드

간격

애니메이션

로딩

결과 화면

결제 화면

보고서 화면

그리고

UX 원칙

3초 안에 이해

1클릭 이동

CTA 위치

결제 유도

심리적 흐름

Premium 분석 탐색 UI의 기본 구조를 다음과 같이 정의한다.


무료 사주 결과
↓
Premium Discovery


A. AI 추천 심층분석

사용자의 현재 명리 흐름을 기준으로
우선순위가 높은 분석 Top 3를 보여준다.

각 카드에는 최소한 다음 정보를 제공한다.

- 상품명
- 추천 순위
- 추천 이유
- 지금 확인할 가치
- 심층 분석 확인하기


B. 원하는 분석 직접 선택

AI 추천 카드 아래에
사용자가 전체 분석 상품을 직접 탐색할 수 있는 영역을 제공한다.

50개 상품을 한 화면에 단순 나열하지 않는다.

카테고리 또는 필터를 제공한다.


예:

[기간별 운세]

- 올해 세운
- 내년 세운
- 이번 달 월운
- 다음 달 월운
- 12개월 흐름
- 대운


[연애·관계]

- 연애·관계
- 결혼
- 현재 관계
- 새로운 인연
- 인간관계


[돈·직업]

- 재물
- 투자
- 사업
- 직업
- 이직
- 승진


[생활]

- 건강
- 학업
- 가족
- 이동
- 기타


향후 실제 50개 Topic Registry가 확정되면
카테고리는 Registry 데이터에서 생성할 수 있도록 한다.


C. 구매한 분석

사용자가 이미 구매한 분석은
다시 결제하지 않고 조회할 수 있도록 한다.

필요하면 아래 기능을 제공한다.

- 구매한 리포트 조회
- 저장된 결과 조회
- 재조회 가능 여부 표시

## Product Catalog 데이터 원칙

Premium Discovery UI(`app/components/PremiumCatalogSection.tsx`)는
카드 정보를 화면 컴포넌트 안에 하드코딩하지 않는다.

상품명, 설명, 카테고리, kind,
releaseLevel, productId, plugin 정보는
Premium Product Registry(`app/lib/premiumProductRegistry.ts`)에서 읽는다.

UI는 Registry를 표시하는 역할만 담당한다.

### Catalog source of truth와 Launch 54종 제한

`/result`의 Premium Catalog가 실제로 노출하는 상품은 Registry 전체가 아니라
**`app/lib/paidAnalysisTopicConfig.ts`의 `getLaunchProductIds()`가 반환하는 Launch 54종으로 제한**된다
(`app/lib/premiumCatalog.ts`의 `listTopicCatalogProducts()`/`listPeriodCatalogProducts()`가 이 제한을 적용한다).

- TOPIC 47 + PERIOD 7 = 총 54개
- 카테고리별 TOPIC 개수(브라우저 QA로 확인됨): 성장운 4 / 사업운 4 / 건강운 6 / 재물운 10 / 직업운 10 / 대인관계운 2 / 관계운 11
- legacy 일반형 `career`, `wealth`, `relationship`은 Launch 54종에 포함되어 정상 노출된다
- legacy 일반형 `health`와 period `monthly-12months`는 Launch 54종이 아니므로 카탈로그에 노출되지 않는다(taxonomy에는 남아있는 Phase 2/dormant 데이터)

ANALYSIS_TOPICS(80개)/PERIOD_ANALYSIS_PRODUCTS(8개) 전체 taxonomy에 상품을 추가해도,
`getLaunchProductIds()`에 추가하지 않는 한 카탈로그 노출은 자동으로 늘어나지 않는다.

Premium Product는 UI에서 다음 두 관점으로 탐색할 수 있다.

분석 방식:

- Topic Analysis
- Period Analysis

Topic Analysis 예:
직업, 이직, 연애, 결혼, 재물, 사업, 인간관계

Period Analysis 예:
올해 세운, 내년 세운, 이번 달 월운,
다음 달 월운, 10년 대운

(12개월 흐름은 `monthly-12months`로 taxonomy에 존재하나 현재 Launch 카탈로그에는 비노출 상태다.)

사용자는 상품의 내부 Plugin 구조를 알 필요가 없다.

UI에서는 사용자가 이해하기 쉬운 카테고리와 상품명만 보여준다.

### CTA 상태 (실제 코드 기준: `PremiumCatalogSection.tsx`의 `ACTION_LABELS`/`STATUS_LABELS`)

| 상태 | 상태 라벨 | CTA 문구 | 이동 경로 |
|---|---|---|---|
| 미보유(`not_purchased`) | 미보유 | "구매하기" | `/checkout/{productId}?profileId=...` |
| 보유·생성 전(`none`) | 보유 · 생성 전 | "심층 분석 생성하기" | `/paid-analysis/{productId}/report?profileId=...` |
| 생성 중(`generating`) | 생성 중 | "생성 중"(비활성 버튼) | 이동 없음 |
| 완료(`completed`) | 리포트 완료 | "리포트 보기" | `/paid-analysis/{productId}/report?profileId=...` |
| 생성 실패(`failed`) | 생성 실패 | "다시 생성하기" | `/paid-analysis/{productId}/report?profileId=...` |

동일 상품을 이미 구매한 사용자가
다시 결제 화면으로 이동하지 않도록 한다(`not_purchased`가 아니면 항상 `/paid-analysis/.../report`로 이동).

profileId는 모든 CTA 링크에 `?profileId=...`로 전달되며(`withProfile()` 헬퍼),
카드 구매 상태 조회(`/api/premium-catalog/status`)도 같은 profileId로 스코프된다.

AI 추천 Top 3가 존재하더라도
직접 선택 Catalog를 숨기지 않는다.

추천 상품만 보여주고
다른 Premium 상품으로 이동할 수 없는 UX를 만들지 않는다.