export type RelationshipPremiumQualityInput = {
  pastPatternSummary: string;
  pastPatternPeriodPatterns?: readonly string[];
  pastPatternVerificationQuestion: string;
  /** V3 keeps this required; V4 exploration products have no decisionCheck source. */
  requiresVerificationQuestion?: boolean;
  currentCoreProblemTitle: string;
  currentCoreProblemDescription: string;
  currentCoreProblemWhyItMatters: string;
  futureTimelineTexts: string[];
  actionGuide: string[];
};

const genericAdviceExpressions = [
  "대화를 많이 하세요",
  "서로 이해하세요",
  "상대방을 배려하세요",
  "진심을 표현하세요",
  "솔직하게 말하세요",
  "마음을 열어보세요",
  "기다려보세요",
  "시간을 가져보세요",
];

const businessConsultingExpressions = [
  "R&R",
  "SLA",
  "KPI",
  "회의록",
  "프로젝트 관리",
  "업무 문서화",
];

const relationshipSignalExpressions = [
  "연락",
  "거리",
  "갈등",
  "감정",
  "관계",
  "약속",
  "경계",
  "친밀",
  "인연",
  "대화",
  "만남",
"공동 계획",
"서로",
];

// pastPattern 전용 사전. 다른 체크의 기준을 바꾸지 않도록 분리해서 관리한다.
const relationshipPatternCoreExpressions = [
  ...relationshipSignalExpressions,
  "서운",
  "오해",
  "소통",
  "신뢰",
  "가까워",
  "멀어",
  "물러",
  "회피",
  "다툼",
  "충돌",
];

// 단독으로는 근거가 약한 표현. 최소 2개가 모일 때만 관계 패턴으로 인정한다.
const relationshipPatternSupportingExpressions = [
  "표현",
  "반응",
  "마음",
];

const conditionalExpressions = [
  "경우",
  "가능",
  "다면",
  "때",
  "조건",
  "관찰",
  "확인",
  "신호",

  // 확정 예언이 아닌 조건·가능성 표현
  "수 있습니다",
  "수 있어",
  "수 있음",
  "가능성이",
  "가능성은",
  "여지가",
  "변수가",
  "달라질",
  "변할 수",
  "이어질 수",
  "커질 수",
  "줄어들 수",
  "조정될 수",
  "나타날 수",
  "생길 수",
];

function containsAny(
  text: string,
  expressions: string[],
): boolean {
  return expressions.some((expression) =>
    text.includes(expression),
  );
}

function findMatchedExpressions(
  texts: string[],
  expressions: string[],
): string[] {
  const joinedText = texts.join(" ");

  return expressions.filter((expression) =>
    joinedText.includes(expression),
  );
}

export function evaluateRelationshipPremiumQuality(
  input: RelationshipPremiumQualityInput,
) {
  const coreProblemTexts = [
    input.currentCoreProblemTitle,
    input.currentCoreProblemDescription,
    input.currentCoreProblemWhyItMatters,
  ];

  const allTexts = [
    input.pastPatternSummary,
    input.pastPatternVerificationQuestion,
    ...coreProblemTexts,
    ...input.futureTimelineTexts,
    ...input.actionGuide,
  ];

  const businessMatches = findMatchedExpressions(
    allTexts,
    businessConsultingExpressions,
  );

  const genericAdviceMatches = findMatchedExpressions(
    input.actionGuide,
    genericAdviceExpressions,
  );

  const pastPatternTexts = [
    input.pastPatternSummary,
    ...(input.pastPatternPeriodPatterns ?? []),
  ];

  const pastPatternCoreMatches = findMatchedExpressions(
    pastPatternTexts,
    relationshipPatternCoreExpressions,
  );

  const pastPatternSupportingMatches = findMatchedExpressions(
    pastPatternTexts,
    relationshipPatternSupportingExpressions,
  );

  const pastPatternConnected =
    input.pastPatternSummary.length >= 20 &&
    (pastPatternCoreMatches.length >= 1 ||
      pastPatternSupportingMatches.length >= 2);

  const verificationQuestionIsConcrete =
    input.pastPatternVerificationQuestion.length >= 15 &&
    containsAny(
      input.pastPatternVerificationQuestion,
      relationshipSignalExpressions,
    );
  const verificationQuestionRequired =
    input.requiresVerificationQuestion ?? true;
  const verificationQuestionPassed =
    !verificationQuestionRequired || verificationQuestionIsConcrete;

  const coreProblemIsFocused =
    input.currentCoreProblemTitle.length >= 5 &&
    input.currentCoreProblemTitle.length <= 60 &&
    input.currentCoreProblemDescription.length >= 30 &&
    input.currentCoreProblemWhyItMatters.length >= 30;

const nonDeterministicFutureExpressions = [
  "가능",
  "수 있",
  "여지",
  "경우",
  "다면",
  "때",
  "변동",
  "변화",
  "조정",
  "관찰",
  "확인",
  "따라",
  "영향",
  "유지",
  "이어",
  "반복",
  "집중",
  "명료화",
  "재정비",
];

const conditionalFutureCount =
  input.futureTimelineTexts.filter((text) =>
    containsAny(text, nonDeterministicFutureExpressions),
  ).length;

console.log("RELATIONSHIP PREMIUM FUTURE DEBUG:", {
  futureTimelineTexts: input.futureTimelineTexts,
  conditionalFutureCount,
  totalFutureCount: input.futureTimelineTexts.length,
  conditionalMatches: input.futureTimelineTexts.map((text) => ({
    text,
    matched: containsAny(text, nonDeterministicFutureExpressions),
  })),
});

const requiredConditionalFutureCount = Math.max(
  2,
  Math.ceil(input.futureTimelineTexts.length * 0.75),
);

const futureIsConditional =
  input.futureTimelineTexts.length >= 2 &&
  conditionalFutureCount >= requiredConditionalFutureCount;

  const actionGuideIsSpecific =
    input.actionGuide.length >= 2 &&
    genericAdviceMatches.length === 0 &&
    input.actionGuide.every(
      (text) =>
        text.length >= 15 &&
        containsAny(
          text,
          relationshipSignalExpressions,
        ),
    );

  const hasNoBusinessLanguage =
    businessMatches.length === 0;

    console.log("RELATIONSHIP PREMIUM CONTENT DEBUG:", {
  pastPatternSummary:
    input.pastPatternSummary,

  pastPatternVerificationQuestion:
    input.pastPatternVerificationQuestion,

  actionGuide:
    input.actionGuide,

  pastPatternConnected,

  verificationQuestionIsConcrete,

  verificationQuestionRequired,

  actionGuideIsSpecific,

  genericAdviceMatches,

  actionGuideSignalMatches:
    input.actionGuide.map((text) => ({
      text,
      hasRelationshipSignal:
        containsAny(
          text,
          relationshipSignalExpressions,
        ),
      length: text.length,
    })),
});

  return {
    ok:
      pastPatternConnected &&
      verificationQuestionPassed &&
      coreProblemIsFocused &&
      futureIsConditional &&
      actionGuideIsSpecific &&
      hasNoBusinessLanguage,

    checks: {
      pastPatternConnected,
      verificationQuestionIsConcrete,
      coreProblemIsFocused,
      futureIsConditional,
      actionGuideIsSpecific,
      hasNoBusinessLanguage,
    },

    verificationQuestionRequired,

    businessMatches,
    genericAdviceMatches,
  };
}