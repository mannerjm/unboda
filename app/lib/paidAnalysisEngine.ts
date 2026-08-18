import { getCanonicalPremiumProductId } from "./premiumProductRegistry";

export type PaidAnalysisEngine =
  | "CAREER"
  | "MONEY"
  | "RELATIONSHIP"
  | "PERIOD";

/** Launch-scope mapping only; Phase 2 products are intentionally absent. */
const PRODUCT_ENGINE_MAP: Record<string, PaidAnalysisEngine> = {
  career: "CAREER",
  "career-job-change": "CAREER",
  "career-job-fit": "CAREER",
  wealth: "MONEY",
  "money-wealth-accumulation": "MONEY",
  relationship: "RELATIONSHIP",
  "relationship-current": "RELATIONSHIP",
  "daeun-current": "PERIOD",
};

export function getPaidAnalysisEngine(
  productId?: string,
): PaidAnalysisEngine | undefined {
  if (!productId) {
    return undefined;
  }

  return PRODUCT_ENGINE_MAP[getCanonicalPremiumProductId(productId)];
}

const CAREER_ENGINE_RULES = `[CAREER Engine 규칙]
- 이 리포트가 답해야 하는 축은 "지금 커리어에서 무엇을 확대·유지·조정·보류할 것인가"이다.
- 역할 적합성, 조직형·독립형 성향, 반복 소진의 원인, 변화가 일어나는 조건, 실행 기준을 다룬다.
- 강점을 나열하지 말고 그 강점이 실제 업무에서 어떻게 작동하는지 설명한다.
- 다음은 절대 작성하지 않는다.
  - 특정 회사나 조직 추천
  - 특정 직업을 운명처럼 단정하는 표현
  - 연봉 수준이나 인상 폭 예측
  - 합격, 승진, 채용 결과의 확정
  - 근거 없는 이직 시점이나 날짜`;

const MONEY_ENGINE_RULES = `[MONEY Engine 규칙]
- 이 리포트가 답해야 하는 축은 "지금 돈의 흐름에서 무엇이 우선인가"이다.
- 버는 구조와 남는 구조를 분리해서 다루고, 분산·손실이 커지는 조건과 확대·보존 조건을 구분한다.
- 금액이 아니라 구조와 판단 기준으로 설명한다.
- 다음은 절대 작성하지 않는다.
  - 특정 투자 상품, 종목, 코인, 부동산 추천
  - 매수·매도·투자 실행 지시
  - 수익률이나 손실 회복 보장
  - 구체적인 투자 금액 지시
- 지출 기록, 한도 설정, 계약 조건 점검처럼 생활에서 직접 확인할 수 있는 관리 기준은 사용한다.`;

const RELATIONSHIP_ENGINE_RULES = `[RELATIONSHIP Engine 규칙]
- 이 리포트가 답해야 하는 축은 "지금 관계에서 무엇을 이어가고 무엇을 조정할 것인가"이다.
- 반복되는 관계 패턴, 마찰이 촉발되는 조건, 거리와 경계의 조절, 사용자가 직접 관찰할 수 있는 신호를 다룬다.
- 연락 빈도, 약속 변경, 갈등 후 대화 재개처럼 확인 가능한 신호를 사용한다.
- 다음은 절대 작성하지 않는다.
  - 상대방의 감정이나 의도를 확정하는 표현
  - 결혼, 이별, 재회의 확정이나 보장
  - 특정 날짜나 시점의 예측
  - "대화를 많이 하세요"처럼 누구에게나 적용되는 조언`;

const PERIOD_ENGINE_RULES = `[PERIOD Engine 규칙]
- 이 리포트가 답해야 하는 축은 "지금 어느 국면에 있고 다음 전환을 위해 무엇을 준비할 것인가"이다.
- 기간 해상도와 구간 라벨은 아래 [기간별 분석 전략]을 벗어나지 않는다.
- 기준 기간에 제시되지 않은 간지나 순번을 추정해 만들지 않는다.
- 특정 사건의 발생을 확정하지 않는다.`;

const ENGINE_RULES: Record<PaidAnalysisEngine, string> = {
  CAREER: CAREER_ENGINE_RULES,
  MONEY: MONEY_ENGINE_RULES,
  RELATIONSHIP: RELATIONSHIP_ENGINE_RULES,
  PERIOD: PERIOD_ENGINE_RULES,
};

export function getPaidAnalysisEngineRules(
  engine: PaidAnalysisEngine,
): string {
  return ENGINE_RULES[engine];
}
