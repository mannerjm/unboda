import {
  evaluateRelationshipPremiumQuality,
  type RelationshipPremiumQualityInput,
} from "../app/lib/paidAnalysisRelationshipPremiumQuality";
import { compressCareerDetailStructure } from "../app/lib/paidAnalysisDetailService";
import type { PaidAnalysisDetailOutputV3 } from "../app/lib/paidAnalysisDetailOutput";

function buildRelationshipDetailFixture(
  actionGuide: string[],
): PaidAnalysisDetailOutputV3 {
  return {
    heroSummary: {
      headline: "관계의 속도보다 기준을 먼저 확인할 시기입니다.",
      subheadline: "친밀감보다 일관성을 확인하세요.",
      keyMessage: "관계의 경계와 기대 수준을 먼저 확인합니다.",
    },
    decisionAnchor: {
      direction: "조정",
      focus: "연락과 약속의 일관성",
      rationale: "현재 흐름에서는 관계의 속도보다 일관성 확인이 우선입니다.",
    },
    causeAnalysis: {
      summary: "관계 기대 수준의 차이가 반복되는 구조입니다.",
      reasons: ["원국 구조", "현재 대운", "현재 세운"],
    },
    fortuneStructure: {
      summary: "관계 흐름의 기준입니다.",
      items: [
        { label: "관계 속도", value: "빠름", interpretation: "친밀감이 먼저 커집니다." },
        { label: "경계 유지", value: "약함", interpretation: "기준이 흐려지기 쉽습니다." },
        { label: "회복 방식", value: "지연", interpretation: "대화 재개가 늦어집니다." },
      ],
    },
    currentSituation: {
      summary: "현재 관계 상황입니다.",
      opportunities: ["연락 일관성 확인", "약속 기준 정리", "경계 확인"],
      cautions: ["감정 해석", "거리 확대", "대화 지연"],
    },
    futureTimeline: [
      { period: "3개월", title: "일관성 확인", description: "연락의 일관성을 확인할 수 있습니다." },
      { period: "6개월", title: "회복 속도", description: "갈등 후 회복 속도가 달라질 수 있습니다." },
      { period: "1년", title: "거리 조정", description: "관계 거리감이 조정될 수 있습니다." },
      { period: "2년", title: "흐름 유지", description: "관계 흐름이 이어질 수 있습니다." },
    ],
    actionGuide,
    avoidGuide: [
      "상대의 의도를 혼자 추측하는 방식은 피합니다.",
      "갈등 직후 결론을 확정하는 방식은 피합니다.",
      "연락을 일방적으로 끊는 방식은 피합니다.",
      "감정을 쌓아두었다가 한 번에 표현하는 방식은 피합니다.",
    ],
    coachMessage: {
      title: "지금의 기준",
      message: "속도보다 일관성을 확인하세요.",
    },
    checklist: [
      "연락 빈도의 변화를 기록한다.",
      "약속 변경 방식을 확인한다.",
      "갈등 후 대화 재개 시점을 확인한다.",
      "경계 기준을 정리한다.",
      "감정 소모 정도를 점검한다.",
    ],
    recommendations: [],
    aiInsight: {
      headline: "속도가 아니라 일관성이 현재의 판단 기준입니다.",
      explanation:
        "원국의 관계 구조와 현재 운의 작용이 겹치면서 친밀감의 속도가 먼저 커질 수 있습니다.",
    },
    pastPattern: {
      summary:
        "가까워질수록 표현을 줄이고 혼자 의미를 해석하다가 먼저 물러서는 방식이 반복되기 쉽습니다.",
      periods: [
        {
          period: "이전 대운",
          pattern:
            "그 시기에는 연락 빈도가 달라질 때 갈등이 커졌을 가능성이 있습니다.",
          verificationQuestion:
            "연락 빈도가 달라졌을 때 직접 확인한 적이 있었는지 돌아보세요.",
        },
      ],
    },
    currentCoreProblem: {
      title: "관계 기준 확인이 늦어지는 문제",
      description:
        "현재는 친밀감이 먼저 커지면서 관계의 기대 수준을 확인하는 시점이 늦어지기 쉬운 상태입니다.",
      whyItMatters:
        "기준 확인이 늦어질수록 오해가 쌓이고 감정 소모가 반복될 수 있습니다.",
    },
    confidence: {
      level: "중간",
      strongestEvidence: [
        "원국의 관계 구조에서 확인되는 근거",
        "현재 대운에서 확인되는 근거",
      ],
      uncertaintyFactors: ["상대방의 실제 상황은 확인할 수 없습니다."],
      limitations:
        "이 분석은 입력된 계산 결과만을 근거로 하며 상대의 감정이나 미래 행동을 확정하지 않습니다.",
    },
  };
}


const premiumRelationshipOutput: RelationshipPremiumQualityInput =
  {
    pastPatternSummary:
      "관계가 빠르게 가까워진 뒤 기대 수준과 연락 빈도의 차이가 커지면 감정 소모와 거리 조절 문제가 반복되기 쉬운 흐름입니다.",

    pastPatternVerificationQuestion:
      "과거에도 관계가 가까워진 뒤 연락 빈도나 약속 기준의 차이 때문에 거리감이 커진 경험이 있었는지 확인해보세요.",

    currentCoreProblemTitle:
      "친밀감의 속도보다 관계 기준을 먼저 확인할 때",

    currentCoreProblemDescription:
      "현재 핵심 문제는 호감의 크기보다 관계의 속도와 기대 수준을 서로 확인하기 전에 친밀감이 먼저 커질 수 있다는 점입니다. 연락과 약속에서 실제 행동의 일관성을 확인하는 것이 중요합니다.",

    currentCoreProblemWhyItMatters:
      "이 기준을 확인하지 않으면 상대의 의도를 추측하는 시간이 길어지고 감정 소모가 반복될 수 있습니다. 반대로 관계의 경계와 기대 수준을 먼저 확인하면 관계를 이어갈지 거리를 둘지 판단하기 쉬워집니다.",

    futureTimelineTexts: [
      "앞으로 관계 접점이 늘어나는 경우에는 호감 자체보다 연락과 약속의 일관성이 유지되는지를 관찰하는 것이 중요합니다.",
      "새로운 인연 가능성이 커지는 때에도 빠른 친밀감만으로 판단하지 말고 관계의 경계와 실제 행동 신호를 확인해야 합니다.",
    ],

    actionGuide: [
      "연락 빈도가 갑자기 달라지면 상대의 의도를 추측하기보다 최근 행동의 일관성을 먼저 확인합니다.",
      "관계가 빠르게 가까워질 때는 약속과 경계에 대한 기대 수준을 대화로 확인한 뒤 다음 단계를 판단합니다.",
    ],
  };

const weakRelationshipOutput: RelationshipPremiumQualityInput =
  {
    pastPatternSummary:
      "과거에도 비슷한 일이 있었을 수 있습니다.",

    pastPatternVerificationQuestion:
      "과거를 생각해보세요.",

    currentCoreProblemTitle:
      "관계 개선",

    currentCoreProblemDescription:
      "현재는 여러 가지 문제가 있으므로 서로 노력해야 합니다.",

    currentCoreProblemWhyItMatters:
      "좋은 관계를 위해 중요합니다.",

    futureTimelineTexts: [
      "앞으로 관계가 좋아집니다.",
      "새로운 인연이 생깁니다.",
    ],

    actionGuide: [
      "대화를 많이 하세요.",
      "서로 이해하세요.",
    ],
  };

const premiumResult =
  evaluateRelationshipPremiumQuality(
    premiumRelationshipOutput,
  );

const weakResult =
  evaluateRelationshipPremiumQuality(
    weakRelationshipOutput,
  );

const explorationWithoutVerificationQuestion =
  evaluateRelationshipPremiumQuality({
    ...premiumRelationshipOutput,
    pastPatternVerificationQuestion: "",
    requiresVerificationQuestion: false,
  });

if (!explorationWithoutVerificationQuestion.ok) {
  throw new Error(
    "exploration 관계 리포트는 verification question이 필수가 아닐 때 다른 품질 기준을 통과해야 합니다.",
  );
}

if (explorationWithoutVerificationQuestion.checks.verificationQuestionIsConcrete) {
  throw new Error(
    "exploration 관계 리포트의 빈 verification question을 true로 위조하면 안 됩니다.",
  );
}

if (explorationWithoutVerificationQuestion.verificationQuestionRequired) {
  throw new Error(
    "exploration 관계 리포트에는 verification question requirement가 비활성화되어야 합니다.",
  );
}

const explorationWithGenericAction =
  evaluateRelationshipPremiumQuality({
    ...premiumRelationshipOutput,
    pastPatternVerificationQuestion: "",
    requiresVerificationQuestion: false,
    actionGuide: [
      "대화를 많이 하세요.",
      "관계의 경계를 대화로 확인하세요.",
    ],
  });

if (explorationWithGenericAction.ok) {
  throw new Error(
    "exploration 관계 리포트도 generic action quality failure를 통과하면 안 됩니다.",
  );
}

const decisionWithVerificationQuestion =
  evaluateRelationshipPremiumQuality({
    ...premiumRelationshipOutput,
    requiresVerificationQuestion: true,
  });

if (!decisionWithVerificationQuestion.ok) {
  throw new Error(
    "decision 관계 리포트는 concrete verification question으로 통과해야 합니다.",
  );
}

const decisionWithoutVerificationQuestion =
  evaluateRelationshipPremiumQuality({
    ...premiumRelationshipOutput,
    pastPatternVerificationQuestion: "",
    requiresVerificationQuestion: true,
  });

if (decisionWithoutVerificationQuestion.ok) {
  throw new Error(
    "decision 관계 리포트는 빈 verification question을 통과하면 안 됩니다.",
  );
}

console.log(
  "5만원급 과거 패턴 연결:",
  premiumResult.checks.pastPatternConnected,
);

console.log(
  "5만원급 과거 검증 질문:",
  premiumResult.checks.verificationQuestionIsConcrete,
);

console.log(
  "5만원급 핵심 문제 집중:",
  premiumResult.checks.coreProblemIsFocused,
);

console.log(
  "5만원급 조건부 미래 흐름:",
  premiumResult.checks.futureIsConditional,
);

console.log(
  "5만원급 행동 가이드 구체성:",
  premiumResult.checks.actionGuideIsSpecific,
);

console.log(
  "5만원급 업무 언어 차단:",
  premiumResult.checks.hasNoBusinessLanguage,
);

console.log(
  "5만원급 정상 리포트 통과:",
  premiumResult.ok,
);

console.log(
  "저품질 관계 리포트 거부:",
  weakResult.ok === false,
);

if (!premiumResult.ok) {
  throw new Error(
    `5만원급 관계 리포트가 품질 게이트를 통과하지 못했습니다: ${JSON.stringify(
      premiumResult.checks,
    )}`,
  );
}

if (weakResult.ok) {
  throw new Error(
    "일반론 수준의 관계 리포트가 5만원급 품질 게이트를 잘못 통과했습니다.",
  );
}

// --- pastPatternConnected: 관계 신호를 다른 표현으로 서술한 정상 케이스 ---
function withPastPatternSummary(
  summary: string,
  periodPatterns: readonly string[] = [
    "그 시기에는 가까워진 뒤 서로의 기대가 어긋나면서 거리가 벌어졌을 가능성이 있습니다.",
  ],
): RelationshipPremiumQualityInput {
  return {
    ...premiumRelationshipOutput,
    pastPatternSummary: summary,
    pastPatternPeriodPatterns: periodPatterns,
  };
}

const paraphrasedPastPatterns = [
  "가까워질수록 표현을 줄이고 혼자 의미를 해석하다가 먼저 물러서는 방식이 반복되기 쉽습니다.",
  "상대의 반응이 달라졌다고 느낄 때 확인하기보다 스스로 결론을 내리고 마음의 문을 닫는 흐름이 되풀이됩니다.",
  "비슷한 상황에서 서운함을 말하지 못한 채 참다가 한 번에 터뜨리는 방식이 반복될 수 있습니다.",
];

for (const summary of paraphrasedPastPatterns) {
  const result = evaluateRelationshipPremiumQuality(
    withPastPatternSummary(summary),
  );

  if (!result.checks.pastPatternConnected) {
    throw new Error(
      `관계 의미가 충분한 과거 패턴 요약이 pastPatternConnected에서 거부되었습니다: ${summary}`,
    );
  }

  if (!result.ok) {
    throw new Error(
      `관계 의미가 충분한 리포트가 품질 게이트를 통과하지 못했습니다: ${JSON.stringify(
        result.checks,
      )}`,
    );
  }
}

console.log(
  "표현이 다른 정상 과거 패턴 통과:",
  paraphrasedPastPatterns.length,
);

// --- pastPatternConnected: 관계 패턴과 무관한 서술은 계속 거부 ---
const unrelatedPastPatterns = [
  "분기별 매출 목표를 세우고 지표를 점검하는 방식이 반복되기 쉬운 구조입니다.",
  "비슷한 상황이 여러 번 있었을 수 있으므로 잘 생각해보면 좋겠습니다.",
];

for (const summary of unrelatedPastPatterns) {
  const result = evaluateRelationshipPremiumQuality(
    withPastPatternSummary(summary, [
      "그 시기에도 비슷한 판단이 있었을 수 있습니다.",
    ]),
  );

  if (result.checks.pastPatternConnected) {
    throw new Error(
      `관계 패턴과 무관한 요약이 pastPatternConnected를 잘못 통과했습니다: ${summary}`,
    );
  }
}

console.log(
  "관계 패턴과 무관한 과거 패턴 거부:",
  unrelatedPastPatterns.length,
);

// --- 지나치게 일반적인 보조 표현 하나만으로는 통과하지 않아야 함 ---
const singleSupportingSignalOnly = evaluateRelationshipPremiumQuality(
  withPastPatternSummary(
    "당시에도 스스로 표현하기보다 상황이 정리되기를 기다리는 선택이 반복되었을 수 있습니다.",
    ["그 시기에도 같은 선택이 되풀이되었을 가능성이 있습니다."],
  ),
);

if (singleSupportingSignalOnly.checks.pastPatternConnected) {
  throw new Error(
    "보조 표현 하나만 포함된 과거 패턴 요약이 pastPatternConnected를 잘못 통과했습니다.",
  );
}

console.log("보조 표현 단독 통과 차단: true");

// --- periods[].pattern도 과거 패턴 근거로 사용되어야 함 ---
const evidenceFromPeriodsOnly = evaluateRelationshipPremiumQuality(
  withPastPatternSummary(
    "당시에도 비슷한 선택이 되풀이되었을 가능성이 있는 흐름으로 보입니다.",
    [
      "그 시기에는 연락 빈도가 달라질 때 갈등이 커졌을 가능성이 있습니다.",
    ],
  ),
);

if (!evidenceFromPeriodsOnly.checks.pastPatternConnected) {
  throw new Error(
    "periods[].pattern의 관계 신호가 pastPatternConnected 근거로 반영되지 않았습니다.",
  );
}

console.log("periods[].pattern 근거 반영: true");

// --- actionGuide 2개만 반환돼도 커리어 fallback이 관계 리포트를 깨뜨리지 않아야 함 ---
const twoItemActionGuide = [
  "연락 빈도가 갑자기 달라지면 상대의 의도를 추측하기보다 최근 행동의 일관성을 먼저 확인합니다.",
  "관계가 빠르게 가까워질 때는 약속과 경계에 대한 기대 수준을 대화로 확인한 뒤 다음 단계를 판단합니다.",
];

const relationshipDetail = buildRelationshipDetailFixture(twoItemActionGuide);

const compressedForRelationship = compressCareerDetailStructure(
  relationshipDetail,
  "RELATIONSHIP",
);

if (compressedForRelationship.actionGuide.length !== 3) {
  throw new Error(
    `compressCareerDetailStructure가 actionGuide를 3개로 채우지 않았습니다: ${compressedForRelationship.actionGuide.length}`,
  );
}

const compressedRelationshipResult = evaluateRelationshipPremiumQuality({
  ...premiumRelationshipOutput,
  pastPatternPeriodPatterns: [
    "그 시기에는 연락 빈도가 달라질 때 갈등이 커졌을 가능성이 있습니다.",
  ],
  actionGuide: compressedForRelationship.actionGuide,
});

if (!compressedRelationshipResult.checks.actionGuideIsSpecific) {
  throw new Error(
    `관계 상품 fallback actionGuide가 actionGuideIsSpecific을 실패시켰습니다: ${JSON.stringify(
      compressedForRelationship.actionGuide,
    )}`,
  );
}

if (!compressedRelationshipResult.ok) {
  throw new Error(
    `fallback이 적용된 관계 리포트가 품질 게이트를 통과하지 못했습니다: ${JSON.stringify(
      compressedRelationshipResult.checks,
    )}`,
  );
}

console.log("관계 상품 actionGuide fallback 안전성: true");

// 다른 플러그인은 기존 커리어 fallback 동작을 그대로 유지해야 한다.
const compressedForCareer = compressCareerDetailStructure(
  buildRelationshipDetailFixture(twoItemActionGuide),
  "CAREER",
);

if (
  compressedForCareer.actionGuide[2] !==
  "결정 이후 부담과 이익을 함께 비교해본다."
) {
  throw new Error(
    `CAREER fallback 동작이 변경되었습니다: ${compressedForCareer.actionGuide[2]}`,
  );
}

console.log("CAREER fallback 기존 동작 유지: true");

console.log(
  "paid analysis relationship premium quality regression passed",
);