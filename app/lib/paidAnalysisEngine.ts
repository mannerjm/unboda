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
  "career-specialization": "CAREER",
  wealth: "MONEY",
  "money-wealth-accumulation": "MONEY",
  relationship: "RELATIONSHIP",
  "relationship-current": "RELATIONSHIP",
  "relationship-marriage": "RELATIONSHIP",
  "relationship-new-connection": "RELATIONSHIP",
  "relationship-partner-pattern": "RELATIONSHIP",
  "relationship-intimacy": "RELATIONSHIP",
  "relationship-conflict": "RELATIONSHIP",
  "relationship-boundary": "RELATIONSHIP",
  "relationship-reunion": "RELATIONSHIP",
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
- 커리어 분석은 역할, 역량, 환경, 변화 조건을 현실에서 관찰 가능한 기준으로 설명한다.
- 강점은 일반 성격이 아니라 실제 업무에서 어떻게 작동하는지 설명한다.
- TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰을 본문 중심으로 최우선 적용한다.
- TopicConfig에서 제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다.
- 다음은 절대 작성하지 않는다.
  - 특정 회사나 조직 추천
  - 특정 직업을 운명처럼 단정하는 표현
  - 연봉 수준이나 인상 폭 예측
  - 합격, 승진, 채용 결과의 확정
  - 근거 없는 이직 시점이나 날짜`;

const MONEY_ENGINE_RULES = `[MONEY Engine 규칙]
- 금전 분석에서는 수입·유출·보존·위험을 구분해 설명한다.
- 금액이나 결과 보장보다 구조, 조건, 검증 가능한 행동을 중심으로 설명한다.
- TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰을 본문 중심으로 최우선 적용한다.
- TopicConfig에서 제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다.
- 다음은 절대 작성하지 않는다.
  - 특정 투자 상품, 종목, 코인, 부동산 추천
  - 매수·매도·투자 실행 지시
  - 수익률이나 손실 회복 보장
  - 구체적인 투자 금액 지시
- 생활에서 직접 확인할 수 있는 관리 기준만 사용한다.`;

const RELATIONSHIP_ENGINE_RULES = `[RELATIONSHIP Engine 규칙]
- 관계 분석은 사용자가 확인할 수 있는 상호작용, 변화 신호, 행동 기준으로 설명한다.
- TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰을 본문 중심으로 최우선 적용한다.
- TopicConfig에서 제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다.
- 누구에게나 적용되는 추상 조언 대신 관찰 가능한 신호와 행동을 사용한다.
- 다음은 절대 작성하지 않는다.
  - 상대방의 감정이나 의도를 확정하는 표현
  - 결혼, 이별, 재회, 관계 결과의 확정이나 보장
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
