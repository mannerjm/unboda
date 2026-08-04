import type { PaidAnalysisDetailOutputV2 } from "../app/lib/paidAnalysisDetailOutput";
import { validatePaidAnalysisConsistency } from "../app/lib/paidAnalysisConsistencyValidator";

const baseOutput: PaidAnalysisDetailOutputV2 = {
  heroSummary: {
    headline: "현재는 확대보다 조건 조정이 우선입니다",
    subheadline: "실행 전에 기준과 순서를 다시 정리해야 합니다",
    keyMessage: "무리한 확장보다 안정적인 조정이 핵심입니다",
  },

  decisionAnchor: {
    direction: "조정",
    focus: "실행 조건과 우선순위 정리",
    rationale:
      "현재 흐름에서는 무리한 확대보다 실행 기준과 조건을 먼저 조정하는 것이 필요합니다.",
  },

  causeAnalysis: {
    summary: "현재 흐름은 조정이 필요한 구조입니다",
    reasons: [
      "원국 구조상 속도보다 기준 정리가 우선입니다",
      "현재 운에서는 외부 변화보다 내부 조건 점검이 중요합니다",
      "대운과 세운의 흐름이 동시에 확대보다 조정을 요구합니다",
    ],
  },

  fortuneStructure: {
    summary: "현재 판단의 핵심 구조입니다",
    items: [
      {
        label: "기준",
        value: "조정",
        interpretation: "우선순위와 조건을 먼저 정리해야 합니다",
      },
      {
        label: "속도",
        value: "보통",
        interpretation: "서두르기보다 단계적으로 진행해야 합니다",
      },
      {
        label: "위험",
        value: "관리 필요",
        interpretation: "조건이 불명확하면 손실 가능성이 커질 수 있습니다",
      },
    ],
  },

  currentSituation: {
    summary: "현재는 무리한 확대보다 조정이 필요한 시기입니다",
    opportunities: [
      "기존 계획의 우선순위를 다시 정리할 수 있습니다",
      "실행 기준을 구체적으로 세울 수 있습니다",
      "불필요한 위험 요소를 미리 줄일 수 있습니다",
    ],
    cautions: [
      "준비 없이 범위를 넓히지 않습니다",
      "조건이 불명확한 결정을 서두르지 않습니다",
      "감정적으로 방향을 바꾸지 않습니다",
    ],
  },

  futureTimeline: [
    {
      period: "현재",
      title: "기준 정리",
      description: "현재는 실행 조건과 우선순위를 먼저 정리해야 합니다",
    },
    {
      period: "앞으로 3개월",
      title: "단계적 실행",
      description: "작은 범위에서 조건을 확인하며 진행해야 합니다",
    },
    {
      period: "앞으로 6개월",
      title: "결과 점검",
      description: "초기 결과를 확인한 뒤 방향을 조정해야 합니다",
    },
    {
      period: "앞으로 1년",
      title: "안정적 확장 검토",
      description: "조건이 갖춰진 뒤에만 범위 확대를 검토해야 합니다",
    },
  ],

  actionGuide: [
    "현재 계획의 우선순위를 문서로 다시 정리합니다",
    "실행 전에 필요한 조건과 기준을 구체적으로 확인합니다",
    "작은 범위에서 먼저 실행하고 결과를 점검합니다",
    "계약과 비용 조건을 다시 검토한 뒤 결정합니다",
    "일정과 책임 범위를 명확하게 구분해서 진행합니다",
  ],

  avoidGuide: [
    "준비 없이 범위를 크게 확대하는 행동을 피합니다",
    "조건이 불명확한 상태에서 결정을 서두르지 않습니다",
    "감정적인 판단으로 기존 계획을 갑자기 바꾸지 않습니다",
    "검증 없이 새로운 책임과 비용을 늘리지 않습니다",
  ],

  coachMessage: {
    title: "지금은 속도보다 기준이 중요합니다",
    message:
      "현재 흐름에서는 무리하게 확대하기보다 우선순위와 실행 조건을 먼저 정리하는 것이 중요합니다.",
  },

  checklist: [
    "현재 가장 중요한 우선순위를 한 문장으로 정리했는지 확인합니다",
    "실행 전에 필요한 비용과 조건을 검토했는지 확인합니다",
    "책임자와 역할 범위를 명확히 나눴는지 확인합니다",
    "작은 범위의 사전 테스트를 진행했는지 확인합니다",
    "결과를 점검할 기준과 시점을 정했는지 확인합니다",
  ],

  recommendations: [],
};

const validResult = validatePaidAnalysisConsistency(baseOutput);

console.log("일관된 리포트 통과:", validResult.ok);

const invalidOutput: PaidAnalysisDetailOutputV2 = {
  ...baseOutput,
  decisionAnchor: {
    ...baseOutput.decisionAnchor,
    direction: "보류",
  },
  actionGuide: [
    "지금 바로 범위를 확대하고 적극 추진합니다",
    ...baseOutput.actionGuide.slice(1),
  ],
};

const invalidResult = validatePaidAnalysisConsistency(invalidOutput);

console.log("모순 리포트 거부:", !invalidResult.ok);
console.log("모순 검출 개수:", invalidResult.issues.length);