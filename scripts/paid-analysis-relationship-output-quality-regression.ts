import type { PaidAnalysisDetailOutputV2 } from "../app/lib/paidAnalysisDetailOutput";

const completedRelationshipChecklistExpressions = [
  "확인했다",
  "연락했다",
  "대화했다",
  "질문했다",
  "정리했다",
  "합의했다",
  "약속했다",
  "차단했다",
  "재회했다",
  "이별했다",
  "결혼했다",
  "완료했다",
  "연락 중이다",
  "대화 중이다",
];

function findCompletedRelationshipChecklistExpressions(
  output: PaidAnalysisDetailOutputV2,
): string[] {
  return output.checklist.filter((item) =>
    completedRelationshipChecklistExpressions.some((expression) =>
      item.includes(expression),
    ),
  );
}

const validOutput = {
  checklist: [
    "최근 연락의 빈도와 일관성을 관찰한다",
    "서로 기대하는 관계의 범위를 질문한다",
    "약속 이행 여부를 확인한다",
    "현재 감정 소모 수준을 점검한다",
  ],
} as PaidAnalysisDetailOutputV2;

const invalidOutput = {
  checklist: [
    "상대방에게 연락했다",
    "관계의 경계를 합의했다",
    "감정을 정리했다",
    "현재 대화 중이다",
  ],
} as PaidAnalysisDetailOutputV2;

const validMatches =
  findCompletedRelationshipChecklistExpressions(validOutput);

const invalidMatches =
  findCompletedRelationshipChecklistExpressions(invalidOutput);

console.log(
  "관계 체크리스트 실행형 통과:",
  validMatches.length === 0,
);

console.log(
  "관계 체크리스트 완료형 탐지:",
  invalidMatches.length === 4,
);

if (validMatches.length !== 0) {
  throw new Error(
    `정상 관계 체크리스트에서 완료형 표현이 잘못 탐지됐습니다: ${validMatches.join(" | ")}`,
  );
}

if (invalidMatches.length !== 4) {
  throw new Error(
    `문제 관계 체크리스트의 완료형 표현을 모두 탐지하지 못했습니다: ${invalidMatches.join(" | ")}`,
  );
}

const unsupportedRelationshipRealityExpressions = [
  "상대도 당신을 좋아하고 있다",
  "상대는 아직 마음이 있다",
  "상대가 재회를 원하고 있다",
  "상대가 먼저 연락할 것이다",
  "상대에게 다른 사람이 있다",
  "상대는 현재 연애 중이다",
];

function findUnsupportedRelationshipRealityExpressions(
  texts: string[],
): string[] {
  return texts.filter((text) =>
    unsupportedRelationshipRealityExpressions.some((expression) =>
      text.includes(expression),
    ),
  );
}

const groundedRelationshipRealityTexts = [
  "최근 연락 빈도와 약속 이행 여부를 직접 확인할 필요가 있습니다.",
  "상대의 감정을 추정하기보다 실제 대화의 일관성을 관찰해야 합니다.",
  "재회 여부는 관계 종료 원인과 현재의 경계 변화 가능성을 함께 확인해야 합니다.",
];

const unsupportedRelationshipRealityTexts = [
  "상대는 아직 마음이 있다.",
  "상대가 재회를 원하고 있다.",
  "상대가 먼저 연락할 것이다.",
];

const groundedRealityMatches =
  findUnsupportedRelationshipRealityExpressions(
    groundedRelationshipRealityTexts,
  );

const unsupportedRealityMatches =
  findUnsupportedRelationshipRealityExpressions(
    unsupportedRelationshipRealityTexts,
  );

console.log(
  "관계 현실 사실 조건형 통과:",
  groundedRealityMatches.length === 0,
);

console.log(
  "관계 미입력 현실 사실 단정 탐지:",
  unsupportedRealityMatches.length === 3,
);

if (groundedRealityMatches.length !== 0) {
  throw new Error(
    `조건형 관계 문장이 현실 사실 단정으로 잘못 탐지됐습니다: ${groundedRealityMatches.join(" | ")}`,
  );
}

if (unsupportedRealityMatches.length !== 3) {
  throw new Error(
    `미입력 관계 현실 사실 단정을 모두 탐지하지 못했습니다: ${unsupportedRealityMatches.join(" | ")}`,
  );
}

const deterministicRelationshipPredictionExpressions = [
  "반드시 재회한다",
  "재회하게 된다",
  "결혼하게 된다",
  "반드시 결혼한다",
  "헤어지게 된다",
  "반드시 이별한다",
  "연락이 온다",
  "반드시 연락이 온다",
];

function findDeterministicRelationshipPredictions(
  texts: string[],
): string[] {
  return texts.filter((text) =>
    deterministicRelationshipPredictionExpressions.some((expression) =>
      text.includes(expression),
    ),
  );
}

const conditionalRelationshipPredictionTexts = [
  "재회 가능성은 관계 종료 원인과 현재의 변화 여부를 함께 확인해야 합니다.",
  "결혼 가능성은 관계 안정성과 책임 분담 조건을 중심으로 판단해야 합니다.",
  "연락 여부를 예측하기보다 실제 연락 패턴과 대화의 일관성을 확인해야 합니다.",
];

const deterministicRelationshipPredictionTexts = [
  "두 사람은 반드시 재회한다.",
  "올해 안에 결혼하게 된다.",
  "조만간 상대에게 연락이 온다.",
  "결국 두 사람은 헤어지게 된다.",
];

const conditionalPredictionMatches =
  findDeterministicRelationshipPredictions(
    conditionalRelationshipPredictionTexts,
  );

const deterministicPredictionMatches =
  findDeterministicRelationshipPredictions(
    deterministicRelationshipPredictionTexts,
  );

console.log(
  "관계 조건형 전망 통과:",
  conditionalPredictionMatches.length === 0,
);

console.log(
  "관계 확정 예언 탐지:",
  deterministicPredictionMatches.length === 4,
);

if (conditionalPredictionMatches.length !== 0) {
  throw new Error(
    `조건형 관계 전망이 확정 예언으로 잘못 탐지됐습니다: ${conditionalPredictionMatches.join(" | ")}`,
  );
}

if (deterministicPredictionMatches.length !== 4) {
  throw new Error(
    `관계 확정 예언을 모두 탐지하지 못했습니다: ${deterministicPredictionMatches.join(" | ")}`,
  );
}

const genericRelationshipAdviceExpressions = [
  "대화를 많이 하세요",
  "서로 이해하세요",
  "상대방을 배려하세요",
  "진심을 표현하세요",
  "솔직하게 말하세요",
  "마음을 열어보세요",
  "기다려보세요",
  "시간을 가져보세요",
];

function findGenericRelationshipAdvice(
  texts: string[],
): string[] {
  return texts.filter((text) =>
    genericRelationshipAdviceExpressions.some((expression) =>
      text.includes(expression),
    ),
  );
}

const groundedRelationshipActionTexts = [
  "연락 간격이 불규칙하다면 최근 4주의 연락 빈도와 응답 일관성을 기록해 관계 기대 수준을 비교합니다.",
  "약속 변경이 반복된다면 변경 사유보다 사전 고지 여부와 이후 보완 행동을 판단 기준으로 삼습니다.",
  "감정 소모가 크다면 대화 전 해결할 문제를 하나로 제한하고, 경계가 지켜지는지 확인합니다.",
];

const genericRelationshipActionTexts = [
  "대화를 많이 하세요.",
  "서로 이해하세요.",
  "상대방을 배려하세요.",
];

const groundedActionMatches =
  findGenericRelationshipAdvice(
    groundedRelationshipActionTexts,
  );

const genericActionMatches =
  findGenericRelationshipAdvice(
    genericRelationshipActionTexts,
  );

console.log(
  "관계 구체적 행동 조언 통과:",
  groundedActionMatches.length === 0,
);

console.log(
  "관계 일반론 조언 탐지:",
  genericActionMatches.length === 3,
);

if (groundedActionMatches.length !== 0) {
  throw new Error(
    `구체적인 관계 행동 조언이 일반론으로 잘못 탐지됐습니다: ${groundedActionMatches.join(" | ")}`,
  );
}

if (genericActionMatches.length !== 3) {
  throw new Error(
    `일반적인 관계 조언을 모두 탐지하지 못했습니다: ${genericActionMatches.join(" | ")}`,
  );
}

console.log(
  "paid analysis relationship output quality regression passed",
);