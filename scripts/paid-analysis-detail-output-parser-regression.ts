import {
  parsePaidAnalysisDetailOutput,
  parsePaidAnalysisDetailOutputV2,
} from "../app/lib/paidAnalysisDetailOutputParser";
import { parseGeneratedPaidAnalysisDetailV3 } from "../app/lib/paidAnalysisDetailService";

const result = parsePaidAnalysisDetailOutput({
  headline: "관계 흐름이 바뀌는 시점, 선택 기준을 먼저 확인하세요.",
  whyThisAnalysis:
    "현재 관계운의 변화가 커지고 있어 감정만으로 판단하기보다 관계의 방향과 우선순위를 점검할 필요가 있습니다.",
  currentFlow:
    "주변 관계의 재편과 역할 변화가 겹치면서 가까워질 인연과 거리를 조절할 관계가 함께 드러나는 흐름입니다.",
  questionsAnswered: [
    "현재 관계에서 가장 먼저 점검해야 할 문제는 무엇인가요?",
    "관계를 이어갈 때 유리한 시기와 조심해야 할 시기는 언제인가요?",
    "상대와의 거리와 역할을 어떻게 조절해야 하나요?",
  ],
  expectedBenefits: [
    "관계에서 반복되는 갈등의 원인을 구체적으로 이해할 수 있습니다.",
    "중요한 대화와 선택을 진행할 적절한 시기를 확인할 수 있습니다.",
    "감정에 휘둘리지 않고 현실적인 대응 방향을 정리할 수 있습니다.",
  ],
  whyNow:
    "관계의 방향이 굳어지기 전에 기준을 세우면 불필요한 오해와 소모를 줄일 수 있는 시점입니다.",
  ctaMessage:
    "현재 관계 흐름에 맞는 시기와 대응 방향을 심층 분석에서 구체적으로 확인해보세요.",
});

console.log("headline 검증:", result.headline.length > 0);

const resultV2 = parsePaidAnalysisDetailOutputV2({
  heroSummary: {
    headline: "올해 관계에서는 속도보다 기준이 먼저입니다.",
    subheadline: "관계 변화가 커지는 시기에 선택 기준을 점검합니다.",
    keyMessage:
      "새로운 관계를 늘리기보다 현재 관계의 역할과 경계를 정리하는 것이 중요합니다.",
  },

  decisionAnchor: {
  direction: "조정",
  focus: "현재 판단 기준 정리",
  rationale:
    "현재 흐름에서는 무리한 확대보다 우선순위와 실행 조건을 먼저 조정하는 것이 필요합니다.",
},

  causeAnalysis: {
    summary:
      "현재 사주 원국과 운의 흐름이 관계의 확장과 충돌을 함께 키우는 구조입니다.",
    reasons: [
      "현재 운에서 관계 활동성이 강해지고 있습니다.",
      "협력 기회와 역할 충돌이 동시에 나타날 수 있습니다.",
      "감정적 반응보다 명확한 기준이 필요한 시기입니다.",
    ],
  },

  fortuneStructure: {
    summary:
      "원국의 관계 성향과 현재 운의 변화가 함께 작용하고 있습니다.",
    items: [
      {
        label: "원국 균형",
        value: "관계 자극에 민감한 구조",
        interpretation: "상대의 반응보다 자신의 기준을 먼저 정해야 합니다.",
      },
      {
        label: "대운 작용",
        value: "협력과 확장이 커지는 흐름",
        interpretation: "새로운 제안이 늘지만 선별이 필요합니다.",
      },
      {
        label: "세운 작용",
        value: "속도와 충돌이 함께 커지는 흐름",
        interpretation: "빠른 결정 전에 역할과 책임을 확인해야 합니다.",
      },
      {
        label: "합·충 변화",
        value: "관계 재정비가 필요한 구조",
        interpretation: "유지할 관계와 거리를 둘 관계를 구분해야 합니다.",
      },
    ],
  },

  currentSituation: {
    summary:
      "현재는 관계의 수보다 질과 역할을 정리해야 하는 국면입니다.",
    opportunities: [
      "협력 가능한 사람을 선별할 수 있습니다.",
      "기존 관계의 역할을 재정리할 수 있습니다.",
      "대화 기준을 명확히 세울 수 있습니다.",
    ],
    cautions: [
      "호의만으로 책임 범위를 넓히지 않습니다.",
      "감정적인 답변을 즉시 확정하지 않습니다.",
      "구두 약속만으로 중요한 일을 진행하지 않습니다.",
    ],
  },

  futureTimeline: [
    {
      period: "현재",
      title: "관계 기준을 점검하는 시기",
      description: "역할과 책임 범위를 먼저 확인해야 합니다.",
    },
    {
      period: "앞으로 3개월",
      title: "관계 선택이 구체화되는 시기",
      description: "협력할 사람과 거리를 둘 사람을 구분하게 됩니다.",
    },
    {
      period: "앞으로 6개월",
      title: "관계 운영 방식이 자리 잡는 시기",
      description: "초기에 세운 기준이 관계 안정성에 영향을 줍니다.",
    },
    {
      period: "앞으로 1년",
      title: "신뢰 관계가 재편되는 시기",
      description: "명확한 기준을 지킨 관계가 오래 이어질 가능성이 큽니다.",
    },
  ],

  actionGuide: [
    "중요한 약속은 문서로 정리합니다.",
    "관계별 역할과 책임 범위를 적어봅니다.",
    "결정 전에 하루 이상 검토 시간을 둡니다.",
    "갈등이 생기면 사실과 감정을 나누어 기록합니다.",
    "신뢰할 수 있는 사람에게 판단을 검토받습니다.",
  ],

  avoidGuide: [
    "상대의 기대만으로 책임을 떠맡지 않습니다.",
    "감정이 높아진 상태에서 결론 내리지 않습니다.",
    "구두 약속만 믿고 중요한 일을 진행하지 않습니다.",
    "모든 관계를 동시에 유지하려 하지 않습니다.",
  ],

  coachMessage: {
    title: "관계의 수보다 기준이 중요합니다.",
    message:
      "지금은 더 많은 사람을 만나는 것보다 어떤 관계를 유지할지 결정하는 기준을 세우는 것이 중요합니다.",
  },

  checklist: [
    "중요한 관계의 역할이 명확한가?",
    "구두 약속을 문서로 남겼는가?",
    "감정과 사실을 구분해 판단했는가?",
    "책임 범위를 서로 확인했는가?",
    "현재 관계가 내 방향과 맞는가?",
  ],

  recommendations: [],
});

console.log(
  "V2 headline 검증:",
  resultV2.heroSummary.headline.length > 0,
);

let rejectedInvalidV2 = false;

try {
  parsePaidAnalysisDetailOutputV2({
    heroSummary: {
      headline: "테스트 제목",
      subheadline: "테스트 부제목",
      keyMessage: "테스트 핵심 메시지",
    },
     
    decisionAnchor: {
  direction: "조정",
  focus: "현재 판단 기준 정리",
  rationale:
    "현재 흐름에서는 무리한 확대보다 우선순위와 실행 조건을 먼저 조정하는 것이 필요합니다.",
},

    causeAnalysis: {
      summary: "테스트 원인 요약",
      reasons: ["원인 1", "원인 2", "원인 3"],
    },
    fortuneStructure: {
      summary: "테스트 구조 요약",
      items: [
        {
          label: "기준 1",
          value: "값 1",
          interpretation: "해석 1",
        },
        {
          label: "기준 2",
          value: "값 2",
          interpretation: "해석 2",
        },
        {
          label: "기준 3",
          value: "값 3",
          interpretation: "해석 3",
        },
      ],
    },
    currentSituation: {
      summary: "테스트 현재 상황",
      opportunities: ["기회 1", "기회 2", "기회 3"],
      cautions: ["주의 1", "주의 2", "주의 3"],
    },
    futureTimeline: [
      {
        period: "현재",
        title: "현재 흐름",
        description: "현재 설명",
      },
      {
        period: "앞으로 3개월",
        title: "단기 흐름",
        description: "단기 설명",
      },
      {
        period: "앞으로 6개월",
        title: "중기 흐름",
        description: "중기 설명",
      },
      {
        period: "앞으로 1년",
        title: "장기 흐름",
        description: "장기 설명",
      },
    ],

    // 고의로 1개만 넣어서 실패시킨다.
    actionGuide: ["행동 1"],

    avoidGuide: [
      "피할 행동 1",
      "피할 행동 2",
      "피할 행동 3",
      "피할 행동 4",
    ],
    coachMessage: {
      title: "코치 메시지 제목",
      message: "코치 메시지 본문",
    },
    checklist: [
      "점검 1",
      "점검 2",
      "점검 3",
      "점검 4",
      "점검 5",
    ],
    recommendations: [],
  });
} catch {
  rejectedInvalidV2 = true;
}

console.log(
  "V2 최소 개수 미달 거부:",
  rejectedInvalidV2,
);

const malformedJsonResponse = [
  "```json",
  "{",
  '  "heroSummary": {',
  '    "headline": "현재 가장 중요한 판단",',
  '    "subheadline": "지금 흐름을 이해해야 합니다",',
  '    "keyMessage": "관계를 우선적으로 정리해야 합니다"',
  "  },",
  '  "decisionAnchor": {',
  '    "direction": "조정",',
  '    "focus": "관계 경계",',
  '    "rationale": "현재 운의 흐름이 변화하고 있어 관계 경계를 다시 정리해야 합니다"',
  "  },",
  '  "causeAnalysis": {',
  '    "summary": "관계 흐름이 흔들리고 있습니다",',
  '    "reasons": [',
  '      "오행의 흐름이 바뀌고 있습니다",',
  '      "현재 운의 가속도가 커지고 있습니다",',
  '      "상호작용이 늘어나는 시기입니다"',
  "    ]",
  "  },",
  '  "fortuneStructure": {',
  '    "summary": "현재 구조를 이해해야 합니다",',
  '    "items": [',
  '      { "label": "원국 균형", "value": "균형이 유지되고 있습니다", "interpretation": "현재 판단을 세워야 합니다" },',
  '      { "label": "대운 작용", "value": "변화가 나타나고 있습니다", "interpretation": "긴장을 낮춰야 합니다" },',
  '      { "label": "세운 작용", "value": "점검이 필요합니다", "interpretation": "대화의 타이밍을 보아야 합니다" },',
  '      { "label": "합·충 변화", "value": "관계가 조정될 가능성이 있습니다", "interpretation": "유연하게 대응해야 합니다" }',
  "    ]",
  "  },",
  '  "currentSituation": {',
  '    "summary": "현재 상황은 잘 살펴봐야 합니다",',
  '    "opportunities": [',
  '      "관계의 흐름을 점검할 수 있습니다",',
  '      "실행 가능한 기준을 만들 수 있습니다",',
  '      "선택의 폭이 넓어질 수 있습니다"',
  "    ],",
  '    "cautions": [',
  '      "오해를 키우기 쉽습니다",',
  '      "상대의 반응을 과대해석할 수 있습니다",',
  '      "일시적 긴장을 확정으로 받아들일 수 있습니다"',
  "    ]",
  "  },",
  '  "futureTimeline": [',
  '    { "period": "현재", "title": "현재 흐름", "description": "관계를 정리할 시점입니다" },',
  '    { "period": "앞으로 3개월", "title": "단기 흐름", "description": "상호조율이 필요합니다" },',
  '    { "period": "앞으로 6개월", "title": "중기 흐름", "description": "기준이 분명해질 수 있습니다" },',
  '    { "period": "앞으로 1년", "title": "장기 흐름", "description": "흐름이 안정될 가능성이 있습니다" }',
  "  ],",
  '  "actionGuide": [',
  '    "관계의 우선순위를 다시 정리합니다",',
  '    "대화를 나누기 전에 기준을 확인합니다"',
  "  ],",
  '  "avoidGuide": [',
  '    "과도한 해석을 피합니다",',
  '    "감정적 반응을 즉시 확정하지 않습니다",',
  '    "불필요한 논쟁을 만들지 않습니다",',
  '    "한 번의 사건으로 전체 흐름을 단정하지 않습니다"',
  "  ],",
  '  "coachMessage": {',
  '    "title": "기준을 세우세요",',
  '    "message": "지금은 흐름을 이해하고 방향을 정리하는 시기입니다"',
  "  },",
  '  "checklist": [',
  '    "관계의 우선순위를 점검합니다",',
  '    "대화 기준을 정리합니다",',
  '    "현재 감정의 폭을 확인합니다",',
  '    "불필요한 오해를 줄입니다",',
  '    "다음 행동을 단순화합니다"',
  "  ],",
  '  "recommendations": [],',
  '  "aiInsight": {',
  '    "headline": "현재 가장 먼저 정리해야 할 것은 관계의 경계입니다",',
  '    "explanation": "현재 운의 흐름은 주변의 영향이 커지는 시점이라 관계의 경계와 우선순위를 다시 정리해야 합니다"',
  "  },",
  '  "pastPattern": {',
  '    "summary": "반복되는 흐름이 있음을 확인해야 합니다",',
  '    "periods": [',
  "      {",
  '        "period": "이전 여름",',
  '        "pattern": "비슷한 시기에 관계의 기준이 흐려지는 패턴이 반복되었을 수 있습니다",',
  '        "verificationQuestion": "당시에도 관계의 경계를 명확히 세우지 못해 혼선이 있었는지 확인해보세요"',
  "      }",
  "    ]",
  "  },",
  '  "currentCoreProblem": {',
  '    "title": "관계 경계가 흐려집니다",',
  '    "description": "현재 관계에서 기대와 현실 사이의 차이가 커져서 경계를 다시 정의해야 하는 상황입니다",',
  '    "whyItMatters": "이 문제를 지금 다루지 않으면 반복적인 소모가 이어질 수 있습니다"',
  "  },",
  '  "confidence": {',
  '    "level": "중간",',
  '    "strongestEvidence": [',
  '      "현재 운의 흐름이 변화하는 지점에 있습니다",',
  '      "관계의 경계가 흔들릴 가능성이 확인됩니다"',
  "    ],",
  '    "uncertaintyFactors": [',
  '      "상대의 실제 반응은 상황에 따라 달라질 수 있습니다"',
  "    ],",
  '    "limitations": "이 분석은 현재 입력된 사주 구조와 운 흐름에 기반한 판단이며, 실제 사건을 확정하지는 않습니다"',
  "  }",
  "}",
  "```",
].join("\n");

// 모델 raw 출력 복구 케이스라 JSON 추출·복구까지 담당하는 파서를 사용한다.
const repairedResult = parseGeneratedPaidAnalysisDetailV3(malformedJsonResponse);

if (repairedResult.heroSummary.headline !== "현재 가장 중요한 판단") {
  throw new Error("V3 파싱 복구가 예상과 다릅니다.");
}

console.log("V3 코드블록/오류 문자열 파싱 복구 검증 통과");