import type { PaidAnalysisDetailOutputV2 } from "../app/lib/paidAnalysisDetailOutput";

const completedCareerChecklistExpressions = [
  "확인했다",
  "작성했다",
  "지원했다",
  "제출했다",
  "협상했다",
  "면접했다",
  "계약했다",
  "창업했다",
  "퇴사했다",
  "이직했다",
  "완료했다",
  "진행 중이다",
  "준비 중이다",
];

function findCompletedCareerChecklistExpressions(
  output: PaidAnalysisDetailOutputV2,
): string[] {
  return output.checklist.filter((item) =>
    completedCareerChecklistExpressions.some((expression) =>
      item.includes(expression),
    ),
  );
}

const validOutput = {
  checklist: [
    "현재 역할과 희망 역할의 차이를 정리한다",
    "이직 조건과 유지 조건을 비교한다",
    "협상 전 책임 범위와 보상 기준을 확인한다",
    "사업 확장 전 준비도를 점검한다",
  ],
} as PaidAnalysisDetailOutputV2;

const invalidOutput = {
  checklist: [
    "이력서를 작성했다",
    "세 곳에 지원했다",
    "연봉 협상을 완료했다",
    "창업을 준비 중이다",
  ],
} as PaidAnalysisDetailOutputV2;

const validMatches =
  findCompletedCareerChecklistExpressions(validOutput);

const invalidMatches =
  findCompletedCareerChecklistExpressions(invalidOutput);

console.log(
  "직업 체크리스트 실행형 통과:",
  validMatches.length === 0,
);

console.log(
  "직업 체크리스트 완료형 탐지:",
  invalidMatches.length === 4,
);

if (validMatches.length !== 0) {
  throw new Error(
    `정상 직업 체크리스트에서 완료형 표현이 잘못 탐지됐습니다: ${validMatches.join(" | ")}`,
  );
}

if (invalidMatches.length !== 4) {
  throw new Error(
    `문제 직업 체크리스트의 완료형 표현을 모두 탐지하지 못했습니다: ${invalidMatches.join(" | ")}`,
  );
}

const unsupportedCareerRealityExpressions = [
  "현재 이직을 준비 중",
  "현재 퇴사를 준비 중",
  "현재 창업을 준비 중",
  "현재 사업을 운영 중",
  "현재 면접을 진행 중",
  "현재 연봉 협상 중",
  "현재 조직 갈등을 겪고",
  "현재 직장 내 갈등을 겪고",
  "현재 협업 계약이",
];

function findUnsupportedCareerRealityExpressions(
  texts: string[],
): string[] {
  return texts.filter((text) =>
    unsupportedCareerRealityExpressions.some((expression) =>
      text.includes(expression),
    ),
  );
}

const groundedCareerRealityTexts = [
  "이직을 고려한다면 현재 역할과 희망 역할의 차이를 먼저 확인합니다.",
  "사업 확장을 검토할 경우 수익 구조와 책임 범위를 함께 점검합니다.",
  "조직 갈등이 실제로 있다면 역할과 의사결정 권한을 확인합니다.",
];

const unsupportedCareerRealityTexts = [
  "현재 이직을 준비 중이므로 이동 시기를 정해야 합니다.",
  "현재 사업을 운영 중이므로 확장 여부를 판단해야 합니다.",
  "현재 조직 갈등을 겪고 있어 역할 변경이 필요합니다.",
];

const groundedRealityMatches =
  findUnsupportedCareerRealityExpressions(groundedCareerRealityTexts);

const unsupportedRealityMatches =
  findUnsupportedCareerRealityExpressions(unsupportedCareerRealityTexts);

console.log(
  "직업 현실 사실 조건형 통과:",
  groundedRealityMatches.length === 0,
);

console.log(
  "직업 미입력 현실 사실 단정 탐지:",
  unsupportedRealityMatches.length === 3,
);

if (groundedRealityMatches.length !== 0) {
  throw new Error(
    `조건형 직업 문장이 현실 사실 단정으로 잘못 탐지됐습니다: ${groundedRealityMatches.join(" | ")}`,
  );
}

if (unsupportedRealityMatches.length !== 3) {
  throw new Error(
    `입력되지 않은 직업 현실 사실 단정을 모두 탐지하지 못했습니다: ${unsupportedRealityMatches.join(" | ")}`,
  );
}

const deterministicCareerRecommendationExpressions = [
  "직업이 가장 적합합니다",
  "직업이 천직입니다",
  "직업을 선택해야 합니다",
  "직업으로 반드시 가야 합니다",
  "회사에 입사해야 합니다",
  "회사로 이직해야 합니다",
  "창업해야 합니다",
  "퇴사해야 합니다",
  "사업을 시작해야 합니다",
];

function findDeterministicCareerRecommendations(
  texts: string[],
): string[] {
  return texts.filter((text) =>
    deterministicCareerRecommendationExpressions.some((expression) =>
      text.includes(expression),
    ),
  );
}

const groundedCareerRecommendationTexts = [
  "독립적인 판단 권한이 큰 역할에서 강점을 활용할 가능성을 검토합니다.",
  "성과 기준이 명확한 업무 환경이 맞는지 실제 경험과 함께 확인합니다.",
  "창업을 고려한다면 수익 구조와 책임 범위를 먼저 점검합니다.",
];

const deterministicCareerRecommendationTexts = [
  "개발자 직업이 가장 적합합니다.",
  "A회사로 이직해야 합니다.",
  "지금 창업해야 합니다.",
];

const groundedRecommendationMatches =
  findDeterministicCareerRecommendations(
    groundedCareerRecommendationTexts,
  );

const deterministicRecommendationMatches =
  findDeterministicCareerRecommendations(
    deterministicCareerRecommendationTexts,
  );

console.log(
  "직업 역할·환경 중심 표현 통과:",
  groundedRecommendationMatches.length === 0,
);

console.log(
  "직업 단정 추천 탐지:",
  deterministicRecommendationMatches.length === 3,
);

if (groundedRecommendationMatches.length !== 0) {
  throw new Error(
    `정상적인 역할·환경 중심 표현이 단정 추천으로 잘못 탐지됐습니다: ${groundedRecommendationMatches.join(" | ")}`,
  );
}

if (deterministicRecommendationMatches.length !== 3) {
  throw new Error(
    `직업·회사·창업 단정 추천을 모두 탐지하지 못했습니다: ${deterministicRecommendationMatches.join(" | ")}`,
  );
}

console.log(
  "paid analysis career output quality regression passed",
);