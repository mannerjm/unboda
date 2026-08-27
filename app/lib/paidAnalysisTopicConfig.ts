import { getCanonicalPremiumProductId } from "./premiumProductRegistry";
import { getPeriodAnalysisStrategy } from "./analysisPeriodStrategy";
import { getPaidAnalysisEngine, type PaidAnalysisEngine } from "./paidAnalysisEngine";
import type {
  PaidAnalysisDecisionDirection,
  PaidAnalysisEvidenceKey,
} from "./paidAnalysisDetailOutput";
import type { PaidAnalysisPremiumDepthContract } from "./paidAnalysisV4QualityValidators";

/** decision products ask the model for decisionCheck; exploration products must not. */
export type PaidAnalysisDecisionType = "decision" | "exploration";

export type PaidAnalysisTopicInsight = {
  id: string;
  prompt: string;
};

export type TopicPurchaseDecision = {
  recommendedFor: readonly string[];
  whatItAnalyzes: readonly string[];
  expectedUnderstanding: readonly string[];
  distinction: string;
  decisionQuestion: string;
};

export type PaidAnalysisTopicConfigWithPurchaseDecision =
  PaidAnalysisTopicConfig & { purchaseDecision: TopicPurchaseDecision };

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

function createTopicPurchaseDecision(
  config: PaidAnalysisTopicConfig,
): TopicPurchaseDecision {
  const trimSentence = (value: string) => value
    .replace(/노력কে/g, "노력을")
    .replace(/readiness/g, "준비 상태")
    .replace(/observable difference/g, "관찰 가능한 차이")
    .replace(/observable/g, "관찰 가능한")
    .replace(/evidence/g, "근거")
    .replace(/general relationship/g, "일반 관계")
    .replace(/analysis/g, "분석")
    .replace(/hold\/adjust\/review/g, "보류·조정·재검토")
    .replace(/[.。?？]+$/, "");
  const understandingText = (value: string) => trimSentence(value)
    .replace(/(설명한다|구분한다|제시한다)$/, "에 대한 내용을");
  const firstFocus = config.analysisFocus[0] ?? config.userQuestion;
  const firstAction = config.actionFocus[0] ?? firstFocus;
  const excludedFocus = config.excludedFocus?.[0]?.prompt;

  return {
    recommendedFor: [
      `${trimSentence(config.userQuestion)}에 대한 답이 궁금할 때`,
      `${trimSentence(firstFocus)} 관련 내용을 구체적으로 살펴보고 싶을 때`,
      `${trimSentence(firstAction)}에 대해 점검하고 싶을 때`,
    ],
    whatItAnalyzes: [
      ...config.analysisFocus,
      ...config.requiredInsights.slice(0, 2).map((insight) => trimSentence(insight.prompt)),
    ].slice(0, 5),
    expectedUnderstanding: config.requiredInsights
      .slice(0, 3)
      .map((insight) => `${understandingText(insight.prompt)} 확인할 수 있습니다.`),
    distinction: excludedFocus
      ? `이 분석은 ${trimSentence(excludedFocus)}보다 ${trimSentence(firstFocus)} 관련 내용을 중심으로 살펴봅니다.`
      : `${trimSentence(firstFocus)} 관련 내용을 중심으로 살펴보며, 다른 세부 분석보다 이 분석의 질문과 범위를 먼저 확인합니다.`,
    decisionQuestion: `${trimSentence(config.userQuestion)}?`,
  };
}

const LAUNCH_TOPIC_CONFIGS: PaidAnalysisTopicConfig[] = [
  {
    productId: "career",
    engine: "CAREER",
    userQuestion:
      "현재 커리어 포트폴리오에서 어떤 운영 구조가 안정적이며, 어떤 책임·업무 패턴을 먼저 안정화·재조정·우선화해야 하는가?",
    analysisFocus: [
      "커리어 책임과 업무 패턴에 에너지·성과가 배분되는 운영 구조",
      "반복되는 과부하·분산·우선순위 충돌이 생기는 조건",
      "좁은 적합성·이동·전문성 결정 전에 안정화할 운영 우선순위",
    ],
    requiredInsights: [
      {
        id: "career-operating-structure",
        prompt: "현재 맡은 책임·업무·운영 방식에서 에너지와 성과가 배분되는 구조를 설명한다.",
      },
      {
        id: "career-capacity-strain",
        prompt: "반복되는 과부하·분산·책임 충돌이 커리어 운영을 약화시키는 조건과 관찰 신호를 구분한다.",
      },
      {
        id: "career-priority-stability",
        prompt: "현재 커리어 포트폴리오에서 안정화·재조정·우선화가 필요한 책임과 운영 우선순위를 설명한다.",
      },
      {
        id: "career-operating-review-action",
        prompt: "커리어 운영 기준을 검토하고 다음 주기에서 재배분할 구체 행동과 점검 기준을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "role-environment-fit-diagnosis",
        prompt: "직업·역할·업무 방식·조직 환경 중 무엇이 맞는지 상세 적합성을 진단하는 분석",
      },
      {
        id: "stay-move-transition-decision",
        prompt: "현재 자리에 남을지 이동할지, 퇴사·이직·전환 준비를 판단하는 분석",
      },
      {
        id: "specialization-path-recognition",
        prompt: "선택할 전문 분야·깊이와 넓이·인정 경로를 설계하는 분석",
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
      "책임·업무·성과·에너지 사용을 같은 기준으로 기록하는 행동",
      "반복 과부하와 분산이 생기는 업무 조합을 분류하는 행동",
      "다음 검토 주기에서 줄일 책임·유지할 운영 기준·우선화할 항목을 재배분하는 행동",
    ],
    prohibitedClaims: [
      "특정 직업이나 직무를 정답처럼 제시",
      "연봉 수준 예측",
      "이직 시기를 날짜로 단정",
      "현재 자리를 떠나거나 유지해야 한다는 결론",
      "특정 조직 환경이나 역할이 맞는다고 단정",
      "선택할 전문 분야나 인정 경로를 확정",
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
    requiredInsights: [
      {
        id: "stay-move-decision-criteria",
        prompt: "현재 직무·조직 조건에서 유지·준비·이동을 가르는 관찰 기준을 구분한다.",
      },
      {
        id: "change-readiness-signal",
        prompt: "일시적 불만과 실제 이동 준비 신호를 구분하고, 변화가 기회로 작용할 조건을 설명한다.",
      },
      {
        id: "transition-risk-condition",
        prompt: "이동 뒤 역할·환경·보상·정착에서 확인해야 할 위험 조건과 준비 부족 신호를 제시한다.",
      },
      {
        id: "job-change-preparation-action",
        prompt: "유지·재협상·준비·이동 중 다음 행동을 판단 기준과 함께 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "overall-job-fit-profile",
        prompt: "직업·역할 자체의 적합성과 업무 방식 전반을 종합 프로필로 판단하는 분석",
      },
      {
        id: "specialization-or-promotion-path",
        prompt: "전문성 축적 로드맵이나 현재 조직 안의 승진·책임 확대 경로를 중심으로 하는 분석",
      },
      {
        id: "organization-or-independence-profile",
        prompt: "조직 문화 적합성이나 독립·프리랜서 전환 적합성을 종합적으로 판단하는 분석",
      },
    ],
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
      "반드시 퇴사하거나 이직해야 한다는 단정",
      "이직 성공이나 연봉 상승 보장",
      "현재 회사에 남으면 실패한다는 단정",
      "사주만으로 특정 직장 선택을 확정",
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
    productId: "career-promotion-readiness",
    engine: "CAREER",
    userQuestion:
      "더 큰 역할을 맡을 준비가 되었는지, 어떤 책임·평가 근거의 공백을 먼저 메워야 하는가?",
    analysisFocus: [
      "현재 역할과 다음 역할 사이의 책임 범위 공백",
      "성과가 개인 실행을 넘어 판단·조율·위임의 증거로 전환되는 조건",
      "승진 결과가 아니라 준비도를 검증할 관찰 신호와 역할 실험",
    ],
    requiredInsights: [
      {
        id: "promotion-role-scope-gap",
        prompt: "현재 책임 범위와 더 큰 역할에서 요구되는 판단·조율·책임 범위의 공백을 구분한다.",
      },
      {
        id: "promotion-leadership-evidence",
        prompt: "개인 성과가 아닌 위임·의사결정·협업 조율의 증거가 준비도 판단에 어떻게 연결되는지 설명한다.",
      },
      {
        id: "promotion-evaluation-signal",
        prompt: "피드백, 책임 소유, 반복 가능한 결과처럼 다음 역할 준비도를 확인할 관찰 신호를 제시한다.",
      },
      {
        id: "promotion-readiness-action",
        prompt: "역할 범위를 시험하고 평가 근거를 남길 구체 행동과 다음 검토 기준을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "specialization-depth-portfolio",
        prompt: "전문 역량의 깊이·포트폴리오·장기 인정 경로를 설계하는 분석",
      },
      {
        id: "job-change-stay-move-decision",
        prompt: "현재 자리를 떠날지 남을지 또는 외부 이동을 판단하는 분석",
      },
      {
        id: "leadership-daily-team-management",
        prompt: "직함과 무관한 일상적 팀 운영·위임·피드백 시스템을 설계하는 분석",
      },
    ],
    evidenceFocus: ["gyeokguk", "strength", "fortune_flow", "fortune_brain"],
    decisionCriteria: {
      확대: "검증된 책임 범위와 판단 권한을 한 단계 넓히는 방향",
      유지: "현재 책임 범위에서 평가 근거를 더 축적하는 방향",
      조정: "준비가 약한 책임·조율·위임 범위를 먼저 보완하는 방향",
      보류: "역할 확대 요청을 미루고 준비도 신호를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "다음 역할에서 요구될 판단·조율·책임 항목을 현재 역할과 비교하는 행동",
      "위임·의사결정·협업 조율의 결과를 평가 근거로 남기는 행동",
      "피드백과 반복 결과를 기준으로 역할 확대 준비도를 검토하는 행동",
    ],
    prohibitedClaims: [
      "승진·직급 상승·보직 발령 결과 보장",
      "승진 시기나 평가 결과를 특정 날짜로 단정",
      "특정 상사나 조직의 평가 의도를 단정",
      "현재 회사를 떠나야 승진한다는 결론",
    ],
  },
  {
    productId: "career-workplace-adaptation",
    engine: "CAREER",
    userQuestion:
      "현재 직장 환경에 지속 가능하게 적응하려면 어떤 역할·소통·기대 조건을 먼저 조정해야 하는가?",
    analysisFocus: [
      "온보딩·현재 직장 환경에서 반복되는 적응 마찰",
      "업무 인수인계·회의·피드백에서 기대가 어긋나는 조건",
      "직무 적합성이나 이직 판단 전에 확인할 30일 적응 신호",
    ],
    requiredInsights: [
      {
        id: "workplace-adaptation-friction",
        prompt: "현재 직장 환경에서 역할·업무 속도·소통 방식이 지속 가능성을 약화시키는 적응 마찰을 구분한다.",
      },
      {
        id: "workplace-communication-rhythm",
        prompt: "인수인계, 회의, 피드백의 리듬이 업무 이해와 에너지 소모에 미치는 영향을 설명한다.",
      },
      {
        id: "workplace-expectation-alignment-signal",
        prompt: "책임 범위·우선순위·완료 기준이 정렬되는지 확인할 관찰 신호를 제시한다.",
      },
      {
        id: "workplace-adaptation-action",
        prompt: "현재 환경에서 조정할 조건을 시험하고 다음 적응 주기에 검토할 구체 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "overall-job-fit-diagnosis",
        prompt: "직업·역할·업무 방식 전체의 장기 적합성을 진단하는 분석",
      },
      {
        id: "job-change-decision",
        prompt: "현재 직장을 떠날지 남을지 또는 이직을 준비할지 판단하는 분석",
      },
      {
        id: "promotion-role-readiness",
        prompt: "더 큰 역할이나 승진 준비도를 판단하는 분석",
      },
    ],
    evidenceFocus: ["strength", "element_balance", "fortune_flow", "fortune_brain"],
    decisionCriteria: {
      확대: "현재 환경에서 검증된 역할·소통 방식의 적용 범위를 넓히는 방향",
      유지: "지속 가능한 업무·소통 리듬을 유지하는 방향",
      조정: "기대·우선순위·피드백 조건을 다시 맞추는 방향",
      보류: "직장 적합성의 큰 결론을 미루고 적응 신호를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "업무 인수인계·회의·피드백에서 기대가 어긋난 장면을 기록하는 행동",
      "책임 범위·우선순위·완료 기준을 담당자와 다시 맞추는 행동",
      "30일 동안 적응 마찰과 에너지 소모가 줄어드는지 검토하는 행동",
    ],
    prohibitedClaims: [
      "특정 회사나 조직 문화가 반드시 맞거나 맞지 않는다고 단정",
      "입사·수습·재직 결과 보장",
      "이직이 유일한 해결책이라는 결론",
      "상사·동료의 의도나 평가를 단정",
    ],
  },
  {
    productId: "career-leadership-readiness",
    engine: "CAREER",
    userQuestion:
      "사람을 이끄는 책임을 맡을 때 어떤 위임·피드백·의사결정 조건을 먼저 검증해야 하는가?",
    analysisFocus: [
      "직함과 별개로 사람을 이끄는 방식에서 나타나는 권한·위임·피드백 패턴",
      "결정 병목과 과도한 개인 의존이 생기는 조건",
      "작은 역할 실험으로 리더십 방식을 검증하는 기준",
    ],
    requiredInsights: [
      {
        id: "leadership-authority-style",
        prompt: "권한을 행사하고 책임을 나누는 방식이 팀의 판단과 실행에 미치는 영향을 구분한다.",
      },
      {
        id: "leadership-delegation-risk",
        prompt: "과도한 직접 통제·책임 집중·결정 병목이 생기는 조건과 관찰 신호를 설명한다.",
      },
      {
        id: "leadership-feedback-loop",
        prompt: "피드백과 후속 확인이 사람·업무·결과의 정렬을 만드는지 검증할 신호를 제시한다.",
      },
      {
        id: "leadership-experiment-action",
        prompt: "작은 위임·피드백·결정 실험으로 리더십 방식을 검토할 구체 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "promotion-approval-outcome",
        prompt: "승진·직급·평가 승인 결과와 다음 역할의 공식 준비도를 판단하는 분석",
      },
      {
        id: "business-team-operating-system",
        prompt: "사업 소유자 관점에서 직원·팀의 역할·인수인계·운영 체계를 설계하는 분석",
      },
      {
        id: "job-fit-or-move-decision",
        prompt: "직무 적합성이나 이직·잔류 결정을 판단하는 분석",
      },
    ],
    evidenceFocus: ["gyeokguk", "fortune_brain", "strength", "element_relations"],
    decisionCriteria: {
      확대: "검증된 위임과 판단 책임의 범위를 넓히는 방향",
      유지: "현재의 리더십 실험 범위를 유지하며 피드백을 축적하는 방향",
      조정: "권한·위임·피드백 방식의 병목을 다시 설계하는 방향",
      보류: "사람을 이끄는 책임 확대를 미루고 작은 실험 결과를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "결정이 한 사람에게 몰리는 장면과 위임 가능한 판단을 구분하는 행동",
      "작은 책임을 위임한 뒤 기대·지원·피드백의 후속 이행을 확인하는 행동",
      "팀 반응과 결과를 기준으로 다음 리더십 실험의 범위를 조정하는 행동",
    ],
    prohibitedClaims: [
      "리더·관리자·임원이 될 운명이라고 단정",
      "승진·팀 성과·부하 충성도 보장",
      "특정 구성원의 감정·의도·능력을 단정",
      "사업 조직 운영이나 채용 결론을 제시",
    ],
  },
  {
    productId: "career-freelance-transition",
    engine: "CAREER",
    userQuestion:
      "조직 일을 독립·프리랜서 방식으로 전환하기 전에 어떤 고객·통제·작업 조건을 증명해야 하는가?",
    analysisFocus: [
      "독립 작업에서 자율성과 회복 가능성이 함께 유지되는 조건",
      "고객 범위·요청 변경·작업 통제를 잃는 위험 신호",
      "전환 결과가 아니라 유료 파일럿과 중단 조건으로 검증할 준비도",
    ],
    requiredInsights: [
      {
        id: "freelance-autonomy-capacity-fit",
        prompt: "독립적으로 업무 범위·시간·책임을 운영할 때 자율성과 감당 가능한 작업량이 만나는 조건을 구분한다.",
      },
      {
        id: "freelance-client-boundary-risk",
        prompt: "고객 요청·범위 변경·책임 불명확이 작업 통제와 회복 가능성을 약화시키는 조건을 설명한다.",
      },
      {
        id: "freelance-pipeline-stability-signal",
        prompt: "반복 의뢰·요청 품질·작업 회수처럼 전환 준비도를 확인할 관찰 신호를 제시한다.",
      },
      {
        id: "freelance-transition-test-action",
        prompt: "유료 파일럿·작업 범위·중단 기준을 통해 독립 전환을 시험할 구체 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "general-stay-move-decision",
        prompt: "조직에 남을지 외부 직장으로 이직할지 판단하는 일반 이동 분석",
      },
      {
        id: "business-startup-market-readiness",
        prompt: "사업 시작·시장 성공·매출 확대를 판단하는 창업 분석",
      },
      {
        id: "income-or-investment-guarantee",
        prompt: "독립 후 수입·고객 수·사업 성과를 보장하거나 투자 판단을 제시하는 분석",
      },
    ],
    evidenceFocus: ["strength", "fortune_brain", "fortune_flow", "element_relations"],
    decisionCriteria: {
      확대: "검증된 고객·작업 통제 조건 안에서 독립 작업의 비중을 넓히는 방향",
      유지: "현재 조직 일과 독립 작업의 검증 범위를 유지하는 방향",
      조정: "고객·범위·회복·통제 조건을 다시 정리하는 방향",
      보류: "독립 전환 결정을 미루고 파일럿과 중단 조건을 관찰하는 방향",
    },
    decisionType: "decision",
    actionFocus: [
      "독립 작업에서 통제 가능한 시간·범위·책임 조건을 문장으로 정리하는 행동",
      "고객 요청·범위 변경·대금 회수에서 중단하거나 재협상할 기준을 확인하는 행동",
      "유료 파일럿 결과를 반복 의뢰·작업 회수·회복 가능성으로 검토하는 행동",
    ],
    prohibitedClaims: [
      "프리랜서 전환 성공·수입 증가·고객 확보 보장",
      "퇴사나 독립 전환을 반드시 해야 한다는 결론",
      "특정 고객·업종·계약을 추천하거나 성과를 예언",
      "대출·투자·사업 자금 실행 지시",
    ],
  },
  {
    productId: "career-workload-recovery",
    engine: "CAREER",
    userQuestion:
      "어떤 업무 패턴이 내 역량을 소진시키며, 지속 가능한 성과를 위해 어떤 업무 경계를 회복해야 하는가?",
    analysisFocus: [
      "업무 과부하가 시작되는 책임·일정·재작업의 조합",
      "퇴근 후 침범·결정 피로·회복 지연으로 확인하는 회복 부족 신호",
      "직업 전체 방향이 아닌 현재 업무 주기에서 적용할 업무량·우선순위 경계",
    ],
    requiredInsights: [
      { id: "workload-overload-trigger", prompt: "책임·일정·재작업이 겹쳐 업무 과부하를 시작시키는 조건을 구분한다." },
      { id: "workload-recovery-deficit", prompt: "퇴근 후 침범, 결정 피로, 다음 업무 주기의 회복 지연처럼 회복 부족을 확인할 신호를 제시한다." },
      { id: "workload-priority-conflict", prompt: "우선순위 충돌과 책임 집중이 감당 가능한 업무량을 넘기는 메커니즘을 설명한다." },
      { id: "workload-reset-action", prompt: "업무 경계와 재배분 기준을 시험하고 다음 주기에 검토할 구체 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "broad-career-operating-portfolio", prompt: "커리어 포트폴리오 전체의 책임·성과·우선순위를 종합 운영하는 분석" },
      { id: "medical-burnout-or-treatment", prompt: "의학적 번아웃 진단, 치료, 건강 상태를 판단하는 분석" },
      { id: "job-change-or-environment-decision", prompt: "이직·직장 적합성·조직 이동을 결론으로 판단하는 분석" },
    ],
    evidenceFocus: ["strength", "element_balance", "fortune_flow", "fortune_brain"],
    decisionCriteria: {
      확대: "회복 가능한 범위에서 검증된 업무 책임을 넓히는 방향",
      유지: "현재의 지속 가능한 업무량과 경계를 유지하는 방향",
      조정: "과부하를 만드는 책임·일정·재작업 조합을 재배분하는 방향",
      보류: "새 책임을 더하기 전 회복 부족 신호를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "과부하가 시작된 업무·일정·재작업 조합을 같은 기준으로 기록하는 행동",
      "퇴근 후 침범과 다음 주기 회복 지연을 기준으로 줄일 책임을 정하는 행동",
      "우선순위 충돌 시 중단·위임·재협상할 업무 경계를 검토하는 행동",
    ],
    prohibitedClaims: [
      "건강 상태·질병·번아웃 여부 진단",
      "퇴사·휴직·이직이 유일한 해결책이라는 결론",
      "특정 시점에 반드시 소진된다는 예측",
      "의료·심리 치료 지시",
    ],
  },
  {
    productId: "career-workplace-relationships",
    engine: "CAREER",
    userQuestion:
      "업무 성과를 돕거나 소진시키는 직장 관계는 무엇이며, 어떤 협업 경계를 세워야 하는가?",
    analysisFocus: [
      "요청·공로·책임이 오가는 이해관계자별 상호작용 패턴",
      "역할 충돌·소통 누락·공로 불명확이 업무 성과를 약화시키는 조건",
      "로맨스나 일반 관계 성향이 아닌 업무 요청·공로·에스컬레이션의 협업 경계",
    ],
    requiredInsights: [
      { id: "workplace-stakeholder-pattern", prompt: "상사·동료·협업자와의 업무 요청·공로·책임이 반복되는 상호작용 패턴을 구분한다." },
      { id: "workplace-role-conflict-signal", prompt: "역할 충돌, 소통 누락, 책임 전가가 성과와 에너지를 약화시키는 관찰 신호를 제시한다." },
      { id: "workplace-reciprocity-mechanism", prompt: "요청 명확성, 공로 공유, 후속 이행이 협업의 상호성과 신뢰를 만드는 메커니즘을 설명한다." },
      { id: "workplace-collaboration-boundary-action", prompt: "업무 요청·공로·에스컬레이션에서 적용할 협업 경계와 검토 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "romance-or-general-social-profile", prompt: "연애·친구·가족을 포함한 일반 관계 성향과 감정적 친밀감을 분석하는 범위" },
      { id: "promotion-or-leadership-readiness", prompt: "승진 준비도나 사람을 이끄는 리더십 책임을 판단하는 분석" },
      { id: "organization-fit-or-job-change", prompt: "조직 적합성이나 이직·잔류 결정을 판단하는 분석" },
    ],
    evidenceFocus: ["element_relations", "fortune_brain", "gyeokguk", "strength"],
    decisionCriteria: {
      확대: "요청·공로·책임이 명확한 협업 관계의 범위를 넓히는 방향",
      유지: "상호 이행이 확인된 업무 소통과 경계를 유지하는 방향",
      조정: "역할 충돌과 공로·책임 불명확을 다시 정리하는 방향",
      보류: "관계 해석보다 업무 요청과 후속 이행 신호를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "업무 요청·결정·공로·책임이 어긋난 장면을 이해관계자별로 기록하는 행동",
      "요청 범위·결정권·공로 기준을 협업 전에 문장으로 맞추는 행동",
      "반복 충돌 시 에스컬레이션하거나 경계를 조정할 기준을 검토하는 행동",
    ],
    prohibitedClaims: [
      "상사·동료의 감정·의도·능력을 단정",
      "특정 인물을 멀리하거나 신뢰해야 한다는 결론",
      "승진·평가·해고 결과 보장",
      "로맨스나 일반 인간관계의 결과 판단",
    ],
  },
  {
    productId: "wealth",
    engine: "MONEY",
    userQuestion:
      "현재 내 재정 구조에서 수입·지출·책임·활동·계약이 어떤 방식으로 연결되어 있고, 돈의 흐름을 안정적으로 운영하기 위해 무엇을 우선 조정·점검해야 하는가?",
    analysisFocus: [
      "수입·지출·책임·활동·계약이 연결되는 재정 운영 구조",
      "여러 돈 운영 차원 사이에서 비용·책임·통제 압력이 불균형해지는 조건",
      "축적·손실 통제·저축 루틴 이전에 우선 점검할 재정 운영 순서",
    ],
    requiredInsights: [
      {
        id: "money-operating-structure",
        prompt: "수입·지출·책임·활동·계약이 현재 재정 운영에서 연결되는 구조를 설명한다.",
      },
      {
        id: "money-flow-coordination",
        prompt: "수입 흐름·반복 지출·활동 비용·책임 부담이 서로 조율되거나 충돌하는 조건을 구분한다.",
      },
      {
        id: "money-operating-pressure",
        prompt: "활동·계약·책임이 겹칠 때 재정 운영의 통제와 우선순위가 약해지는 조건과 관찰 신호를 설명한다.",
      },
      {
        id: "money-operating-review-action",
        prompt: "현재 재정 운영에서 먼저 점검·조정·유지할 차원을 정하는 구체 검토 순서와 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "accumulation-preservation-allocation",
        prompt: "잔여분·보존선·축적 여력·자산 축적 구조와 남는 돈의 배분을 설계하는 분석",
      },
      {
        id: "loss-exposure-early-warning",
        prompt: "손실 노출·손실 확대·조기 경고 신호와 계약·공동 부담 위험 통제를 중심으로 하는 분석",
      },
      {
        id: "saving-routine-continuity",
        prompt: "저축·예산 규칙·자동 이체·정기 점검·변동지출 습관의 유지와 재설정을 중심으로 하는 분석",
      },
    ],
    evidenceFocus: [
      "element_relations",
      "fortune_brain",
      "strength",
      "element_balance",
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
      "수입·지출·책임·활동·계약을 같은 기준으로 연결해 기록하는 행동",
      "비용·책임·통제 압력이 겹치는 재정 운영 조합을 분류하는 행동",
      "다음 검토 주기에서 먼저 조정할 운영 차원·유지할 기준·확인할 신호를 우선순위로 정리하는 행동",
    ],
    prohibitedClaims: [
      "3개월·6개월·1년처럼 계산 근거가 없는 기간 약속",
      "수익률이나 금액 제시",
      "특정 투자 상품 추천",
      "정확한 수입·자산·부채·지출 사실을 사주만으로 단정",
      "재물 증가·금융 성공을 보장",
      "특정 손실 금액이나 파산 시점을 예언",
      "대출·투자 실행을 지시",
      "축적 구조·손실 경고·저축 루틴을 중심 결론으로 제시",
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
    productId: "money-leak-risk",
    engine: "MONEY",
    userQuestion:
      "내 돈이 반복적으로 빠져나가거나 손실 노출이 커지는 구조는 무엇이며, 손실을 키우는 지출·계약·충동 판단 신호를 어떻게 감지하고 줄여야 하는가?",
    analysisFocus: [
      "지출·계약·공동 부담에서 손실 노출이 커지는 구조",
      "충동·손실 만회·조건 누락처럼 손실을 키우는 관찰 신호",
      "고정비·현금 흐름·공동 부담에서 재정 통제력이 약해지는 조건",
    ],
    requiredInsights: [
      {
        id: "loss-leak-pattern",
        prompt: "지출·계약·공동 부담에서 반복되는 손실 노출 구조와 통제 범위가 약해지는 지점을 구분한다.",
      },
      {
        id: "spending-risk-signal",
        prompt: "충동 지출, 손실 만회성 판단, 계약 조건 누락처럼 손실을 키우기 전에 확인할 관찰 신호를 제시한다.",
      },
      {
        id: "financial-vulnerability-condition",
        prompt: "경쟁·공동 부담·고정비·현금 흐름 압박이 재정 통제력을 약화시키는 조건을 설명한다.",
      },
      {
        id: "leak-reduction-action",
        prompt: "손실 노출을 줄이기 위해 지출·계약·공동 부담에서 적용할 점검 순서와 구체 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "wealth-accumulation-profile",
        prompt: "잔여분·보존선·축적 여력을 설계하는 자산 축적 분석",
      },
      {
        id: "saving-discipline-routine",
        prompt: "저축 습관, 예산 유지, 정기 자산관리 루틴을 중심으로 하는 분석",
      },
      {
        id: "investment-or-income-expansion",
        prompt: "투자 상품·포트폴리오·새 수입원·사업 수입·소득 확대를 중심으로 하는 분석",
      },
    ],
    evidenceFocus: [
      "element_relations",
      "fortune_brain",
      "strength",
      "element_balance",
      "fortune_flow",
    ],
    decisionCriteria: {
      확대: "새 지출·계약·공동 부담을 늘리기 전에 손실 노출과 통제 조건을 점검하는 방향",
      유지: "현재 지출·계약 기준을 유지하며 손실 신호를 관찰하는 방향",
      조정: "통제 범위가 약한 지출·계약·공동 부담 조건을 다시 정리하는 방향",
      보류: "손실 노출이 큰 지출·계약·투자 판단을 미루고 조건을 재검토하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "손실이 발생한 지출·계약·공동 부담을 같은 기준으로 기록하는 행동",
      "충동·손실 만회·조건 누락 신호를 분리해 확인하는 행동",
      "고정비·공동 부담·계약 조건에서 통제 가능한 범위를 정리하는 행동",
      "손실 노출이 커질 때 중단·재검토할 기준을 문장화하는 행동",
    ],
    prohibitedClaims: [
      "특정 투자 손실·수익 보장",
      "종목·코인·부동산 매수·매도 추천",
      "특정 금액의 손실 예언",
      "특정 월·연도의 파산·손실 시점 단정",
      "대출·투자 실행을 강제하는 결론",
      "사주만으로 실제 소비·부채 사실을 단정",
      "재정 성공·실패를 운명처럼 확정",
    ],
  },
  {
    productId: "money-saving-discipline",
    engine: "MONEY",
    userQuestion:
      "저축·예산·정기 자산관리 기준이 왜 반복해서 무너지며, 월·주 단위로 유지 가능한 관리 루틴과 재설정 기준을 어떻게 만들 것인가?",
    analysisFocus: [
      "저축·예산 기준이 유지되거나 무너지는 반복 조건",
      "변동지출 한도와 실제 사용이 어긋나는 관찰 신호",
      "자동화·정기 점검·기록을 지속 가능한 관리 순서로 만드는 조건",
    ],
    requiredInsights: [
      {
        id: "saving-rule-continuity",
        prompt: "월·주 단위 저축·예산 기준이 유지되거나 무너지는 반복 조건을 구분한다.",
      },
      {
        id: "variable-spending-control",
        prompt: "변동지출에서 사전에 정한 한도와 실제 사용이 어긋나는 관찰 신호를 제시한다.",
      },
      {
        id: "routine-automation-readiness",
        prompt: "자동 이체·정기 점검·잔액 확인·기록이 지속 가능한 반복 구조가 되는 조건을 설명한다.",
      },
      {
        id: "reset-discipline-action",
        prompt: "저축·예산 기준이 깨졌을 때 다음 주기에서 재설정할 구체 행동과 검토 기준을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "accumulation-preservation-capacity",
        prompt: "잔여분 배분·보존선·축적 여력·자산 축적 구조를 설계하는 분석",
      },
      {
        id: "loss-exposure-early-warning",
        prompt: "손실 노출·계약·공동 부담·통제 실패와 조기 경고 위험 감소를 중심으로 하는 분석",
      },
      {
        id: "investment-or-income-expansion",
        prompt: "투자 상품·포트폴리오·새 수입원·사업 수입·소득 확대를 중심으로 하는 분석",
      },
    ],
    evidenceFocus: [
      "element_relations",
      "fortune_brain",
      "strength",
      "element_balance",
      "yongshin",
    ],
    decisionCriteria: {
      확대: "새 저축·관리 규칙을 늘리기 전에 현재 루틴의 유지 조건을 점검하는 방향",
      유지: "현재 저축·예산·정기 점검 순서를 유지하며 지속 신호를 관찰하는 방향",
      조정: "한도·재검토일·자동화 순서를 다시 정리하는 방향",
      보류: "새 관리 도구나 규칙을 늘리기보다 현재 루틴을 재설정하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "월·주 단위 저축·예산 기준을 한도와 재검토일로 문장화하는 행동",
      "변동지출을 기준 내·초과·보류 항목으로 기록하는 행동",
      "자동 이체·정기 점검·잔액 확인을 반복 가능한 순서로 설정하는 행동",
      "기준 유지에 실패했을 때 다음 주기에서 한도와 규칙을 재설정하는 행동",
    ],
    prohibitedClaims: [
      "특정 저축액·자산 증가 보장",
      "부자가 되는 시기 단정",
      "특정 투자 상품·종목·코인·부동산 추천",
      "사주만으로 실제 소비·부채 사실 단정",
      "특정 월·연도 자산 증가 예언",
      "금융 성공·실패 확정",
      "대출·투자·저축 상품 실행 강제",
    ],
  },
  {
    productId: "money-income-stability",
    engine: "MONEY",
    userQuestion:
      "수입이 흔들리거나 안정되는 구조는 무엇이며, 고정비 약속 전에 어떤 지속성 증거를 확인해야 하는가?",
    analysisFocus: [
      "수입원 의존·지급 지연·반복 수요가 만드는 수입 변동성",
      "고정비와 반복 의무가 불안정한 수입 흐름을 압박하는 조건",
      "투자·축적이 아닌 수입 지속성의 관찰 신호와 검토 순서",
    ],
    requiredInsights: [
      { id: "income-volatility-mechanism", prompt: "수입원 의존, 지급 지연, 반복 수요의 변화가 수입 변동성을 만드는 메커니즘을 설명한다." },
      { id: "income-dependency-signal", prompt: "한 수입원 집중, 지급 지연, 반복 의뢰의 품질처럼 지속성을 확인할 관찰 신호를 제시한다." },
      { id: "income-fixed-cost-vulnerability", prompt: "수입이 불안정한 상태에서 고정비와 반복 의무가 통제력을 약화시키는 조건을 구분한다." },
      { id: "income-stability-review-action", prompt: "수입 지속성 증거와 고정비 부담을 비교해 다음 검토 주기에 적용할 구체 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "wealth-accumulation-allocation", prompt: "잔여분·보존선·장기 자산 축적 구조를 설계하는 분석" },
      { id: "saving-routine-maintenance", prompt: "저축·예산·자동화 루틴의 유지와 재설정을 중심으로 하는 분석" },
      { id: "investment-or-income-expansion", prompt: "투자 상품·사업 확장·새 수입원 확보를 추천하거나 실행하는 분석" },
    ],
    evidenceFocus: ["fortune_flow", "strength", "fortune_brain", "element_balance"],
    decisionCriteria: {
      확대: "반복성과 회수 조건이 확인된 수입 활동의 비중을 넓히는 방향",
      유지: "현재 수입 구조와 고정비 부담을 유지하며 지속성을 확인하는 방향",
      조정: "수입원 의존·지급 조건·고정비 약속을 다시 정리하는 방향",
      보류: "새 고정 의무를 더하기 전 수입 지속성 신호를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "수입원별 반복성·지급 지연·회수 조건을 같은 기준으로 기록하는 행동",
      "고정비 약속 전에 수입 지속성 증거와 부담 조건을 비교하는 행동",
      "수입 신호가 흔들릴 때 조정하거나 보류할 기준을 검토하는 행동",
    ],
    prohibitedClaims: [
      "수입 증가·고객 확보·사업 성공 보장",
      "특정 금액·수입 시점 예측",
      "투자·대출·사업 실행 지시",
      "실제 소득·부채 사실을 사주만으로 단정",
    ],
  },
  {
    productId: "money-debt-repayment",
    engine: "MONEY",
    userQuestion:
      "상환 압력이 현금 흐름을 흔드는 조건은 무엇이며, 어떤 검토 순서로 통제력을 지켜야 하는가?",
    analysisFocus: [
      "상환 의무·납부일·생활비 압박이 겹치는 구조",
      "이월·연체 위험·필수 비용 압박으로 확인하는 상환 취약 신호",
      "법률·대출 조언이 아닌 실제 채무 자료 검토와 상환 우선순위의 점검",
    ],
    requiredInsights: [
      { id: "debt-obligation-pressure", prompt: "상환 의무와 반복 납부가 현금 흐름의 통제력을 약화시키는 압박 구조를 설명한다." },
      { id: "debt-repayment-priority-signal", prompt: "납부일 집중, 필수 비용 압박, 지급 지연처럼 상환 우선순위를 다시 봐야 할 관찰 신호를 제시한다." },
      { id: "debt-rollover-risk-condition", prompt: "이월·추가 부담·기존 의무의 누적이 상환 판단을 악화시키는 조건을 구분한다." },
      { id: "debt-review-action", prompt: "실제 채무 자료와 현금 흐름을 검토할 순서 및 다음 검토 주기의 구체 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "creditor-negotiation-or-legal-advice", prompt: "채권자 협상·법률 절차·대출 상품을 추천하거나 법률적 결론을 제시하는 분석" },
      { id: "general-money-leak-exposure", prompt: "지출·계약·공동 부담 전반의 손실 노출을 진단하는 분석" },
      { id: "investment-or-debt-consolidation-execution", prompt: "투자·대출 갈아타기·상환 상품 실행을 지시하는 분석" },
    ],
    evidenceFocus: ["strength", "element_balance", "fortune_flow", "fortune_brain"],
    decisionCriteria: {
      확대: "실제 상환 자료와 회복 여력이 확인된 범위에서 의무를 이행하는 방향",
      유지: "현재 상환 순서와 생활비 경계를 유지하며 압박 신호를 관찰하는 방향",
      조정: "납부일·반복 의무·생활비 압박의 우선순위를 다시 정리하는 방향",
      보류: "추가 의무를 더하기 전 실제 상환 압력과 자료를 검토하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "납부일·반복 의무·필수 비용을 실제 자료로 같은 표에 정리하는 행동",
      "상환 압력이 생활비와 회복 여력을 침범하는 신호를 확인하는 행동",
      "실제 금융·법률 전문가 상담이 필요한 자료와 검토 순서를 준비하는 행동",
    ],
    prohibitedClaims: [
      "대출·상환 상품·법률 절차 추천",
      "파산·연체·상환 성공을 예언하거나 보장",
      "특정 금액이나 상환 시점 단정",
      "실제 채무 사실을 사주만으로 단정",
    ],
  },
  {
    productId: "money-emergency-buffer",
    engine: "MONEY",
    userQuestion:
      "예상 밖의 지출이나 수입 공백이 생길 때 무엇이 재정 회복력을 무너뜨리며, 어떤 보호 순서를 점검해야 하는가?",
    analysisFocus: [
      "돌발 지출·수입 공백·지원 의존이 회복력을 약화시키는 구조",
      "유동성 공백·회복 지연·지원 경계로 확인하는 충격 취약 신호",
      "목표 금액이나 상품이 아닌 실제 비용·책임의 보호 순서와 회복 검토",
    ],
    requiredInsights: [
      { id: "buffer-disruption-exposure", prompt: "돌발 지출과 수입 공백이 어떤 비용·책임 조합에서 재정 충격으로 확대되는지 설명한다." },
      { id: "buffer-liquidity-signal", prompt: "유동성 공백, 회복 지연, 반복 지원 의존처럼 회복력을 점검할 관찰 신호를 제시한다." },
      { id: "buffer-support-dependency-condition", prompt: "외부 지원·기존 자원·반복 의무에 과도하게 의존할 때 보호 순서가 약해지는 조건을 구분한다." },
      { id: "buffer-resilience-review-action", prompt: "충격 이후 보호할 비용과 책임의 순서를 검토하고 다음 주기의 회복 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "wealth-accumulation-target-or-product", prompt: "잔여분 목표·저축 금액·자산 상품을 설계하거나 추천하는 분석" },
      { id: "saving-routine-or-budget-maintenance", prompt: "정기 예산·저축 습관·자동화 루틴을 유지하는 분석" },
      { id: "investment-or-borrowing-execution", prompt: "투자·대출·보험 상품을 추천하거나 실행하는 분석" },
    ],
    evidenceFocus: ["strength", "fortune_flow", "element_balance", "fortune_brain"],
    decisionCriteria: {
      확대: "충격 이후에도 보호 순서와 회복 조건이 확인된 범위에서 활동을 넓히는 방향",
      유지: "현재 보호 순서와 지원 경계를 유지하며 회복 신호를 관찰하는 방향",
      조정: "돌발 비용·반복 의무·지원 의존의 우선순위를 다시 정리하는 방향",
      보류: "회복력 자료를 확인하기 전 새 책임이나 고정 의무를 더하지 않는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "돌발 지출과 수입 공백에서 먼저 보호할 비용·책임을 실제 자료로 분류하는 행동",
      "유동성 공백과 지원 의존이 반복되는 신호를 검토하는 행동",
      "충격 이후 회복·조정·외부 상담이 필요한 기준을 다음 주기에 점검하는 행동",
    ],
    prohibitedClaims: [
      "비상자금 목표 금액·저축 상품·투자 상품 추천",
      "돌발 손실·위기·파산 시점 예언",
      "대출·보험·투자 실행 지시",
      "실제 자산·지원 관계를 사주만으로 단정",
    ],
  },
  {
    productId: "money-shared-finance",
    engine: "MONEY",
    userQuestion: "공동 지출과 재정 책임을 어떻게 나누어 일방 부담과 통제 상실을 줄여야 하는가?",
    analysisFocus: ["공동 비용의 결정권·최종 부담자·승인권이 어긋나는 구조", "정산 시점·변경 조건·지원 기대가 책임 경계를 흔드는 신호", "관계 지속 판단이 아닌 공동 재정의 책임·보호·재검토 순서"],
    requiredInsights: [
      { id: "shared-finance-authority-split", prompt: "공동 지출에서 결정권, 승인권, 최종 부담자가 분리되는 구조를 구분한다." },
      { id: "shared-finance-liability-boundary", prompt: "정산·추가 비용·미이행 상황에서 책임 경계를 확인할 관찰 신호를 제시한다." },
      { id: "shared-finance-change-condition", prompt: "역할·수입·공동 부담이 바뀔 때 기존 합의가 통제력을 약화시키는 조건을 설명한다." },
      { id: "shared-finance-review-action", prompt: "공동 비용의 승인·정산·변경 기준을 문서로 검토할 구체 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "general-money-leak-pattern", prompt: "개인 지출·계약·충동 전반의 손실 노출을 진단하는 분석" },
      { id: "relationship-continuation-decision", prompt: "관계를 유지·조정·종료할지 판단하는 관계 분석" },
      { id: "investment-or-product-advice", prompt: "공동 자산 상품·대출·투자를 추천하거나 실행하는 분석" },
    ],
    evidenceFocus: ["element_relations", "fortune_brain", "fortune_flow", "strength"],
    decisionCriteria: { 확대: "승인·정산·책임이 확인된 공동 부담만 넓히는 방향", 유지: "현재 공동 비용 기준을 유지하며 정산 신호를 관찰하는 방향", 조정: "결정권·부담자·변경 조건을 다시 정리하는 방향", 보류: "책임 경계가 확인되기 전 새 공동 부담을 더하지 않는 방향" },
    decisionType: "exploration",
    actionFocus: ["공동 비용별 결정권·승인권·최종 부담자를 같은 표에 기록하는 행동", "정산 시점과 변경 시 재협상 조건을 문장으로 맞추는 행동", "일방 부담이나 미이행이 반복될 때 공동 비용을 조정·보류할 기준을 검토하는 행동"],
    prohibitedClaims: ["상대의 재정 상태·의도 단정", "공동 재정 결과나 관계 결과 보장", "대출·투자·자산 상품 추천", "특정 금액·손실 시점 예언"],
  },
  {
    productId: "money-contract-commitment",
    engine: "MONEY",
    userQuestion: "장기 계약이나 고정 의무를 받아들이기 전에 어떤 중단·검토·출구 조건을 확인해야 하는가?",
    analysisFocus: ["자동 연장·해지 비용·변경 조건이 만드는 장기 의무 노출", "승인권·중단권·책임 이전이 불명확한 계약 신호", "일반 지출 습관이 아닌 계약 전 통제·출구 기준"],
    requiredInsights: [
      { id: "commitment-exposure-pattern", prompt: "장기 계약과 고정 의무가 통제 가능한 범위를 넘어서는 노출 구조를 설명한다." },
      { id: "commitment-term-change-mechanism", prompt: "자동 연장, 조건 변경, 책임 이전이 부담을 확대하는 메커니즘을 구분한다." },
      { id: "commitment-exit-signal", prompt: "중단권, 해지 비용, 승인권이 불명확한지 확인할 관찰 신호를 제시한다." },
      { id: "commitment-review-action", prompt: "계약 전 중단·검토·출구 조건을 비교할 구체 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "general-spending-or-saving-routine", prompt: "일상 소비·예산·저축 습관을 유지하는 분석" },
      { id: "legal-contract-interpretation", prompt: "계약의 법률적 효력·분쟁 절차·법률 자문을 제공하는 분석" },
      { id: "investment-or-real-estate-advice", prompt: "투자·부동산·대출 계약을 추천하거나 실행하는 분석" },
    ],
    evidenceFocus: ["fortune_flow", "element_relations", "strength", "fortune_brain"],
    decisionCriteria: { 확대: "출구와 변경 조건이 확인된 의무만 수용하는 방향", 유지: "현재 계약 기준을 유지하며 변경 신호를 관찰하는 방향", 조정: "기간·책임·승인·중단 조건을 다시 정리하는 방향", 보류: "출구 조건이 불명확한 장기 의무를 미루는 방향" },
    decisionType: "decision",
    actionFocus: ["계약의 기간·자동 연장·변경·해지·승인 조건을 한 표로 비교하는 행동", "새 의무가 기존 책임과 충돌할 때 중단하거나 재협상할 기준을 확인하는 행동", "출구 조건과 책임 변경이 문서로 확인될 때만 수용 여부를 검토하는 행동"],
    prohibitedClaims: ["법률 자문·계약 효력 판단", "특정 계약·부동산·대출 추천", "손실·분쟁 결과 보장", "특정 금액이나 시점 예언"],
  },
  {
    productId: "money-spending-decision",
    engine: "MONEY",
    userQuestion: "큰 지출에서 실제 필요와 압박·이미 쓴 비용을 어떻게 구분하고 보류·검토 기준을 세워야 하는가?",
    analysisFocus: ["하나의 중요한 지출을 촉발하는 필요·압박·이미 쓴 비용의 구분", "감당 범위·중단 가능성·독립 필요성을 확인하는 신호", "일상 예산이 아닌 큰 지출의 보류·검토·실행 판단"],
    requiredInsights: [
      { id: "spending-decision-trigger", prompt: "큰 지출을 촉발하는 실제 필요, 외부 압박, 이미지 부담의 조건을 구분한다." },
      { id: "spending-affordability-boundary", prompt: "독립 필요성, 감당 범위, 중단 가능성을 확인할 관찰 신호를 제시한다." },
      { id: "spending-sunk-cost-signal", prompt: "이미 쓴 비용이나 체면이 추가 지출 판단을 왜곡하는 메커니즘을 설명한다." },
      { id: "spending-pause-review-action", prompt: "큰 지출을 보류·검토·실행으로 나눌 구체 판단 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "saving-routine-maintenance", prompt: "월·주 단위 예산·저축 루틴을 유지하는 분석" },
      { id: "investment-or-purchase-recommendation", prompt: "특정 상품·투자·부동산·구매 대상을 추천하는 분석" },
      { id: "general-money-leak-or-debt-structure", prompt: "지출 누수나 부채 상환 전반의 구조를 진단하는 분석" },
    ],
    evidenceFocus: ["fortune_brain", "strength", "fortune_flow", "element_balance"],
    decisionCriteria: { 확대: "독립 필요성과 중단 조건이 확인된 지출만 실행하는 방향", 유지: "현재 판단 기준을 유지하며 필요 증거를 관찰하는 방향", 조정: "압박·감당 범위·중단 조건을 다시 정리하는 방향", 보류: "매몰비용이나 외부 압박이 주된 근거인 지출을 미루는 방향" },
    decisionType: "decision",
    actionFocus: ["큰 지출의 필요·압박·이미 쓴 비용을 분리해 기록하는 행동", "지출 후에도 유지할 책임과 중단 조건을 비교하는 행동", "독립 필요성이 확인되기 전 보류하고 재검토할 기준을 문장화하는 행동"],
    prohibitedClaims: ["특정 구매·투자·대출 추천", "수익·손실·가격 변동 예언", "특정 금액 실행 지시", "사주만으로 실제 소비 사실 단정"],
  },
  {
    productId: "relationship",
    engine: "RELATIONSHIP",
    userQuestion:
      "여러 관계에서 반복되는 상호작용 운영 구조는 무엇이며, 거리·반응·정서적 부담·상호성에서 어떤 습관을 안정화·재조정·모니터링해야 하는가?",
    analysisFocus: [
      "여러 관계에 걸쳐 반복되는 상호작용·거리·반응의 운영 구조",
      "상호성·정서적 부담·관계 유지 방식이 불균형해지는 조건",
      "특정 사람이나 사건 이전에 안정화할 관계 운영 우선순위",
    ],
    requiredInsights: [
      {
        id: "relationship-operating-structure",
        prompt: "여러 관계에서 반복되는 상호작용·거리·반응이 관계 유지에 작동하는 운영 구조를 설명한다.",
      },
      {
        id: "reciprocity-emotional-load",
        prompt: "상호성의 불균형과 정서적 부담이 반복되는 관계 운영을 약화시키는 조건과 관찰 신호를 구분한다.",
      },
      {
        id: "distance-response-pattern",
        prompt: "가까워짐·거리 둠·반응 회피·과잉 대응이 여러 관계에서 반복되는 방식과 유지 조건을 설명한다.",
      },
      {
        id: "relationship-operating-review-action",
        prompt: "여러 관계에서 공통으로 적용할 운영 습관의 안정화·재조정·모니터링 행동과 검토 기준을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "specific-current-or-reunion-decision",
        prompt: "특정 현재 상대의 신호·지속·조정 판단이나 단절 관계의 재접촉·재연결 판단을 중심으로 하는 분석",
      },
      {
        id: "conflict-boundary-intimacy-intervention",
        prompt: "특정 갈등의 수습·회복 순서, 관계 경계·허용 기준, 친밀감·감정 개방 속도를 설계하는 분석",
      },
      {
        id: "selection-commitment-connection-ownership",
        prompt: "반복 파트너 선택, 새 인연의 접점·초기 신뢰, 장기 결합·공동생활 준비를 중심으로 하는 분석",
      },
    ],
    evidenceFocus: [
      "element_relations",
      "fortune_brain",
      "strength",
      "element_balance",
      "yongshin",
    ],
    decisionCriteria: {
      확대: "관계의 접점과 교류를 넓히는 방향",
      유지: "현재 관계 방식을 그대로 유지하는 방향",
      조정: "거리와 경계를 다시 설정하는 방향",
      보류: "관계에 대한 결정을 미루고 신호를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "여러 관계에서 반복되는 상호작용·거리·반응을 같은 기준으로 기록하는 행동",
      "상호성의 불균형과 정서적 부담이 커지는 관계 운영 조건을 분류하는 행동",
      "다음 검토 주기에서 유지할 관계 습관·재조정할 반응·모니터링할 신호를 정리하는 행동",
    ],
    prohibitedClaims: [
      "상대의 감정이나 의도 단정",
      "결혼·이별 시점 제시",
      "관계 결과 보장",
      "특정 현재 관계를 이어가거나 조정해야 한다는 결론",
      "갈등 수습·경계 설정·친밀감 속도를 단일 관계에 처방",
      "파트너 선택·새 인연·재회·결혼 준비를 중심 결론으로 제시",
    ],
  },
  {
    productId: "relationship-long-distance",
    engine: "RELATIONSHIP",
    userQuestion: "거리 상황에서 연락·방문·기대 조건을 어떻게 조정해야 관계 운영이 지속 가능한가?",
    analysisFocus: ["거리로 인해 반복되는 연락·방문·일정 조정 마찰", "방문 계획·연락 리듬·개인 시간의 후속 이행 신호", "관계 유지·조정 결론이 아닌 거리 운영 조건과 조정 프로토콜"],
    requiredInsights: [
      { id: "distance-friction-pattern", prompt: "거리 상황에서 연락, 방문, 일정 조정이 반복적으로 마찰을 만드는 조건을 구분한다." },
      { id: "distance-coordination-signal", prompt: "방문 계획, 연락 리듬, 일정 후속 이행이 지속 가능한지 확인할 관찰 신호를 제시한다." },
      { id: "distance-expectation-alignment", prompt: "연락 빈도, 개인 시간, 방문 부담에 대한 기대가 어긋나는 메커니즘을 설명한다." },
      { id: "distance-operating-action", prompt: "거리 상황의 소통·방문·조정 기준을 시험할 구체 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "current-relationship-continue-adjust-decision", prompt: "현재 관계를 이어갈지 조정할지 판단하는 상태 평가 분석" },
      { id: "conflict-repair-or-recurrence", prompt: "갈등 촉발·수습·행동 변화·재발을 중심으로 하는 분석" },
      { id: "marriage-or-reunion-outcome", prompt: "결혼·재회·장기 결합 결과를 판단하는 분석" },
    ],
    evidenceFocus: ["fortune_flow", "element_relations", "strength", "fortune_brain"],
    decisionCriteria: { 확대: "조율된 연락·방문·기대 조건 안에서 교류를 넓히는 방향", 유지: "현재 거리 운영 기준을 유지하며 후속 이행을 관찰하는 방향", 조정: "방문·연락·개인 시간의 부담 기준을 다시 맞추는 방향", 보류: "거리 운영 조건이 확인되기 전 새로운 약속을 더하지 않는 방향" },
    decisionType: "exploration",
    actionFocus: ["연락·방문·개인 시간의 최소 기준을 서로 문장으로 맞추는 행동", "방문 계획과 일정 변경의 후속 이행을 같은 기준으로 기록하는 행동", "거리 부담이 한쪽에 쏠릴 때 조정·보류할 운영 기준을 검토하는 행동"],
    prohibitedClaims: ["관계 지속·이별·재회 결과 보장", "상대의 감정·의도 단정", "특정 방문·만남 시점 예측", "결혼·장기 관계 결과 판단"],
  },
  {
    productId: "relationship-unrequited",
    engine: "RELATIONSHIP",
    userQuestion: "감정 표현이나 접근을 앞두고 어떤 상호성 신호를 확인해야 하며, 언제 접근하거나 보류해야 하는가?",
    analysisFocus: ["일방적 관심과 실제 상호성 사이의 경계", "주도권·후속 반응·경계 반응으로 확인하는 접근 신호", "새 인연 일반 탐색이 아닌 한쪽 감정의 접근·보류·표현 판단"],
    requiredInsights: [
      { id: "unrequited-reciprocity-threshold", prompt: "일방적 관심과 상호적 관심을 구분하기 위해 필요한 최소 상호성 기준을 설명한다." },
      { id: "unrequited-approach-signal", prompt: "주도권, 후속 반응, 만남 제안, 경계 반응으로 접근 가능성을 확인할 신호를 제시한다." },
      { id: "unrequited-fantasy-risk-condition", prompt: "추측·이상화·한 번의 반응이 감정 표현 판단을 왜곡하는 조건을 구분한다." },
      { id: "unrequited-disclosure-action", prompt: "접근·표현·보류 중 다음 행동을 단계적으로 검토할 구체 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "broad-new-connection-exploration", prompt: "새로운 인연이 열리는 환경·활동·초기 탐색 전반을 분석하는 범위" },
      { id: "partner-selection-pattern", prompt: "장기 파트너 선택 성향과 반복 패턴을 분석하는 범위" },
      { id: "current-relationship-or-reunion-decision", prompt: "이미 형성되거나 단절된 관계의 지속·재연결을 판단하는 분석" },
    ],
    evidenceFocus: ["fortune_brain", "strength", "fortune_flow", "element_relations"],
    decisionCriteria: { 확대: "상호성 신호가 반복될 때 접근·표현의 범위를 넓히는 방향", 유지: "현재의 관찰 범위와 경계를 유지하는 방향", 조정: "접근 방식과 표현 속도를 다시 정리하는 방향", 보류: "일방적 해석이 주된 근거일 때 표현과 접근을 미루는 방향" },
    decisionType: "decision",
    actionFocus: ["상대와 자신의 연락·제안·후속 반응을 같은 기준으로 기록하는 행동", "한 번의 반응과 반복 상호성 신호를 구분해 접근 속도를 조정하는 행동", "표현 전 확인할 경계·거절 반응·보류 기준을 문장화하는 행동"],
    prohibitedClaims: ["상대의 호감·감정·의도 단정", "고백·연애 성공·관계 결과 보장", "특정 시점의 연락·만남 예측", "상대에게 접근해야 한다는 강제 결론"],
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
  {
    productId: "relationship-marriage",
    engine: "RELATIONSHIP",
    userQuestion:
      "장기 결합을 고려할 때 안정적으로 함께 살아가기 위해 필요한 생활·역할·책임·재정·가족·갈등 대응 조건은 무엇이며, 무엇을 준비하거나 조정해야 하는가?",
    analysisFocus: [
      "함께 살아가기 위한 생활 조건과 합의가 필요한 영역",
      "역할·책임·재정·가족 관련 기대를 조율할 준비 상태",
      "장기 결합 전 확인할 현실적 마찰 신호와 준비 기준",
    ],
    requiredInsights: [
      {
        id: "shared-life-condition",
        prompt: "장기 결합 후 함께 살아갈 때 안정성을 좌우하는 생활 조건과 합의가 필요한 영역을 구분한다.",
      },
      {
        id: "role-responsibility-readiness",
        prompt: "역할·책임·재정·가족 관련 기대를 조율할 준비 상태와 일방 부담 위험을 설명한다.",
      },
      {
        id: "practical-friction-signal",
        prompt: "생활 리듬, 재정, 가족, 갈등 대응에서 결합 전에 확인할 현실적 마찰 신호를 제시한다.",
      },
      {
        id: "commitment-preparation-action",
        prompt: "장기 결합을 준비하거나 조정하기 위한 점검 순서와 구체 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "specific-person-marriage-outcome",
        prompt: "특정 현재 상대와 결혼할지, 관계 결과가 결혼으로 이어질지를 판정하거나 보장하는 분석",
      },
      {
        id: "marriage-timing-prediction",
        prompt: "결혼 적기·연도·월·특정 시점처럼 결혼 시기를 예언하는 분석",
      },
      {
        id: "future-spouse-profile",
        prompt: "미래 배우자의 외모·직업·성향이나 운명적 상대를 단정하는 분석",
      },
    ],
    evidenceFocus: [
      "element_relations",
      "fortune_brain",
      "strength",
      "yongshin",
      "fortune_flow",
    ],
    decisionCriteria: {
      확대: "공동생활을 위한 합의와 준비 항목을 넓혀 점검하는 방향",
      유지: "현재 생활·역할·책임 기준을 그대로 유지하며 마찰 신호를 관찰하는 방향",
      조정: "생활 조건과 역할·책임 분담 기준을 다시 정리하는 방향",
      보류: "장기 결합 준비를 미루고 현실 조건과 합의 가능성을 확인하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "생활 리듬·주거·재정 조건을 같은 기준으로 점검하는 행동",
      "역할·책임·가족 관련 기대를 합의 항목으로 문장화하는 행동",
      "갈등 대응과 한쪽 부담이 커지는 마찰 신호를 확인하는 행동",
      "장기 결합 전에 준비하거나 조정할 항목과 중단 기준을 정리하는 행동",
    ],
    prohibitedClaims: [
      "결혼 성사·실패·이별·장기 관계 결과 보장",
      "특정 상대와 결혼할지 여부 판정",
      "결혼 적기·연도·월·특정 시점 예언",
      "미래 배우자의 외모·직업·성향 단정",
      "재회가 결혼으로 이어진다는 보장",
      "상대의 결혼 의도나 감정 단정",
    ],
  },
  {
    productId: "relationship-partner-pattern",
    engine: "RELATIONSHIP",
    userQuestion:
      "나는 어떤 상대 특성과 역할 기대를 반복해서 선택하며, 다음 관계에서 실제 적합성을 어떻게 검증해야 하는가?",
    analysisFocus: [
      "반복해서 선택하는 상대 특성과 관계 구조",
      "상대에게 기대하거나 사용자가 떠맡는 역할과 책임",
      "강한 끌림과 실제 적합성을 구분하는 검증 기준",
    ],
    requiredInsights: [
      {
        id: "partner-selection-pattern",
        prompt: "과거 관계에서 반복해 끌리거나 선택한 상대의 특성과 관계 구조를 구분하고, 안정적 적합성과 혼동한 지점을 설명한다.",
      },
      {
        id: "role-expectation-pattern",
        prompt: "상대에게 기대하거나 사용자가 떠맡기 쉬운 역할·책임의 기대가 선택과 관계 부담에 미치는 영향을 설명한다.",
      },
      {
        id: "compatibility-verification-signal",
        prompt: "다음 관계에서 말보다 반복된 행동, 책임 분담, 경계 존중으로 실제 적합성을 확인할 관찰 신호를 제시한다.",
      },
      {
        id: "selection-adjustment-action",
        prompt: "다음 관계에서 적용할 선택 기준과 검증 순서를 구체 행동으로 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "overall-relationship-operating-profile",
        prompt: "여러 관계에서의 전반적 거리·반응·운영 패턴을 general relationship 상품처럼 재서술하는 분석",
      },
      {
        id: "new-connection-acquisition",
        prompt: "새로운 사람을 만날 시기·장소·접점 획득·첫 만남 기회를 중심으로 하는 분석",
      },
      {
        id: "current-marriage-reunion-outcome",
        prompt: "현재 특정 상대와의 유지·결혼·재회 결과를 판단하거나 보장하는 분석",
      },
    ],
    evidenceFocus: [
      "element_relations",
      "fortune_brain",
      "strength",
      "yongshin",
      "fortune_flow",
    ],
    decisionCriteria: {
      확대: "선택 기준을 넓히기 전에 실제 적합 신호를 확인하는 방향",
      유지: "현재 선택 기준을 그대로 유지하며 반복 패턴을 관찰하는 방향",
      조정: "상대 특성·역할 기대·검증 순서를 다시 정리하는 방향",
      보류: "새로운 관계 판단을 미루고 끌림과 적합 신호를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "과거 관계에서 반복 선택한 상대 특성과 관계 구조를 같은 기준으로 기록하는 행동",
      "강한 끌림과 실제 적합 신호를 분리해 비교하는 행동",
      "역할·책임 분담 기대를 관계 초기에 확인할 질문으로 문장화하는 행동",
      "다음 관계에서 적용할 선택 기준과 중단 기준을 정리하는 행동",
    ],
    prohibitedClaims: [
      "이상형이나 운명적 상대 단정",
      "미래 배우자의 외모·직업 예측",
      "새 인연이 생기는 시점이나 장소 예측",
      "현재 특정 상대의 적합도나 결혼·재회 결과 판단",
    ],
  },
  {
    productId: "relationship-new-connection",
    engine: "RELATIONSHIP",
    userQuestion:
      "새로운 인연이 형성되기 쉬운 접점·초기 상호작용 조건은 무엇이며, 초기 신뢰와 관계 진입 가능성을 높이기 위해 무엇을 관찰하고 어떻게 접근해야 하는가?",
    analysisFocus: [
      "새로운 접점이 자연스럽게 이어지는 활동·환경·상호작용 조건",
      "첫 접촉에서 접근이 이어지거나 멈추는 초기 반응과 신뢰 진입 조건",
      "새로운 상호작용을 관계 탐색으로 계속할지 검토하는 관찰 기준",
    ],
    requiredInsights: [
      {
        id: "connection-opportunity-pattern",
        prompt: "새로운 접점이 자연스럽게 이어지는 활동·환경·상호작용 조건과 실제 탐색 기회를 구분한다.",
      },
      {
        id: "initial-contact-style",
        prompt: "첫 연락·만남·공동 활동에서 접근이 이어지거나 멈추는 초기 상호작용 방식을 구분한다.",
      },
      {
        id: "early-trust-signal",
        prompt: "초기 신뢰 진입 전에 반복 확인할 응답·약속·관심 표현의 일관성 신호를 제시한다.",
      },
      {
        id: "new-connection-action",
        prompt: "새로운 접점에 접근하고 초기 탐색을 계속·보류할 수 있는 구체 행동과 검토 기준을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "intimacy-pace-pattern",
        prompt: "형성된 관계 안에서 친밀감의 속도와 안정성을 설계하는 분석",
      },
      {
        id: "emotional-opening-boundary",
        prompt: "감정 개방의 깊이와 장기적인 정서 경계를 조절하는 분석",
      },
      {
        id: "marriage-or-longterm-decision",
        prompt: "결혼이나 장기 관계 결과를 결정하는 판단",
      },
    ],
    evidenceFocus: [
      "element_relations",
      "fortune_brain",
      "strength",
      "element_balance",
      "yongshin",
    ],
    decisionCriteria: {
      확대: "새로운 접점과 교류를 넓히는 방향",
      유지: "현재 접점 형성 방식을 그대로 유지하는 방향",
      조정: "초기 상호작용과 신뢰 확인 방식을 다시 정리하는 방향",
      보류: "새로운 관계 시작을 미루고 초기 신호를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "새로운 접점이 자연스럽게 이어진 활동·환경·초기 반응을 같은 기준으로 기록하는 행동",
      "첫 연락·만남·공동 활동에서 접근이 이어지는 신호와 멈춰야 할 신호를 구분하는 행동",
      "초기 신뢰 진입 전 응답·약속·관심 표현의 일관성을 검토하는 행동",
      "새로운 상호작용을 계속 탐색하거나 보류할 다음 접근·검토 기준을 문장화하는 행동",
    ],
    prohibitedClaims: [
      "특정 상대의 마음이나 의도 확정",
      "반드시 새 인연이 생긴다는 보장",
      "만남이나 연애 시작 시점 단정",
      "결혼 결과 보장",
      "정확한 사람·장소·행사·직장·날짜에서 만난다는 예측",
      "현재 특정 상대의 행동을 관계 지속·조정 결론으로 해석",
      "친밀감 심화·갈등 수습·경계 처방을 초기 접점의 중심 결론으로 제시",
      "반복 파트너 선택·공동생활 준비·재접촉 판단을 중심 결론으로 제시",
    ],
  },
  {
    productId: "relationship-intimacy",
    engine: "RELATIONSHIP",
    userQuestion:
      "관계가 시작된 뒤 친밀감이 깊어질 때 어떤 속도와 방식이 안정적인가?",
    analysisFocus: [
      "친밀감의 속도와 관계 안정성",
      "감정 개방과 개인 경계의 균형",
      "가까워질수록 커지는 감정 소모 반응",
    ],
    requiredInsights: [
      {
        id: "intimacy-pace-pattern",
        prompt: "친밀감이 깊어지는 속도와 관계 안정성이 어긋나는 조건을 설명한다.",
      },
      {
        id: "emotional-opening-boundary",
        prompt: "감정 개방과 개인 경계 사이에서 안정적인 속도를 구분한다.",
      },
      {
        id: "closeness-stress-response",
        prompt: "가까워질수록 감정 소모·불안·회피가 커지는 반응을 관찰 가능한 신호로 설명한다.",
      },
      {
        id: "intimacy-adjustment-action",
        prompt: "친밀감의 속도와 감정 거리를 조정하는 구체 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "connection-opportunity-pattern",
        prompt: "새로운 인연의 발생 가능성과 접점 기회를 평가하는 분석",
      },
      {
        id: "initial-contact-style",
        prompt: "새 관계의 첫 연락·만남·접점을 만들고 획득하는 방식",
      },
      {
        id: "marriage-or-longterm-decision",
        prompt: "결혼이나 장기 관계 결과를 결정하는 판단",
      },
    ],
    evidenceFocus: [
      "element_relations",
      "fortune_brain",
      "strength",
      "fortune_flow",
      "seun",
    ],
    decisionCriteria: {
      확대: "친밀감 표현과 교류의 범위를 넓히는 방향",
      유지: "현재 친밀감의 속도와 감정 거리를 그대로 유지하는 방향",
      조정: "친밀감의 속도와 개인 경계의 비중을 다시 정리하는 방향",
      보류: "감정 개방을 미루고 관계의 안정 신호를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "친밀감의 속도와 감정 개방 수준을 기록하는 행동",
      "가까워질수록 생기는 감정 소모 반응을 확인하는 행동",
      "친밀감과 개인 경계를 조정하는 행동",
    ],
    prohibitedClaims: [
      "상대의 애정이나 의도 단정",
      "관계가 반드시 깊어진다는 보장",
      "결혼·이별·재회 결과 판단",
      "특정 시점 예측",
    ],
  },
  {
    productId: "relationship-conflict",
    engine: "RELATIONSHIP",
    userQuestion:
      "반복되는 갈등에서 무엇이 충돌을 키우며, 회복 가능한지 어떻게 확인하고 재발을 줄여야 하는가?",
    analysisFocus: [
      "반복 갈등의 촉발 조건",
      "충돌 뒤 갈등을 키우거나 완화하는 반응",
      "회복 신호와 재발 방지 기준",
    ],
    requiredInsights: [
      {
        id: "conflict-trigger-pattern",
        prompt: "반복되는 갈등을 시작시키는 상황·말·행동의 촉발 조건을 구분한다.",
      },
      {
        id: "conflict-response-pattern",
        prompt: "충돌이 일어난 뒤 갈등을 키우거나 완화하는 반응 순서를 설명한다.",
      },
      {
        id: "repair-signal",
        prompt: "대화 재개, 책임 인정, 행동 변화처럼 회복 가능성을 확인할 수 있는 관찰 신호를 제시한다.",
      },
      {
        id: "conflict-recovery-action",
        prompt: "갈등 후 수습과 재발 방지를 검증할 수 있는 구체 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "relationship-type-boundary-design",
        prompt: "관계 유형별로 적용하는 장기 거리와 허용 기준의 운영 설계",
      },
      {
        id: "role-responsibility-boundary",
        prompt: "특정 갈등 사건과 무관한 일반 역할·책임 범위의 설계",
      },
      {
        id: "marriage-or-reunion-decision",
        prompt: "결혼·재회·현재 관계 지속 여부 같은 결과 판단",
      },
    ],
    evidenceFocus: [
      "element_relations",
      "fortune_brain",
      "strength",
      "fortune_flow",
      "seun",
    ],
    decisionCriteria: {
      확대: "회복을 위한 대화와 조정 시도를 넓히는 방향",
      유지: "현재 갈등 대응 방식을 그대로 유지하는 방향",
      조정: "충돌 반응과 수습 방식을 다시 정리하는 방향",
      보류: "갈등 결론을 미루고 회복 신호를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "갈등 촉발 상황과 직후 반응을 같은 형식으로 기록하는 행동",
      "충돌 뒤 대화 재개·책임 인정·행동 변화 여부를 비교하는 행동",
      "회복 신호와 재발 조건을 분리해 다음 수습 기준을 정하는 행동",
    ],
    prohibitedClaims: [
      "상대의 감정이나 의도 단정",
      "화해나 회복 결과 보장",
      "결혼·이별·재회 결과 판단",
      "특정 시점 예측",
    ],
  },
  {
    productId: "relationship-boundary",
    engine: "RELATIONSHIP",
    userQuestion:
      "관계를 유지하면서 어떤 거리·역할·허용 기준을 세워야 감정 소모와 과도한 개입을 줄일 수 있는가?",
    analysisFocus: [
      "과도한 허용과 개입이 관계 부담으로 바뀌는 조건",
      "역할·책임·감정 노동의 허용 범위",
      "거리와 개인 공간을 조정하는 기준",
    ],
    requiredInsights: [
      {
        id: "boundary-overload-pattern",
        prompt: "과도한 허용·개입·감정 노동이 관계 부담으로 바뀌는 조건을 구분한다.",
      },
      {
        id: "role-responsibility-boundary",
        prompt: "관계 안에서 맡을 역할과 책임의 범위를 명확히 하는 기준을 설명한다.",
      },
      {
        id: "distance-permission-standard",
        prompt: "연락·시간·개인 공간에서 허용할 범위와 거절할 기준을 제시한다.",
      },
      {
        id: "boundary-adjustment-action",
        prompt: "경계 침범이나 과부하 신호가 반복될 때 거리·역할·허용 기준을 조정하는 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "conflict-trigger-pattern",
        prompt: "특정 갈등 사건의 촉발 조건과 충돌 반응을 분석하는 방식",
      },
      {
        id: "repair-signal",
        prompt: "갈등 직후 수습·화해·회복 여부를 판정하는 방식",
      },
      {
        id: "marriage-or-reunion-decision",
        prompt: "결혼·재회·현재 관계 지속 여부 같은 결과 판단",
      },
    ],
    evidenceFocus: [
      "element_relations",
      "strength",
      "fortune_brain",
      "daeun",
      "fortune_flow",
    ],
    decisionCriteria: {
      확대: "허용 범위와 관계 운영 기준을 넓히는 방향",
      유지: "현재 거리와 역할 기준을 그대로 유지하는 방향",
      조정: "허용·거절·역할·거리 기준을 다시 정리하는 방향",
      보류: "새로운 역할 부담을 미루고 과부하 신호를 관찰하는 방향",
    },
    decisionType: "exploration",
    actionFocus: [
      "허용·거절·연락·시간·감정 노동 기준을 문장으로 정리하는 행동",
      "역할과 책임이 한쪽으로 과도하게 쏠리는지 구분하는 행동",
      "경계 침범·과부하 신호가 반복되면 거리와 역할 기준을 조정하는 행동",
    ],
    prohibitedClaims: [
      "상대의 감정이나 의도 단정",
      "관계가 반드시 안정된다는 보장",
      "결혼·이별·재회 결과 판단",
      "특정 시점 예측",
    ],
  },
  {
    productId: "relationship-reunion",
    engine: "RELATIONSHIP",
    userQuestion:
      "단절된 관계와 다시 연결을 시도하기 전에 어떤 변화와 조건을 확인해야 하는가?",
    analysisFocus: [
      "단절에 이르게 된 맥락과 이전 문제",
      "상호적인 재접점과 행동 변화 evidence",
      "재연결 시도와 보류를 가르는 기준",
    ],
    requiredInsights: [
      {
        id: "separation-context",
        prompt: "단절에 이르게 된 상황과 이전 관계에서 반복된 문제가 현재에도 남아 있는지 구분한다.",
      },
      {
        id: "recontact-signal",
        prompt: "상호적인 재접점, 일관된 연락, 구체적인 대화 제안처럼 다시 연결을 검토할 수 있는 관찰 신호를 제시한다.",
      },
      {
        id: "behavior-change-evidence",
        prompt: "말이나 감정 표현이 아니라 이전 문제와 관련된 실제 행동 변화가 반복되는지 확인하는 기준을 설명한다.",
      },
      {
        id: "reconnection-decision-action",
        prompt: "재연결을 시도하거나 보류하기 전에 확인할 조건과 중단 기준을 포함한 구체 행동을 제시한다.",
      },
    ],
    excludedFocus: [
      {
        id: "current-relationship-routine-decision",
        prompt: "현재 유지 중인 관계의 일반 지속·조정 운영을 판단하는 분석",
      },
      {
        id: "general-conflict-repair",
        prompt: "단절 이전 특정 갈등의 화해·수습 자체를 중심으로 하는 분석",
      },
      {
        id: "marriage-or-longterm-outcome",
        prompt: "결혼이나 장기 관계 결과를 보장하거나 결정하는 판단",
      },
    ],
    evidenceFocus: [
      "fortune_flow",
      "seun",
      "element_relations",
      "fortune_brain",
      "strength",
    ],
    decisionCriteria: {
      확대: "재연결을 위한 대화와 확인 시도를 넓히는 방향",
      유지: "현재 재접점과 거리 상태를 그대로 유지하는 방향",
      조정: "재연결 조건과 상호 책임의 기준을 다시 정리하는 방향",
      보류: "재연결 시도를 미루고 행동 변화와 상호성을 관찰하는 방향",
    },
    decisionType: "decision",
    actionFocus: [
      "단절에 이르게 된 맥락과 이전 문제를 분리해 기록하는 행동",
      "상호 재접점과 행동 변화 evidence를 확인하는 행동",
      "재연결 시도와 보류의 기준 및 중단 조건을 문장화하는 행동",
    ],
    prohibitedClaims: [
      "상대의 마음이나 의도 단정",
      "재회 가능성이나 관계 결과 보장",
      "결혼이나 장기 관계 결과 판단",
      "특정 재접점 시점 예측",
    ],
  },
  {
    productId: "relationship-friendship", engine: "RELATIONSHIP",
    userQuestion: "친구 관계에서 무엇이 상호적이고 무엇이 소진을 만들며, 어떤 교류 기준을 재조정해야 하는가?",
    analysisFocus: ["비연애 친구 관계의 교류·지원·요청 패턴", "신뢰와 상호성이 약해지는 관찰 신호", "감정 노동과 일방 요청을 재조정하는 기준"],
    requiredInsights: [
      { id: "friendship-exchange-pattern", prompt: "친구 관계에서 연락·도움·요청이 반복되는 교류 패턴을 구분한다." },
      { id: "friendship-reliability-signal", prompt: "약속, 후속 연락, 도움의 상호성으로 신뢰를 확인할 관찰 신호를 제시한다." },
      { id: "friendship-emotional-labor-condition", prompt: "감정 노동과 일방 요청이 관계 부담으로 누적되는 조건을 설명한다." },
      { id: "friendship-recalibration-action", prompt: "친구 관계의 교류·요청·거리 기준을 재조정할 구체 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "general-boundary-framework", prompt: "관계 유형과 무관한 일반 거리·역할·허용 기준을 설계하는 분석" },
      { id: "romantic-current-relationship-decision", prompt: "현재 연애 관계의 지속·조정이나 상호성 판단을 중심으로 하는 분석" },
      { id: "family-role-obligation", prompt: "가족 역할·돌봄·의무 기대를 중심으로 하는 분석" },
    ], evidenceFocus: ["element_relations", "strength", "fortune_flow", "fortune_brain"],
    decisionCriteria: { 확대: "상호 이행이 확인된 친구 교류를 넓히는 방향", 유지: "현재 교류 기준을 유지하며 신뢰 신호를 관찰하는 방향", 조정: "일방 요청·감정 노동·거리 기준을 다시 정리하는 방향", 보류: "상호성 확인 전 추가 부담을 맡지 않는 방향" },
    decisionType: "exploration", actionFocus: ["친구 관계의 요청·도움·연락이 오간 장면을 같은 기준으로 기록하는 행동", "약속과 지원의 상호성을 확인해 유지·조정할 교류 기준을 정하는 행동", "감정 노동이나 일방 요청이 반복될 때 거리와 요청 방식을 재조정하는 행동"],
    prohibitedClaims: ["친구의 감정·의도 단정", "특정 친구를 끊거나 유지해야 한다는 결론", "관계 결과 보장", "특정 시점 예측"],
  },
  {
    productId: "relationship-family-role", engine: "RELATIONSHIP",
    userQuestion: "가족 안에서 어떤 역할 기대가 반복 부담을 만들며, 어떤 역할 조정을 안전하게 시험해야 하는가?",
    analysisFocus: ["가족 역할·돌봄·결정에서 고정되는 기대", "요청·책임·의무감이 한쪽에 쏠리는 신호", "진단이나 가족 결과 판단이 아닌 역할 재조정 기준"],
    requiredInsights: [
      { id: "family-role-expectation-pattern", prompt: "가족 안에서 돌봄·결정·요청이 특정 역할에 고정되는 기대 패턴을 구분한다." },
      { id: "family-obligation-signal", prompt: "요청의 빈도, 책임 분배, 결정 제외로 부담을 확인할 관찰 신호를 제시한다." },
      { id: "family-guilt-mechanism", prompt: "의무감과 실제 책임의 경계가 흐려져 역할 조정이 늦어지는 조건을 설명한다." },
      { id: "family-boundary-action", prompt: "가족 역할·요청·결정 기준을 안전하게 재조정할 구체 행동을 제시한다." },
    ],
    excludedFocus: [
      { id: "general-personal-boundary", prompt: "관계 유형과 무관한 일반 개인 거리·허용 기준을 설계하는 분석" },
      { id: "medical-family-diagnosis", prompt: "가족 구성원의 건강·정신 상태·치료 필요성을 진단하는 분석" },
      { id: "romantic-relationship-decision", prompt: "연애·결혼·현재 관계의 지속·조정을 판단하는 분석" },
    ], evidenceFocus: ["element_relations", "gyeokguk", "strength", "fortune_flow"],
    decisionCriteria: { 확대: "합의된 역할 범위 안에서 지원을 넓히는 방향", 유지: "현재 역할 기준을 유지하며 부담 신호를 관찰하는 방향", 조정: "요청·돌봄·결정 역할을 다시 분배하는 방향", 보류: "책임 경계가 확인되기 전 새 의무를 맡지 않는 방향" },
    decisionType: "exploration", actionFocus: ["가족 요청·돌봄·결정이 누구에게 집중되는지 기록하는 행동", "역할과 요청의 범위를 문장으로 맞추는 행동", "반복 부담이 생길 때 재조정·지원 요청·상담 준비 기준을 검토하는 행동"],
    prohibitedClaims: ["가족 구성원의 의도·질병·정신 상태 단정", "가족 관계 결과 보장", "치료·법률·돌봄 실행 지시", "특정 시점 예측"],
  },
  {
    productId: "health-energy-recovery", engine: "HEALTH",
    userQuestion: "일상에서 어떤 부담·회복 패턴이 에너지를 소진시키며, 어떤 회복 리듬을 시험해야 하는가?",
    analysisFocus: ["일상 부담과 회복 시간의 반복 조합", "아침·저녁 에너지와 회복 지연의 관찰 신호", "진단이 아닌 활동·휴식 리듬의 실험"],
    requiredInsights: [
      { id: "energy-depletion-pattern", prompt: "일상 부담과 활동이 에너지를 반복적으로 소진시키는 조건을 구분한다." },
      { id: "energy-recovery-signal", prompt: "아침·저녁 에너지, 회복 지연, 휴식 후 반응으로 회복 상태를 관찰할 신호를 제시한다." },
      { id: "energy-rhythm-mismatch", prompt: "활동·휴식·회복 시간이 어긋나 소진이 누적되는 메커니즘을 설명한다." },
      { id: "energy-recovery-action", prompt: "부담과 회복 리듬을 기록하고 다음 주기에 시험할 구체 행동을 제시한다." },
    ], excludedFocus: [
      { id: "work-role-overload", prompt: "업무 책임·일정·재작업 중심의 과부하를 분석하는 범위" },
      { id: "medical-diagnosis-or-treatment", prompt: "질병·수면장애·치료 필요성을 진단하는 분석" },
      { id: "sleep-specific-observation", prompt: "취침·기상·수면 전 행동을 중심으로 하는 수면 리듬 분석" },
    ], evidenceFocus: ["strength", "element_balance", "fortune_flow", "fortune_brain"],
    decisionCriteria: { 확대: "회복 신호가 확인된 활동 범위를 넓히는 방향", 유지: "현재 부담·휴식 리듬을 유지하며 반응을 관찰하는 방향", 조정: "소진을 만드는 활동·휴식 순서를 다시 정리하는 방향", 보류: "회복 신호 확인 전 부담을 더하지 않는 방향" },
    decisionType: "exploration", actionFocus: ["활동·휴식·에너지 변화를 같은 기준으로 기록하는 행동", "회복 지연을 만드는 부담을 줄이거나 순서를 조정하는 행동", "지속·기능 저하 신호가 있으면 실제 전문가 상담 기준을 준비하는 행동"],
    prohibitedClaims: ["질병·수면장애·정신 상태 진단", "치료·약물·의료 행위 지시", "회복 결과나 시점 보장", "실제 건강 상태 단정"],
  },
  {
    productId: "health-sleep-rhythm", engine: "HEALTH",
    userQuestion: "어떤 생활 조건이 수면 리듬을 흔들며, 어떤 관찰 루프로 다음날 회복을 점검해야 하는가?",
    analysisFocus: ["취침 전 행동·기상 일관성·다음날 회복의 관찰", "수면 리듬을 흔드는 생활 조건", "질환 진단이 아닌 리듬 기록과 검토"],
    requiredInsights: [
      { id: "sleep-disruption-pattern", prompt: "취침·기상·생활 조건이 수면 리듬을 흔드는 반복 패턴을 구분한다." },
      { id: "sleep-preparation-signal", prompt: "취침 전 자극, 일정 변화, 기상 일관성으로 관찰할 신호를 제시한다." },
      { id: "sleep-next-day-effect", prompt: "수면 리듬과 다음날 회복·집중·생활 리듬의 연결 조건을 설명한다." },
      { id: "sleep-rhythm-action", prompt: "수면 리듬을 기록하고 다음 관찰 주기에 조정할 행동을 제시한다." },
    ], excludedFocus: [
      { id: "medical-sleep-diagnosis", prompt: "수면장애·질병·치료를 진단하거나 처방하는 분석" },
      { id: "general-energy-recovery", prompt: "하루 전체의 활동·휴식 에너지 리듬을 분석하는 범위" },
      { id: "workload-or-stress-treatment", prompt: "업무 과부하·스트레스의 치료나 임상적 원인을 판단하는 분석" },
    ], evidenceFocus: ["element_balance", "fortune_flow", "strength", "fortune_brain"],
    decisionCriteria: { 확대: "리듬이 유지되는 생활 조건을 넓히는 방향", 유지: "현재 취침·기상 관찰 기준을 유지하는 방향", 조정: "리듬을 흔드는 생활 조건을 다시 정리하는 방향", 보류: "지속 신호 확인 전 생활 부담을 더하지 않는 방향" },
    decisionType: "exploration", actionFocus: ["취침 전 조건·기상 시간·다음날 회복을 기록하는 행동", "반복적으로 리듬을 흔드는 생활 조건을 줄이거나 순서를 조정하는 행동", "지속적 기능 저하가 관찰되면 실제 의료 상담을 준비하는 기준을 검토하는 행동"],
    prohibitedClaims: ["수면장애·질병 진단", "치료·약물·의료 행위 지시", "회복 시점 보장", "실제 신체 상태 단정"],
  },
  {
    productId: "health-stress-regulation", engine: "HEALTH",
    userQuestion: "어떤 외부 부담이 스트레스 반응을 키우며, 생활로 번지기 전에 어떤 조절 순서를 시험해야 하는가?",
    analysisFocus: ["외부 요구가 반응 확대·회피·반추로 이어지는 조건", "생활 기능과 회복에 번지는 관찰 신호", "임상 진단이 아닌 중단·조절·검토 순서"],
    requiredInsights: [
      { id: "stress-trigger-pattern", prompt: "외부 요구와 생활 조건이 스트레스 반응을 촉발하는 패턴을 구분한다." },
      { id: "stress-escalation-signal", prompt: "반추, 회피, 과민 반응, 회복 지연처럼 반응이 확대되는 관찰 신호를 제시한다." },
      { id: "stress-regulation-resource", prompt: "부담을 중단하고 회복으로 전환하는 자원·시간·경계의 조건을 설명한다." },
      { id: "stress-response-action", prompt: "촉발부터 중단·조절·다음 검토까지의 구체 행동을 제시한다." },
    ], excludedFocus: [
      { id: "clinical-mental-health-diagnosis", prompt: "우울·불안·정신질환을 진단하거나 치료하는 분석" },
      { id: "burnout-cumulative-risk", prompt: "누적 부하와 회복 실패를 번아웃 위험으로 검토하는 분석" },
      { id: "general-health-treatment", prompt: "질병·약물·치료 결과를 판단하는 분석" },
    ], evidenceFocus: ["strength", "element_relations", "fortune_brain", "fortune_flow"],
    decisionCriteria: { 확대: "조절 자원이 확인된 활동 범위를 넓히는 방향", 유지: "현재 중단·회복 기준을 유지하는 방향", 조정: "반응을 키우는 요구·시간·경계를 다시 정리하는 방향", 보류: "반응 확대 신호가 지속될 때 부담을 더하지 않는 방향" },
    decisionType: "exploration", actionFocus: ["촉발 상황·반응·회복 시간을 기록하는 행동", "생활로 번지는 반응을 중단할 경계와 회복 자원을 정하는 행동", "지속적 기능 저하가 있으면 실제 전문가 상담 기준을 검토하는 행동"],
    prohibitedClaims: ["우울·불안·정신질환 진단", "치료·약물·상담 강제", "임상적 예후 보장", "실제 정신 상태 단정"],
  },
  {
    productId: "health-burnout-risk", engine: "HEALTH",
    userQuestion: "어떤 누적 업무·생활 패턴이 회복 실패 위험을 높이며, 언제 부하를 줄이는 검토가 필요한가?",
    analysisFocus: ["업무와 생활에 걸친 누적 부하", "거리감·기능 저하·회복 실패의 비진단적 신호", "직업 업무 재설계가 아닌 부하 감소와 회복 검토"],
    requiredInsights: [
      { id: "burnout-cumulative-load", prompt: "업무와 생활에 걸친 누적 부하가 회복 여유를 줄이는 조건을 구분한다." },
      { id: "burnout-detachment-signal", prompt: "거리감, 의욕 저하, 회피, 기능 저하처럼 부하 누적을 점검할 관찰 신호를 제시한다." },
      { id: "burnout-recovery-failure", prompt: "휴식 뒤에도 회복되지 않거나 같은 부담이 반복되는 조건을 설명한다." },
      { id: "burnout-load-reduction-action", prompt: "부하를 줄이고 실제 상담·검토가 필요한 기준을 준비할 구체 행동을 제시한다." },
    ], excludedFocus: [
      { id: "work-cycle-priority-redesign", prompt: "현재 업무의 책임·일정·재작업 경계를 재설계하는 분석" },
      { id: "clinical-burnout-diagnosis", prompt: "임상적 번아웃·우울·불안 진단과 치료를 판단하는 분석" },
      { id: "energy-or-sleep-rhythm", prompt: "에너지 리듬 또는 수면 습관을 중심으로 하는 분석" },
    ], evidenceFocus: ["strength", "element_balance", "fortune_flow", "fortune_brain"],
    decisionCriteria: { 확대: "회복 신호가 확인된 활동만 넓히는 방향", 유지: "현재 부하와 회복 기준을 유지하는 방향", 조정: "누적 부하와 회복 실패 조건을 다시 정리하는 방향", 보류: "부하 감소와 실제 상담 검토 전 새 요구를 더하지 않는 방향" },
    decisionType: "exploration", actionFocus: ["누적 부하·거리감·회복 시간을 같은 기준으로 기록하는 행동", "회복 실패 신호가 반복되면 줄일 활동과 지원 요청 기준을 정하는 행동", "지속적 기능 저하가 있으면 실제 의료·전문가 상담을 준비하는 행동"],
    prohibitedClaims: ["번아웃·우울·불안·질병 진단", "치료·약물·휴직 지시", "회복 결과·시점 보장", "실제 건강 상태 단정"],
  },
  {
    productId: "health-habit-continuity", engine: "HEALTH",
    userQuestion: "건강을 돕는 생활 습관은 왜 반복해서 무너지며, 어떤 재시작 기준이 지속 가능하게 만드는가?",
    analysisFocus: ["생활 습관이 끊기는 조건과 단서", "전부 아니면 전무 방식과 재시작 마찰", "식단·운동 처방이 아닌 관찰 가능한 습관 재설정"],
    requiredInsights: [
      { id: "habit-break-condition", prompt: "건강 지원 습관이 부담·일정·환경 변화에서 끊기는 조건을 구분한다." },
      { id: "habit-cue-signal", prompt: "시작 단서, 반복 시점, 누락 패턴으로 습관 지속성을 확인할 신호를 제시한다." },
      { id: "habit-restart-friction", prompt: "한 번의 실패가 장기 중단으로 이어지는 재시작 마찰의 메커니즘을 설명한다." },
      { id: "habit-reset-action", prompt: "습관을 다시 시작하고 다음 주기에 검토할 구체 행동을 제시한다." },
    ], excludedFocus: [
      { id: "medical-lifestyle-treatment", prompt: "식단·운동·치료를 처방하거나 의료 결과를 판단하는 분석" },
      { id: "financial-routine-maintenance", prompt: "저축·예산·재정 습관을 유지하는 분석" },
      { id: "study-focus-routine", prompt: "학습·집중 블록을 운영하는 분석" },
    ], evidenceFocus: ["fortune_brain", "strength", "fortune_flow", "element_balance"],
    decisionCriteria: { 확대: "지속 신호가 확인된 습관 범위를 넓히는 방향", 유지: "현재 반복 기준을 유지하는 방향", 조정: "습관 단서·부담·재시작 순서를 다시 정리하는 방향", 보류: "지속 기준이 확인되기 전 새 습관을 더하지 않는 방향" },
    decisionType: "exploration", actionFocus: ["습관의 시작 단서·누락·재시작을 기록하는 행동", "전부 아니면 전무가 되는 조건을 줄이고 최소 재시작 기준을 정하는 행동", "다음 주기에 지속·조정·상담 검토가 필요한 신호를 점검하는 행동"],
    prohibitedClaims: ["질병·체질·치료 진단", "식단·운동·약물 처방", "건강 결과 보장", "실제 생활 습관 단정"],
  },
  {
    productId: "health-body-signal-review", engine: "HEALTH",
    userQuestion: "비진단적 몸의 신호가 반복될 때 언제 휴식·검토·실제 상담을 준비해야 하는가?",
    analysisFocus: ["몸의 신호를 생활 부담과 함께 관찰하는 범주", "지속·반복·기능 흔들림으로 확인하는 안전 임계값", "의학적 해석이 아닌 휴식·기록·상담 준비 기준"],
    requiredInsights: [
      { id: "body-signal-category", prompt: "생활 부담과 함께 관찰할 비진단적 몸의 신호 범주를 구분한다." },
      { id: "body-signal-persistence-condition", prompt: "신호의 지속, 반복, 일상 기능 흔들림으로 검토할 조건을 제시한다." },
      { id: "body-signal-safety-threshold", prompt: "휴식·생활 조정만으로 넘기지 않고 실제 상담을 준비할 안전 기준을 설명한다." },
      { id: "body-signal-review-action", prompt: "신호·생활 맥락·지속 조건을 기록하고 휴식·검토·상담 준비 행동을 제시한다." },
    ], excludedFocus: [
      { id: "medical-diagnosis-treatment-prognosis", prompt: "질병·원인·치료·예후를 진단하거나 판단하는 분석" },
      { id: "general-energy-rhythm", prompt: "일상 에너지 회복 리듬을 중심으로 하는 분석" },
      { id: "sleep-or-stress-specific-analysis", prompt: "수면 리듬이나 스트레스 반응을 중심으로 하는 분석" },
    ], evidenceFocus: ["strength", "element_balance", "fortune_flow", "fortune_brain"],
    decisionCriteria: { 확대: "안전 신호가 확인된 활동만 넓히는 방향", 유지: "현재 휴식·기록 기준을 유지하는 방향", 조정: "신호와 부담 조건을 다시 정리하는 방향", 보류: "지속·기능 저하 신호가 있을 때 부담을 더하지 않는 방향" },
    decisionType: "exploration", actionFocus: ["몸의 신호·생활 부담·지속 시간을 기록하는 행동", "휴식과 생활 조정 뒤 변화를 검토하는 행동", "지속·반복·기능 저하가 있으면 실제 의료 상담을 준비하는 기준을 정하는 행동"],
    prohibitedClaims: ["질병·원인·예후 진단", "치료·약물·의료 행위 지시", "상담 결과 보장", "실제 신체 상태 단정"],
  },
  {
    productId: "study-learning-strategy", engine: "STUDY",
    userQuestion: "어떤 학습 구조가 노력কে 이해·기억·활용 가능한 성과로 가장 잘 전환하는가?",
    analysisFocus: ["정보 처리·정리·보존 방식", "학습 범위와 깊이의 순서", "회상·설명·오류·적용으로 확인하는 학습 진척"],
    requiredInsights: [{ id: "learning-processing-pattern", prompt: "정보를 처리·정리·보존할 때 이해가 남는 학습 패턴을 설명한다." }, { id: "learning-depth-breadth-balance", prompt: "학습 범위와 깊이의 균형 및 순서를 구분한다." }, { id: "learning-feedback-signal", prompt: "회상·설명·적용·오류·복습 결과로 진척을 확인할 신호를 제시한다." }, { id: "learning-strategy-action", prompt: "학습 방법을 제한된 기간에 시험하고 검토할 구체 행동을 제시한다." }],
    excludedFocus: [{ id: "exam-campaign-readiness", prompt: "특정 시험의 범위·모의 평가·오류 검토 캠페인을 설계하는 분석" }, { id: "focus-session-environment", prompt: "집중 세션의 시작·중단·재시작 환경을 설계하는 분석" }, { id: "career-specialization-recognition", prompt: "전문 분야 선택과 장기 경력 인정 경로를 판단하는 분석" }],
    evidenceFocus: ["fortune_brain", "strength", "element_balance", "fortune_flow"],
    decisionCriteria: { 확대: "검증된 학습 구조의 적용 범위를 넓히는 방향", 유지: "현재 학습 방법을 유지하며 피드백을 확인하는 방향", 조정: "처리·정리·복습 순서를 다시 정리하는 방향", 보류: "진척 증거 없이 학습 범위를 더하지 않는 방향" }, decisionType: "exploration",
    actionFocus: ["학습 후 회상·설명·적용 결과를 같은 기준으로 기록하는 행동", "범위와 깊이의 비중을 바꾼 학습 실험을 시행하는 행동", "오류와 복습 결과를 다음 학습 구조에 반영하는 행동"],
    prohibitedClaims: ["합격·점수·입학·학업 성공 보장", "지능·ADHD·학습장애 진단", "정확한 성취 시점 예측", "실제 능력 단정"],
  },
  {
    productId: "study-exam-preparation", engine: "STUDY",
    userQuestion: "정해진 시험·평가를 준비할 때 어떤 범위·연습·오류 검토 순서가 준비도를 높이는가?",
    analysisFocus: ["시험 범위의 준비 공백", "연습·모의 평가·오류 패턴", "준비 순서와 readiness 검토"],
    requiredInsights: [{ id: "exam-readiness-gap", prompt: "시험 범위와 현재 준비 사이의 공백을 구분한다." }, { id: "exam-practice-signal", prompt: "연습·모의 평가·오류 패턴으로 준비도를 확인할 신호를 제시한다." }, { id: "exam-review-cycle", prompt: "오류 검토와 재연습이 준비도를 바꾸는 반복 주기를 설명한다." }, { id: "exam-preparation-action", prompt: "시험 준비 순서와 오류 검토를 실행할 구체 행동을 제시한다." }],
    excludedFocus: [{ id: "general-learning-method", prompt: "장기 학습 구조와 정보 처리 방식을 최적화하는 분석" }, { id: "focus-environment-routine", prompt: "집중 환경과 세션 재시작 조건을 설계하는 분석" }, { id: "credential-investment-decision", prompt: "시험·자격증 자체가 시간·비용 투자 가치가 있는지 판단하는 분석" }],
    evidenceFocus: ["fortune_flow", "fortune_brain", "strength", "element_balance"],
    decisionCriteria: { 확대: "준비 증거가 확인된 범위의 연습을 넓히는 방향", 유지: "현재 준비 순서를 유지하며 오류 신호를 확인하는 방향", 조정: "범위·연습·오류 검토 순서를 다시 정리하는 방향", 보류: "준비 공백이 큰 범위의 확장을 미루는 방향" }, decisionType: "exploration",
    actionFocus: ["시험 범위와 준비 공백을 실제 자료로 표시하는 행동", "모의·연습 결과의 오류를 유형별로 검토하는 행동", "다음 준비 주기의 범위·연습·검토 순서를 재배분하는 행동"],
    prohibitedClaims: ["합격·불합격·점수·입학 결과 예측", "시험 성공 시점 단정", "지능·학습장애 진단", "특정 학교·과정 합격 보장"],
  },
  {
    productId: "study-focus-routine", engine: "STUDY",
    userQuestion: "집중 학습은 어떤 환경과 행동 조건에서 시작·중단·재시작되며, 어떤 세션 기준을 시험해야 하는가?",
    analysisFocus: ["집중을 깨는 환경·행동 조건", "세션 진입·유지·재시작 신호", "주의력 진단이 아닌 학습 환경과 경계"],
    requiredInsights: [{ id: "focus-disruption-condition", prompt: "집중을 시작하거나 유지하기 어렵게 만드는 환경·행동 조건을 구분한다." }, { id: "focus-entry-signal", prompt: "학습 세션에 진입할 수 있는 시간·장소·준비 신호를 제시한다." }, { id: "focus-restart-friction", prompt: "중단 뒤 재시작을 어렵게 만드는 마찰의 메커니즘을 설명한다." }, { id: "focus-routine-action", prompt: "집중 세션과 재시작 조건을 시험할 구체 행동을 제시한다." }],
    excludedFocus: [{ id: "learning-method-retention", prompt: "정보 처리·기억·적용을 위한 학습 방법을 설계하는 분석" }, { id: "clinical-attention-diagnosis", prompt: "ADHD·주의력·실행기능·정신질환을 진단하는 분석" }, { id: "general-health-treatment", prompt: "건강·수면·치료를 진단하거나 처방하는 분석" }],
    evidenceFocus: ["fortune_brain", "element_balance", "strength", "fortune_flow"],
    decisionCriteria: { 확대: "집중이 확인된 세션 범위를 넓히는 방향", 유지: "현재 세션 기준을 유지하며 중단 신호를 관찰하는 방향", 조정: "환경·시작·재시작 조건을 다시 정리하는 방향", 보류: "중단 원인이 불명확한 세션을 더 늘리지 않는 방향" }, decisionType: "exploration",
    actionFocus: ["집중 시작·중단·재시작 조건을 기록하는 행동", "환경 자극과 세션 경계를 조정하는 행동", "재시작 마찰이 반복될 때 다음 세션 기준을 검토하는 행동"],
    prohibitedClaims: ["ADHD·주의력장애·정신질환 진단", "치료·약물·의료 행위 지시", "집중력 결과 보장", "실제 인지 능력 단정"],
  },
  {
    productId: "study-credential-decision", engine: "STUDY",
    userQuestion: "이 자격증·학업 투자가 현재의 시간·비용·준비 여력을 쓸 만큼 실제 의사결정 가치가 있는가?",
    analysisFocus: ["자격증의 목적·실무 사용·증명 가치", "시간·비용·준비 용량의 기회비용", "진행·보류·재검토 기준"],
    requiredInsights: [{ id: "credential-purpose-fit", prompt: "자격증이 현재 목적과 실무 사용에 맞는지 구분한다." }, { id: "credential-cost-capacity", prompt: "시간·비용·준비 여력이 다른 책임과 충돌하는 조건을 설명한다." }, { id: "credential-proof-value", prompt: "자격증이 실제 증명·적용·다음 선택에 주는 가치를 확인할 신호를 제시한다." }, { id: "credential-decision-action", prompt: "진행·보류·거절을 판단할 구체 행동을 제시한다." }],
    excludedFocus: [{ id: "exam-preparation-how", prompt: "시험을 이미 준비하기로 한 뒤 범위·연습·오류 검토를 설계하는 분석" }, { id: "career-specialization-selection", prompt: "장기 전문 분야와 인정 경로를 설계하는 분석" }, { id: "admission-or-job-guarantee", prompt: "합격·취업·연봉·시장 결과를 보장하는 분석" }],
    evidenceFocus: ["fortune_brain", "fortune_flow", "strength", "element_balance"],
    decisionCriteria: { 확대: "목적·용량·증명 가치가 확인된 준비를 넓히는 방향", 유지: "현재 검토 범위를 유지하며 증거를 확인하는 방향", 조정: "시간·비용·실무 사용 조건을 다시 정리하는 방향", 보류: "투자 가치가 불명확한 자격 준비를 미루는 방향" }, decisionType: "decision",
    actionFocus: ["자격증의 목적·실무 사용·대체 경로를 비교하는 행동", "시간·비용·준비 여력의 기회비용을 기록하는 행동", "진행·보류·거절 기준을 증명 가치와 함께 문장화하는 행동"],
    prohibitedClaims: ["합격·입학·취업·연봉·시장 가치 보장", "특정 점수·시점 예측", "지능·학습 능력 단정", "특정 학교·자격증 강제 추천"],
  },
  {
    productId: "business-startup-readiness", engine: "BUSINESS",
    userQuestion: "창업 파일럿을 시작하기 전에 운영 가설·역할·용량·증명 공백이 충분히 검토되었는가?",
    analysisFocus: ["반복 가능한 운영 가설과 역할 준비", "증명 공백과 개인 용량", "창업 결과가 아닌 제한된 파일럿의 진행·수정·중단 기준"],
    requiredInsights: [{ id: "startup-operating-readiness", prompt: "창업 운영에 필요한 역할·책임·기본 절차의 준비도를 구분한다." }, { id: "startup-proof-gap", prompt: "반복 가능한 제안·과정·확인 자료에서 아직 증명되지 않은 공백을 설명한다." }, { id: "startup-capacity-condition", prompt: "시간·책임·회복 여력이 파일럿을 감당하는지 확인할 조건을 제시한다." }, { id: "startup-pilot-action", prompt: "제한된 창업 파일럿의 진행·수정·중단 기준을 검토할 구체 행동을 제시한다." }],
    excludedFocus: [{ id: "freelance-personal-service-transition", prompt: "개인 서비스 제공과 고용 이탈을 중심으로 하는 독립·프리랜서 전환 분석" }, { id: "market-revenue-prediction", prompt: "시장 수요·매출·고객 확보 결과를 예측하거나 보장하는 분석" }, { id: "expansion-control", prompt: "이미 운영 중인 사업의 범위·고객·비용 확장을 통제하는 분석" }],
    evidenceFocus: ["fortune_brain", "strength", "fortune_flow", "element_relations"],
    decisionCriteria: { 확대: "운영 증거와 용량이 확인된 파일럿 범위를 넓히는 방향", 유지: "현재 가설 검증 범위를 유지하는 방향", 조정: "역할·증명 공백·용량 조건을 다시 정리하는 방향", 보류: "운영 증거가 부족한 확장을 미루는 방향" }, decisionType: "decision",
    actionFocus: ["창업 가설·역할·반복 과정의 증명 공백을 기록하는 행동", "제한된 파일럿의 용량·책임·중단 조건을 정하는 행동", "파일럿 결과를 진행·수정·중단 기준으로 검토하는 행동"],
    prohibitedClaims: ["사업 성공·매출·고객 확보 보장", "투자 수익·시장 사실 예측", "법률·세무 결론", "창업 시점 단정"],
  },
  {
    productId: "business-expansion-control", engine: "BUSINESS",
    userQuestion: "현재 운영이 범위·고객·비용·책임을 더 흡수할 충분한 용량과 통제 근거를 갖추었는가?",
    analysisFocus: ["확장 압력과 운영 용량", "승인·품질·책임 통제 상실 신호", "확장·중단·재검토 기준"],
    requiredInsights: [{ id: "expansion-pressure-signal", prompt: "범위·고객·비용·책임을 늘리라는 압력이 커지는 신호를 구분한다." }, { id: "expansion-capacity-condition", prompt: "현재 인력·시간·책임·품질 용량이 확장을 감당하는 조건을 설명한다." }, { id: "expansion-control-boundary", prompt: "승인 병목, 품질 저하, 책임 혼선이 통제 상실로 이어지는 경계를 제시한다." }, { id: "expansion-review-action", prompt: "제한된 확장·중단·재검토 기준을 실행할 구체 행동을 제시한다." }],
    excludedFocus: [{ id: "startup-launch-readiness", prompt: "초기 사업 가설과 파일럿 시작 준비도를 판단하는 분석" }, { id: "revenue-or-market-guarantee", prompt: "매출·고객 수·시장 성공을 보장하는 분석" }, { id: "investment-legal-tax-advice", prompt: "투자·법률·세무 실행을 지시하는 분석" }],
    evidenceFocus: ["fortune_flow", "strength", "element_relations", "fortune_brain"],
    decisionCriteria: { 확대: "통제와 용량이 확인된 범위만 넓히는 방향", 유지: "현재 운영 범위를 유지하며 통제 신호를 확인하는 방향", 조정: "승인·책임·품질·용량 경계를 다시 정리하는 방향", 보류: "통제 상실 신호가 있을 때 확장을 미루는 방향" }, decisionType: "decision",
    actionFocus: ["확장 압력과 현재 용량을 같은 기준으로 기록하는 행동", "승인·품질·책임 병목이 생기는 경계를 정하는 행동", "제한된 확장 결과를 중단·재검토 기준으로 검토하는 행동"],
    prohibitedClaims: ["사업 성장·매출·고객 증가 보장", "확장 성공 시점 예측", "투자·법률·세무 결론", "시장 사실 단정"],
  },
  {
    productId: "business-client-relationship", engine: "BUSINESS",
    userQuestion: "고객 요청·범위·승인·수정에서 무엇이 반복 가능한 납품과 책임 경계를 만드는가?",
    analysisFocus: ["고객 기대와 산출물 범위", "수정·승인·책임의 지연 신호", "외부 고객 운영 경계와 절차"],
    requiredInsights: [{ id: "client-expectation-pattern", prompt: "고객 요청과 산출물 기대가 어긋나는 반복 패턴을 구분한다." }, { id: "client-scope-change-signal", prompt: "범위 변경·수정 요청·추가 업무를 확인할 관찰 신호를 제시한다." }, { id: "client-approval-responsibility", prompt: "승인 지연과 최종 책임 불명확이 납품 부담을 키우는 조건을 설명한다." }, { id: "client-boundary-action", prompt: "고객 범위·승인·수정·책임 절차를 운영할 구체 행동을 제시한다." }],
    excludedFocus: [{ id: "freelance-transition-readiness", prompt: "독립 개인 작업 전환과 고용 이탈을 판단하는 분석" }, { id: "internal-workplace-collaboration", prompt: "상사·동료·내부 이해관계자의 협업을 분석하는 범위" }, { id: "legal-contract-conclusion", prompt: "계약의 법률 효력·분쟁 결론을 제공하는 분석" }],
    evidenceFocus: ["fortune_brain", "element_relations", "fortune_flow", "strength"],
    decisionCriteria: { 확대: "승인·범위·책임이 확인된 고객 관계만 넓히는 방향", 유지: "현재 고객 절차를 유지하며 변경 신호를 확인하는 방향", 조정: "요청·수정·승인·책임 기준을 다시 정리하는 방향", 보류: "최종 승인과 범위가 불명확한 납품을 미루는 방향" }, decisionType: "exploration",
    actionFocus: ["고객 요청·산출물·수정·승인 조건을 문서로 맞추는 행동", "범위 변경과 추가 업무를 재협상할 기준을 정하는 행동", "승인 지연과 책임 혼선을 검토해 고객 절차를 조정하는 행동"],
    prohibitedClaims: ["고객 확보·계약 성사·매출 보장", "고객 의도 단정", "법률·세무 결론", "특정 고객 추천"],
  },
  {
    productId: "business-team-management", engine: "BUSINESS",
    userQuestion: "운영 팀의 결정권·위임·피드백·책임 모호성을 어떻게 줄여 반복 실행 실패를 막아야 하는가?",
    analysisFocus: ["팀 결정 병목과 역할 명확성", "위임·후속 이행·피드백", "개인 리더 준비도가 아닌 팀 운영 시스템"],
    requiredInsights: [{ id: "team-decision-bottleneck", prompt: "결정권이 특정 사람에게 몰려 실행이 지연되는 병목을 구분한다." }, { id: "team-delegation-signal", prompt: "위임된 업무의 범위·후속 이행·재작업으로 위임 상태를 확인할 신호를 제시한다." }, { id: "team-feedback-ownership", prompt: "피드백·최종 책임·에스컬레이션이 팀 실행을 정렬하는 조건을 설명한다." }, { id: "team-management-action", prompt: "팀의 결정권·위임·피드백·책임 리듬을 운영할 구체 행동을 제시한다." }],
    excludedFocus: [{ id: "personal-leadership-readiness", prompt: "개인이 리더 역할을 맡을 준비와 영향력 실험을 판단하는 분석" }, { id: "promotion-title-readiness", prompt: "승진·직책·평가 승인 결과를 판단하는 분석" }, { id: "client-or-market-growth", prompt: "외부 고객·시장·매출 성과를 판단하는 분석" }],
    evidenceFocus: ["gyeokguk", "fortune_brain", "strength", "element_relations"],
    decisionCriteria: { 확대: "결정권·위임·피드백이 확인된 팀 범위를 넓히는 방향", 유지: "현재 팀 운영 기준을 유지하며 병목을 관찰하는 방향", 조정: "결정·위임·책임·에스컬레이션을 다시 정리하는 방향", 보류: "운영 병목이 해소되기 전 팀 책임을 더하지 않는 방향" }, decisionType: "exploration",
    actionFocus: ["팀 결정권과 최종 책임자를 업무별로 기록하는 행동", "위임 범위·후속 이행·재작업 기준을 팀에 맞추는 행동", "피드백·에스컬레이션·책임 확인 리듬을 검토하는 행동"],
    prohibitedClaims: ["팀 성과·승진·사업 성공 보장", "구성원의 의도·능력 단정", "채용·해고·법률 결론", "특정 성공 시점 예측"],
  },
];

const LAUNCH_TOPIC_CONFIG_MAP = new Map<string, PaidAnalysisTopicConfigWithPurchaseDecision>(
  LAUNCH_TOPIC_CONFIGS.map((config) => [
    config.productId,
    { ...config, purchaseDecision: createTopicPurchaseDecision(config) },
  ]),
);

/** PERIOD products are specialised by analysisPeriodStrategy, not by a topic config. */
const PERIOD_LAUNCH_PRODUCT_IDS = [
  "monthly-current",
  "monthly-next",
  "yearly-current",
  "annual-next",
  "annual-3years",
  "daeun-current",
  "lifetime-overview",
];

export type PaidAnalysisLaunchSpecialization =
  | { kind: "topic"; config: PaidAnalysisTopicConfig }
  | { kind: "period"; productId: string; engine: PaidAnalysisEngine }
  | { kind: "none" };

export function getPaidAnalysisTopicConfig(
  productId?: string,
): PaidAnalysisTopicConfigWithPurchaseDecision | undefined {
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
 * Derives static reasoning responsibilities from the existing product contract.
 * The generator must expand each responsibility through the V4 output sections.
 */
export function getPaidAnalysisPremiumDepthContract(
  config: PaidAnalysisTopicConfig,
): PaidAnalysisPremiumDepthContract {
  return {
    productId: config.productId,
    requiredInsightIds: config.requiredInsights.map((item) => item.id),
    evidenceFocus: config.evidenceFocus,
    actionFocus: config.actionFocus,
    positiveOwnership: [
      config.userQuestion,
      ...config.analysisFocus,
      ...config.requiredInsights.map((item) => item.prompt),
      ...config.actionFocus,
    ],
    insightOwnership: config.requiredInsights.map((insight, index) => ({
      insightId: insight.id,
      evidenceKey: config.evidenceFocus[index % config.evidenceFocus.length],
      mechanism: insight.prompt,
      observableCondition: `${insight.prompt} ${config.analysisFocus[index % config.analysisFocus.length]}`,
      actionResponsibility: `${config.actionFocus[index % config.actionFocus.length]} (${insight.id})`,
    })),
    timingMode: "contextual",
  };
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
