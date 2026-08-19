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
