import {
  evaluateRelationshipPremiumQuality,
  type RelationshipPremiumQualityInput,
} from "../app/lib/paidAnalysisRelationshipPremiumQuality";


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

console.log(
  "paid analysis relationship premium quality regression passed",
);