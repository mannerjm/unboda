import { getCanonicalPremiumProductId } from "./premiumProductRegistry";
import { getPeriodAnalysisStrategy } from "./analysisPeriodStrategy";
import { getPaidAnalysisEngine, type PaidAnalysisEngine } from "./paidAnalysisEngine";
import type {
  PaidAnalysisDecisionDirection,
  PaidAnalysisEvidenceKey,
} from "./paidAnalysisDetailOutput";

/** decision products ask the model for decisionCheck; exploration products must not. */
export type PaidAnalysisDecisionType = "decision" | "exploration";

export type PaidAnalysisTopicInsight = {
  id: string;
  prompt: string;
};

/**
 * Only the values that specialise the AI contract. Product metadata (title, price,
 * description) stays in premiumProductRegistry / analysisTopics and is never copied here.
 */
export type PaidAnalysisTopicConfig = {
  productId: string;
  engine: PaidAnalysisEngine;
  userQuestion: string;
  analysisFocus: string[];
  requiredInsights: PaidAnalysisTopicInsight[];
  excludedFocus?: PaidAnalysisTopicInsight[];
  evidenceFocus: PaidAnalysisEvidenceKey[];
  decisionCriteria: Record<PaidAnalysisDecisionDirection, string>;
  decisionType: PaidAnalysisDecisionType;
  actionFocus: string[];
  prohibitedClaims: string[];
};

const LAUNCH_TOPIC_CONFIGS: PaidAnalysisTopicConfig[] = [
  {
    productId: "career",
    engine: "CAREER",
    userQuestion:
      "현재 커리어 전체에서 무엇을 확대·유지·조정·보류해야 하는가?",
    analysisFocus: [
      "지금 맡은 역할이 타고난 작동 방식과 얼마나 맞는지",
      "커리어에서 반복되는 강점과 반복되는 문제의 구조",
      "앞으로 역할이 달라질 수 있는 조건",
    ],
    requiredInsights: [
      {
        id: "overall-career-pattern",
        prompt: "현재 커리어에서 반복되는 강점과 문제의 구조를 설명한다.",
      },
      {
        id: "current-career-direction",
        prompt: "현재 역할과 업무 경계에서 조정할 방향을 제시한다.",
      },
      {
        id: "career-adjustment-action",
        prompt: "현실의 업무 조건을 점검하고 조정할 행동을 제시한다.",
      },
    ],
    evidenceFocus: [
      "fortune_brain",
      "strength",
      "gyeokguk",
      "element_relations",
      "fortune_flow",
    ],
    decisionCriteria: {
      확대: "역할과 책임의 범위를 넓히는 방향",
      유지: "현재 역할과 조직을 그대로 유지하는 방향",
      조정: "역할 비중과 업무 경계를 다시 정리하는 방향",
      보류: "커리어 전반의 큰 결정을 미루고 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "현재 역할과 실제 업무의 차이를 점검하는 행동",
      "반복 소진 업무를 유형별로 분류하는 행동",
      "강점이 쓰이는 업무 비중을 조정하는 행동",
    ],
    prohibitedClaims: [
      "특정 직업이나 직무를 정답처럼 제시",
      "연봉 수준 예측",
      "이직 시기를 날짜로 단정",
    ],
  },
  {
    productId: "career-job-change",
    engine: "CAREER",
    userQuestion: "지금 이동할 것인가, 남을 것인가?",
    analysisFocus: [
      "잔류와 이동을 가르는 판단 조건",
      "변화가 기회로 작용하기 시작하는 신호",
      "이동 이후 자리를 잡기 위해 필요한 조건",
    ],
    requiredInsights: [],
    evidenceFocus: [
      "strength",
      "fortune_flow",
      "element_relations",
      "daeun",
      "fortune_brain",
    ],
    decisionCriteria: {
      확대: "이동을 준비하고 지원·협상을 추진하는 방향",
      유지: "현재 자리를 유지하며 성과를 쌓는 방향",
      조정: "현재 직무·역할·근무 조건을 재협상하는 방향",
      보류: "이동 결정을 유예하고 조건을 관찰하는 방향",
    },
    decisionType: "decision",
    actionFocus: [
      "이동 판단 기준을 문서로 정리하는 행동",
      "현재 조직에서 재협상 가능한 조건을 확인하는 행동",
      "이동 후 정착 조건을 미리 점검하는 행동",
    ],
    prohibitedClaims: [
      "이직 시기를 특정 연도나 월로 단정",
      "합격이나 채용 결과 확정",
      "특정 회사 추천",
    ],
  },
  {
    productId: "career-job-fit",
    engine: "CAREER",
    userQuestion:
      "나는 어떤 방식으로 일할 때 강점이 가장 잘 작동하는가?",
    analysisFocus: [
      "강점이 살아나는 역할 유형",
      "혼자 집중하는 일과 사람을 상대하는 일 중 유리한 방향",
      "체계적인 조직과 유연한 환경 중 맞는 근무 조건",
    ],
    requiredInsights: [
      {
        id: "work-style-fit",
        prompt: "혼자 깊게 처리하는 방식과 사람·협업을 통해 성과가 나는 방식 중 강점이 재현되는 조건을 구분한다.",
      },
      {
        id: "role-environment-fit",
        prompt: "역할 책임, 업무 유형, 체계성·자율성 같은 환경 조건이 강점 발휘에 미치는 영향을 설명한다.",
      },
      {
        id: "strength-application",
        prompt: "타고난 강점을 일반 성격이 아니라 실제 업무 산출·협업·문제 해결 방식으로 번역한다.",
      },
      {
        id: "fit-verification-action",
        prompt: "현재 업무에서 적합성을 검증할 수 있는 관찰 기준과 비교 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "specialization-roadmap",
        prompt: "장기 전문 역량의 축적 로드맵과 깊이 설계",
      },
      {
        id: "recognition-path",
        prompt: "전문성의 인정·평가·성과 연결 경로",
      },
      {
        id: "career-move-decision",
        prompt: "이직·잔류·직무 이동의 종합 결정",
      },
    ],
    evidenceFocus: [
      "gyeokguk",
      "fortune_brain",
      "strength",
      "element_relations",
      "element_balance",
    ],
    decisionCriteria: {
      확대: "강점이 작동하는 업무 영역을 넓히는 방향",
      유지: "현재 일하는 방식을 그대로 유지하는 방향",
      조정: "업무 유형의 비중을 다시 배분하는 방향",
      보류: "새로운 역할 시도를 미루고 현재 방식을 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "최근 업무를 업무 방식과 성과 조건별로 분류하는 행동",
      "역할·환경별로 강점이 재현되는 조건을 비교하는 행동",
      "현재 업무에서 적합성을 검증할 관찰 기준을 설정하는 행동",
    ],
    prohibitedClaims: [
      "직업명을 나열해 정답처럼 제시",
      "적성을 고정된 운명으로 단정",
      "이직 여부를 결론으로 제시",
    ],
  },
  {
    productId: "career-specialization",
    engine: "CAREER",
    userQuestion:
      "어떤 전문 역량을 어느 정도 깊이로 쌓아야 장기 경쟁력과 인정 가능한 성과로 연결되는가?",
    analysisFocus: [
      "장기 축적할 전문 역량 방향",
      "깊이와 넓이의 우선순위",
      "전문성이 평가·성과·기회로 연결되는 경로",
    ],
    requiredInsights: [
      {
        id: "specialization-direction",
        prompt: "장기적으로 깊게 축적할 가치가 큰 전문 역량의 방향과 선택 기준을 설명한다.",
      },
      {
        id: "depth-vs-breadth",
        prompt: "넓게 확장하는 방식과 한 축을 깊게 다지는 방식 중 현재 더 유리한 축적 전략을 구분한다.",
      },
      {
        id: "recognition-path",
        prompt: "전문성이 평가·성과·기회로 연결되려면 어떤 결과물·적용 경험·검증 경로가 필요한지 제시한다.",
      },
      {
        id: "specialization-accumulation-action",
        prompt: "역량을 선택하고 깊이를 누적할 수 있는 현실적인 학습·실무 적용 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "overall-job-fit-profile",
        prompt: "전체 직무 적성 및 업무 방식의 종합 프로필",
      },
      {
        id: "organization-environment-fit",
        prompt: "조직 문화와 근무 환경의 종합 적합성 판단",
      },
      {
        id: "career-move-decision",
        prompt: "이직·잔류·직무 이동의 종합 결정",
      },
    ],
    evidenceFocus: [
      "fortune_brain",
      "gyeokguk",
      "strength",
      "fortune_flow",
      "element_relations",
    ],
    decisionCriteria: {
      확대: "전문 역량의 적용 범위와 축적 비중을 넓히는 방향",
      유지: "현재 전문 역량의 축적 방식을 그대로 유지하는 방향",
      조정: "역량의 깊이와 넓이의 비중을 다시 배분하는 방향",
      보류: "새로운 전문 분야의 선택을 미루고 현재 축적 방식을 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "깊게 축적할 역량 축을 하나로 좁히는 행동",
      "넓이와 깊이의 투자 비중을 비교하는 행동",
      "역량을 결과물·실무 적용·평가 근거로 연결하는 행동",
    ],
    prohibitedClaims: [
      "특정 직업 또는 전문 분야가 유일한 정답이라고 단정",
      "전문성 결과·승진·합격·연봉 상승 보장",
      "근거 없는 전문성 성과 시점 확정",
    ],
  },
  {
    productId: "wealth",
    engine: "MONEY",
    userQuestion:
      "재물 구조 전반에서 지금 무엇을 확대·유지·조정·보류해야 하는가?",
    analysisFocus: [
      "수입 경로의 질과 지속 가능성",
      "유출 구조와 활동 비용의 통제 가능성",
      "현재 재물 운영에서 위험 분산과 방향을 판단하는 기준",
    ],
    requiredInsights: [
      {
        id: "income-path-quality",
        prompt: "수입 경로가 비용과 책임을 제외하고도 지속 가능한지 설명한다.",
      },
      {
        id: "outflow-control",
        prompt: "지출과 활동 비용 중 사용자가 통제할 수 있는 구조를 구분한다.",
      },
      {
        id: "activity-contract-efficiency",
        prompt: "활동이나 계약이 비용과 책임 대비 효율적인지 판단 기준을 제시한다.",
      },
      {
        id: "overall-money-direction",
        prompt: "현재 재물 운영 전체에서 확대·유지·조정·보류 중 하나의 방향을 정한다.",
      },
    ],
    excludedFocus: [
      {
        id: "accumulation-leak-pattern",
        prompt: "반복 누수의 상세 원인을 진단하는 분석",
      },
      {
        id: "preservation-capacity-design",
        prompt: "보존선·잔여분·저축 여력을 설계하는 분석",
      },
      {
        id: "income-allocation-routine",
        prompt: "수입 직후 배분 루틴과 축적 실패 패턴을 다루는 분석",
      },
    ],
    evidenceFocus: [
      "element_relations",
      "strength",
      "fortune_flow",
      "fortune_brain",
      "yongshin",
    ],
    decisionCriteria: {
      확대: "수입과 활동 범위를 넓히는 방향",
      유지: "현재 재물 구조를 그대로 유지하는 방향",
      조정: "지출과 계약 구조를 다시 정리하는 방향",
      보류: "새로운 재무 결정을 유예하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "수입 경로별 비용과 책임을 비교하는 행동",
      "활동과 계약의 비용 대비 효율을 점검하는 행동",
      "재물 운영의 위험 분산 기준을 정리하는 행동",
    ],
    prohibitedClaims: [
      "3개월·6개월·1년처럼 계산 근거가 없는 기간 약속",
      "수익률이나 금액 제시",
      "특정 투자 상품 추천",
    ],
  },
  {
    productId: "money-wealth-accumulation",
    engine: "MONEY",
    userQuestion:
      "왜 돈이 들어와도 쌓이지 않으며 무엇을 조정해야 하는가?",
    analysisFocus: [
      "축적을 막는 구조적 원인",
      "보존과 확대 중 지금 우선해야 할 것",
      "지출과 분산이 반복되는 지점",
    ],
    requiredInsights: [
      {
        id: "accumulation-leak-pattern",
        prompt: "돈이 들어와도 축적을 막는 반복 누수 구조를 설명한다.",
      },
      {
        id: "preservation-capacity-design",
        prompt: "보존선과 저축 여력이 무너지는 조건을 구분한다.",
      },
      {
        id: "income-allocation-routine",
        prompt: "수입 증가와 지출·활동 증가가 함께 커지는 경로를 설명한다.",
      },
      {
        id: "accumulation-improvement-action",
        prompt: "잔여분을 남기기 위해 바꿀 수 있는 축적 개선 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "overall-money-direction",
        prompt: "전체 재물 운영의 확대·유지·조정·보류 종합 판단",
      },
      {
        id: "activity-contract-efficiency",
        prompt: "계약의 종합 타당성과 신규 수입원 확대 여부의 판단",
      },
      {
        id: "investment-and-portfolio-judgment",
        prompt: "투자 상품 선택과 단기 수익 기회를 평가하는 분석",
      },
    ],
    evidenceFocus: [
      "element_relations",
      "strength",
      "fortune_brain",
      "element_balance",
      "fortune_flow",
    ],
    decisionCriteria: {
      확대: "축적을 해치지 않는 범위에서 수입원과 저축 여력을 넓히는 방향",
      유지: "현재 축적 방식을 그대로 유지하는 방향",
      조정: "보존 구조를 다시 설계하는 방향",
      보류: "새로운 축적 시도를 미루고 지출 구조를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "반복 지출과 잔여분 소실 경로를 분류하는 행동",
      "수입 직후 보존 몫과 운영 몫을 구분하는 행동",
      "수입 증가에 따라 함께 늘어난 지출을 분리하는 행동",
    ],
    prohibitedClaims: [
      "투자·계약 전반의 판단을 결론으로 제시",
      "저축 상품이나 금액 제시",
      "축적 결과를 보장",
    ],
  },
  {
    productId: "relationship",
    engine: "RELATIONSHIP",
    userQuestion:
      "관계 전반에서 지금 무엇을 유지하고 무엇을 조정해야 하는가?",
    analysisFocus: [
      "관계에서 반복되는 패턴",
      "관계 변화가 강해지는 촉발 조건",
      "갈등과 거리감이 커지는 지점",
    ],
    requiredInsights: [
      {
        id: "relationship-pattern-map",
        prompt: "여러 관계에서 반복되는 거리·갈등·감정 소모의 패턴을 구분한다.",
      },
      {
        id: "relationship-trigger-boundary",
        prompt: "관계 변화가 시작되는 촉발 조건과 유지할 거리 기준을 설명한다.",
      },
      {
        id: "relationship-response-pattern",
        prompt: "사용자의 반응 방식이 관계 유지와 소모에 어떤 영향을 주는지 확인 가능한 행동과 신호로 설명한다.",
      },
      {
        id: "relationship-general-adjustment",
        prompt: "관계 유형별로 적용할 조정 행동과 검증 기준을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "current-relationship-decision",
        prompt: "특정 현재 관계를 이어갈지 조정할지에 대한 결론",
      },
      {
        id: "current-relationship-signal-check",
        prompt: "특정 관계의 연락·약속·대화 재개 신호를 근거로 한 판단",
      },
      {
        id: "marriage-or-reunion-decision",
        prompt: "결혼·재회처럼 특정 관계 결과를 결정하는 판단",
      },
    ],
    evidenceFocus: [
      "fortune_flow",
      "element_relations",
      "strength",
      "daeun",
      "fortune_brain",
    ],
    decisionCriteria: {
      확대: "관계의 접점과 교류를 넓히는 방향",
      유지: "현재 관계 방식을 그대로 유지하는 방향",
      조정: "거리와 경계를 다시 설정하는 방향",
      보류: "관계에 대한 결정을 미루고 신호를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "반복 갈등이 시작되는 상황을 기록하는 행동",
      "관계별로 유지하는 거리 기준을 정리하는 행동",
      "감정 소모가 커지는 조건을 확인하는 행동",
    ],
    prohibitedClaims: [
      "상대의 감정이나 의도 단정",
      "결혼·이별 시점 제시",
      "관계 결과 보장",
    ],
  },
  {
    productId: "relationship-current",
    engine: "RELATIONSHIP",
    userQuestion:
      "현재 관계를 이어갈지 조정할지 판단하려면 무엇을 확인해야 하는가?",
    analysisFocus: [
      "현재 관계에서 반복되는 패턴과 촉발 조건",
      "연락 빈도·약속 변경·대화 재개처럼 확인 가능한 신호",
      "관계를 이어갈지 조정할지 가르는 기준",
    ],
    requiredInsights: [
      {
        id: "current-relationship-core-problem",
        prompt: "현재 관계에서 반복되는 핵심 문제와 그 문제가 지속·조정 판단에 미치는 영향을 설명한다.",
      },
      {
        id: "observable-relationship-signals",
        prompt: "연락, 약속, 대화 재개, 갈등 후 반응처럼 실제로 확인 가능한 신호를 구분한다.",
      },
      {
        id: "continue-adjust-criteria",
        prompt: "이어갈 조건과 조정할 조건을 서로 다른 판단 기준으로 제시한다.",
      },
      {
        id: "current-relationship-action",
        prompt: "현재 관계에서 다음 대화·거리·규칙을 검증할 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "overall-relationship-profile",
        prompt: "여러 관계를 포괄하는 전반적 관계 성향과 반복 패턴의 종합 프로필",
      },
      {
        id: "relationship-type-boundary-design",
        prompt: "관계 유형별로 적용하는 장기 거리·경계 운영 설계",
      },
      {
        id: "marriage-or-reunion-decision",
        prompt: "결혼·재회처럼 현재 관계의 지속·조정 판단을 넘어서는 결과 결정",
      },
    ],
    evidenceFocus: [
      "fortune_flow",
      "element_relations",
      "strength",
      "seun",
      "daeun",
    ],
    decisionCriteria: {
      확대: "관계를 한 단계 진전시키는 방향",
      유지: "현재 관계를 그대로 이어가는 방향",
      조정: "관계의 거리와 규칙을 다시 정하는 방향",
      보류: "관계에 대한 결론을 유예하고 신호를 관찰하는 방향",
    },
    decisionType: "decision",
    actionFocus: [
      "관찰할 신호 세 가지를 정해 일정 기간 확인하는 행동",
      "갈등 직후가 아닌 시점에 대화 조건을 설계하는 행동",
      "이어갈 기준과 조정할 기준을 각각 문장으로 적는 행동",
    ],
    prohibitedClaims: [
      "상대가 어떤 마음인지 단정",
      "재회나 이별 보장",
      "특정 날짜에 상황이 달라진다는 예측",
    ],
  },
];

const LAUNCH_TOPIC_CONFIG_MAP = new Map(
  LAUNCH_TOPIC_CONFIGS.map((config) => [config.productId, config]),
);

/** PERIOD products are specialised by analysisPeriodStrategy, not by a topic config. */
const PERIOD_LAUNCH_PRODUCT_IDS = ["daeun-current"];

export type PaidAnalysisLaunchSpecialization =
  | { kind: "topic"; config: PaidAnalysisTopicConfig }
  | { kind: "period"; productId: string; engine: PaidAnalysisEngine }
  | { kind: "none" };

export function getPaidAnalysisTopicConfig(
  productId?: string,
): PaidAnalysisTopicConfig | undefined {
  if (!productId) {
    return undefined;
  }

  return LAUNCH_TOPIC_CONFIG_MAP.get(getCanonicalPremiumProductId(productId));
}

export function getLaunchProductIds(): string[] {
  return [
    ...LAUNCH_TOPIC_CONFIGS.map((config) => config.productId),
    ...PERIOD_LAUNCH_PRODUCT_IDS,
  ];
}

/**
 * Tells callers whether a product has Launch-level specialisation. Products outside
 * the Launch set resolve to "none" so nothing pretends to be specialised.
 */
export function resolvePaidAnalysisLaunchSpecialization(
  productId?: string,
): PaidAnalysisLaunchSpecialization {
  const config = getPaidAnalysisTopicConfig(productId);

  if (config) {
    return { kind: "topic", config };
  }

  if (!productId) {
    return { kind: "none" };
  }

  const canonicalProductId = getCanonicalPremiumProductId(productId);
  const engine = getPaidAnalysisEngine(canonicalProductId);

  if (
    engine === "PERIOD" &&
    PERIOD_LAUNCH_PRODUCT_IDS.includes(canonicalProductId) &&
    getPeriodAnalysisStrategy(canonicalProductId)
  ) {
    return { kind: "period", productId: canonicalProductId, engine };
  }

  return { kind: "none" };
}

export function formatTopicConfigForPrompt(
  config: PaidAnalysisTopicConfig,
): string {
  const decisionLines = (
    Object.entries(config.decisionCriteria) as [
      PaidAnalysisDecisionDirection,
      string,
    ][]
  ).map(([direction, meaning]) => `  - ${direction}: ${meaning}`);

  const decisionCheckRule =
    config.decisionType === "decision"
      ? "- 이 상품은 의사결정형이다. decisionCheck에 예 또는 아니오로 답할 수 있는 확인 질문을 3개 이상 5개 이하로 작성한다."
      : "- 이 상품은 탐색형이다. decisionCheck 필드를 출력하지 않는다.";

  const requiredInsightsBlock =
    config.requiredInsights.length > 0
      ? `
[반드시 다룰 핵심 통찰]
${config.requiredInsights.map((item) => `- ${item.prompt}`).join("\n")}
- 각 통찰은 conclusion, coreProblem, cause, current, action 중 최소 한 곳의 중심 내용으로 반영한다.
- 통찰 문구를 단순히 나열해서는 안 된다.
`
      : "";

  const excludedFocusBlock =
    config.excludedFocus && config.excludedFocus.length > 0
      ? `
[이 상품의 경계]
- 다음 영역을 이 리포트의 핵심 결론이나 주된 action으로 확장하지 않는다.
${config.excludedFocus.map((item) => `- ${item.prompt}`).join("\n")}
`
      : "";

  return `[상품 전문화 계약]
- 이 리포트가 답해야 하는 단 하나의 질문: ${config.userQuestion}
- 분석 초점:
${config.analysisFocus.map((item) => `  - ${item}`).join("\n")}
${requiredInsightsBlock}${excludedFocusBlock}
- evidence는 다음 key를 우선 선택한다: ${config.evidenceFocus.join(", ")}
  (해당 근거를 확인할 수 없을 때만 허용된 다른 key를 사용하고, 없는 근거를 만들지 않는다.)
- direction 4값은 이 상품에서 다음을 뜻한다.
${decisionLines.join("\n")}
- action은 다음 방향으로 작성한다.
${config.actionFocus.map((item) => `  - ${item}`).join("\n")}
- 이 상품에서 절대 작성하면 안 되는 것:
${config.prohibitedClaims.map((item) => `  - ${item}`).join("\n")}
${decisionCheckRule}`;
}
