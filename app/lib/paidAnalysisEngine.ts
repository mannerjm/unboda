import { getCanonicalPremiumProductId } from "./premiumProductRegistry";

export type PaidAnalysisEngine =
  | "CAREER"
  | "MONEY"
  | "RELATIONSHIP"
  | "HEALTH"
  | "STUDY"
  | "BUSINESS"
  | "PERIOD";

/** Launch-scope mapping only; Phase 2 products are intentionally absent. */
const PRODUCT_ENGINE_MAP: Record<string, PaidAnalysisEngine> = {
  career: "CAREER",
  "career-job-change": "CAREER",
  "career-job-fit": "CAREER",
  "career-specialization": "CAREER",
  "career-promotion-readiness": "CAREER",
  "career-workplace-adaptation": "CAREER",
  "career-leadership-readiness": "CAREER",
  "career-freelance-transition": "CAREER",
  "career-workload-recovery": "CAREER",
  "career-workplace-relationships": "CAREER",
  wealth: "MONEY",
  "money-wealth-accumulation": "MONEY",
  "money-leak-risk": "MONEY",
  "money-saving-discipline": "MONEY",
  "money-shared-finance": "MONEY",
  "money-contract-commitment": "MONEY",
  "money-spending-decision": "MONEY",
  relationship: "RELATIONSHIP",
  "relationship-current": "RELATIONSHIP",
  "relationship-marriage": "RELATIONSHIP",
  "relationship-new-connection": "RELATIONSHIP",
  "relationship-partner-pattern": "RELATIONSHIP",
  "relationship-intimacy": "RELATIONSHIP",
  "relationship-conflict": "RELATIONSHIP",
  "relationship-boundary": "RELATIONSHIP",
  "relationship-reunion": "RELATIONSHIP",
  "relationship-long-distance": "RELATIONSHIP",
  "relationship-unrequited": "RELATIONSHIP",
  "relationship-friendship": "RELATIONSHIP",
  "relationship-family-role": "RELATIONSHIP",
  "health-energy-recovery": "HEALTH",
  "health-sleep-rhythm": "HEALTH",
  "health-stress-regulation": "HEALTH",
  "health-burnout-risk": "HEALTH",
  "health-habit-continuity": "HEALTH",
  "health-body-signal-review": "HEALTH",
  "study-learning-strategy": "STUDY",
  "study-exam-preparation": "STUDY",
  "study-focus-routine": "STUDY",
  "study-credential-decision": "STUDY",
  "business-startup-readiness": "BUSINESS",
  "business-expansion-control": "BUSINESS",
  "business-client-relationship": "BUSINESS",
  "business-team-management": "BUSINESS",
  "daeun-current": "PERIOD",
  "monthly-current": "PERIOD",
    "yearly-current": "PERIOD",
    "monthly-next": "PERIOD",
  "annual-next": "PERIOD",
  "annual-3years": "PERIOD",
  "lifetime-overview": "PERIOD",
  "money-income-stability": "MONEY",
  "money-debt-repayment": "MONEY",
  "money-emergency-buffer": "MONEY",
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

const HEALTH_ENGINE_RULES = `[HEALTH Engine 규칙]
- 건강·웰빙 분석은 생활 리듬, 업무·일상 부담, 관찰 가능한 회복 신호와 검토 행동으로 설명한다.
- 질병, 정신질환, 임상적 번아웃, 치료 필요성, 의학적 원인이나 예후를 진단·단정하지 않는다.
- 증상이 지속되거나 일상 기능이 크게 흔들리는 경우에는 진단 대신 실제 의료·전문가 상담이 필요한 관찰 기준만 제시한다.
- TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰을 본문 중심으로 최우선 적용한다.
- TopicConfig에서 제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다.`;

const STUDY_ENGINE_RULES = `[STUDY Engine 규칙]
- 학습 분석은 학습 구조, 연습·복습, 집중 환경, 진척 증거와 검토 행동으로 설명한다.
- 합격·불합격·점수·입학 결과, 지능·ADHD·학습장애 진단, 학업 성공 시점을 예측·보장하지 않는다.
- TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰을 본문 중심으로 최우선 적용한다.
- TopicConfig에서 제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다.`;

const BUSINESS_ENGINE_RULES = `[BUSINESS Engine 규칙]
- 사업 분석은 운영 책임, 가설 검증, 고객 범위, 의사결정권, 위임, 용량과 검토 기준으로 설명한다.
- 매출·고객 확보·사업 성공·투자 수익을 보장하거나, 시장 사실·법률·세무 결론을 만들거나, 정확한 성공 시점을 예측하지 않는다.
- TopicConfig의 단일 질문과 반드시 다룰 핵심 통찰을 본문 중심으로 최우선 적용한다.
- TopicConfig에서 제외한 범위를 핵심 결론이나 주된 action으로 확장하지 않는다.`;

const PERIOD_ENGINE_RULES = `[PERIOD Engine 규칙]
- 이 리포트가 답해야 하는 축은 "지금 어느 국면에 있고 다음 전환을 위해 무엇을 준비할 것인가"이다.
- 기간 해상도와 구간 라벨은 아래 [기간별 분석 전략]을 벗어나지 않는다.
- 기준 기간에 제시되지 않은 간지나 순번을 추정해 만들지 않는다.
- 특정 사건의 발생을 확정하지 않는다.`;

const ENGINE_RULES: Record<PaidAnalysisEngine, string> = {
  CAREER: CAREER_ENGINE_RULES,
  MONEY: MONEY_ENGINE_RULES,
  RELATIONSHIP: RELATIONSHIP_ENGINE_RULES,
  HEALTH: HEALTH_ENGINE_RULES,
  STUDY: STUDY_ENGINE_RULES,
  BUSINESS: BUSINESS_ENGINE_RULES,
  PERIOD: PERIOD_ENGINE_RULES,
};

export function getPaidAnalysisEngineRules(
  engine: PaidAnalysisEngine,
): string {
  return ENGINE_RULES[engine];
}
