import type { PaidAnalysisDetailOutputV2 } from "../app/lib/paidAnalysisDetailOutput";
import { validatePaidAnalysisHealthSafety } from "../app/lib/paidAnalysisHealthSafetyValidator";

const baseOutput: PaidAnalysisDetailOutputV2 = {
  heroSummary: {
    headline: "생활 리듬을 재정비해 회복 흐름을 안정시키세요",
    subheadline: "과로를 줄이고 수면과 식사 리듬을 일정하게 유지하는 것이 중요합니다",
    keyMessage: "속도보다 회복 시간을 먼저 확보하는 것이 핵심입니다",
  },

  decisionAnchor: {
    direction: "조정",
    focus: "수면·식사·운동 리듬 정비",
    rationale:
      "현재 흐름에서는 무리한 활동 확대보다 생활 패턴을 일정하게 조정하는 것이 컨디션 관리에 도움이 됩니다.",
  },

  causeAnalysis: {
    summary: "현재는 피로가 누적되기 쉬워 회복 리듬 관리가 중요합니다",
    reasons: [
      "일정이 불규칙하면 피로 체감이 커지기 쉬운 흐름입니다",
      "수면 시간이 흔들리면 일상 집중력도 함께 낮아질 수 있습니다",
      "무리한 운동보다 일정한 생활 습관을 유지하는 것이 우선입니다",
    ],
  },

  fortuneStructure: {
    summary: "현재 건강 흐름을 만드는 핵심 생활 구조입니다",
    items: [
      {
        label: "체력 소모",
        value: "관리 필요",
        interpretation: "활동량이 많아지면 피로가 쉽게 누적될 수 있습니다",
      },
      {
        label: "회복 리듬",
        value: "불규칙",
        interpretation: "수면과 휴식 시간이 일정하지 않으면 회복이 더뎌질 수 있습니다",
      },
      {
        label: "생활 습관",
        value: "조정 필요",
        interpretation: "식사와 운동 시간을 일정하게 유지하는 것이 중요합니다",
      },
    ],
  },

  currentSituation: {
    summary: "현재는 생활 리듬을 재정비할수록 컨디션 변동을 줄이기 쉬운 시기입니다",
    opportunities: [
      "기상과 취침 시간을 일정하게 고정할 수 있습니다",
      "가벼운 유산소 운동을 꾸준히 이어갈 수 있습니다",
      "카페인과 야식 습관을 점검할 수 있습니다",
    ],
    cautions: [
      "연속 야근과 수면 부족을 반복하지 않습니다",
      "무리한 고강도 운동을 한꺼번에 시작하지 않습니다",
      "불편이 지속될 경우 혼자 판단하지 않습니다",
    ],
  },

  futureTimeline: [
    {
      period: "현재",
      title: "회복 시간 확보",
      description: "수면과 휴식 시간을 먼저 일정하게 정리합니다",
    },
    {
      period: "앞으로 3개월",
      title: "생활 습관 점검",
      description: "식사와 운동 기록을 통해 컨디션 변화를 확인합니다",
    },
    {
      period: "앞으로 6개월",
      title: "과로 방지",
      description: "일정과 활동량을 조절해 피로 누적을 줄입니다",
    },
    {
      period: "앞으로 1년",
      title: "안정적인 리듬 유지",
      description: "꾸준히 유지 가능한 생활 관리 기준을 정착시킵니다",
    },
  ],

  actionGuide: [
    "매일 비슷한 시간에 잠들고 일어나는 습관을 만듭니다",
    "주 3회 가벼운 유산소 운동을 일정하게 진행합니다",
    "식사 시간과 수분 섭취를 기록해 생활 패턴을 확인합니다",
    "오후 늦은 시간의 카페인 섭취를 줄입니다",
    "불편이 지속되거나 심해지면 의료 전문가와 상담합니다",
  ],

  avoidGuide: [
    "주말에 몰아서 잠을 보충하는 습관을 피합니다",
    "무리한 고강도 운동을 갑자기 시작하지 않습니다",
    "불규칙한 야식과 음주를 반복하지 않습니다",
    "검사 결과나 증상을 스스로 단정하지 않습니다",
  ],

  coachMessage: {
    title: "속도보다 회복 리듬을 먼저 안정시키세요",
    message:
      "현재는 생활 패턴을 단순하고 일정하게 유지하는 것이 중요합니다. 명리 해석에 따른 생활 리듬 참고 정보이며 의료 진단이 아닙니다.",
  },

  checklist: [
    "최근 일주일간 취침과 기상 시간이 일정했는지 확인합니다",
    "하루 동안 충분한 수분을 섭취했는지 확인합니다",
    "카페인과 야식 섭취 시간을 기록했는지 확인합니다",
    "무리하지 않는 운동 계획을 세웠는지 확인합니다",
    "불편이 지속될 경우 상담 계획을 세웠는지 확인합니다",
  ],

  recommendations: [],
};

const validResult = validatePaidAnalysisHealthSafety(baseOutput);

console.log("안전한 건강운 리포트 통과:", validResult.ok);

const invalidOutput: PaidAnalysisDetailOutputV2 = {
  ...baseOutput,
  causeAnalysis: {
    ...baseOutput.causeAnalysis,
    reasons: [
      "현재 교감신경 항진이 나타나고 있습니다",
      ...baseOutput.causeAnalysis.reasons.slice(1),
    ],
  },
  coachMessage: {
    ...baseOutput.coachMessage,
    message: "위장 기능 저하가 있으므로 치료가 필요하다.",
  },
};

const invalidResult = validatePaidAnalysisHealthSafety(invalidOutput);

console.log("금지 표현 리포트 거부:", !invalidResult.ok);
console.log("건강 안전 이슈 개수:", invalidResult.issues.length);

if (!validResult.ok) {
  throw new Error(
    `안전한 건강운 리포트가 거부되었습니다: ${validResult.issues
      .map((issue) => issue.message)
      .join(" | ")}`,
  );
}

if (invalidResult.ok) {
  throw new Error("의료적 금지 표현이 포함된 리포트가 거부되지 않았습니다.");
}

if (invalidResult.issues.length < 3) {
  throw new Error(
    `건강 안전 이슈가 충분히 검출되지 않았습니다: ${invalidResult.issues.length}`,
  );
}

console.log("paid analysis health safety validator regression passed");