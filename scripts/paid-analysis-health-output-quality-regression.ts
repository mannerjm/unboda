import type { PaidAnalysisDetailOutputV2 } from "../app/lib/paidAnalysisDetailOutput";

const completedHealthChecklistExpressions = [
  "확인했다",
  "검사했다",
  "진료받았다",
  "운동했다",
  "시작했다",
  "기록했다",
  "조정했다",
  "변경했다",
  "개선됐다",
  "회복됐다",
  "완료했다",
  "운동 중이다",
  "치료 중이다",
];

function findCompletedHealthChecklistExpressions(
  output: PaidAnalysisDetailOutputV2,
): string[] {
  return output.checklist.filter((item) =>
    completedHealthChecklistExpressions.some((expression) =>
      item.includes(expression),
    ),
  );
}

const validOutput = {
  checklist: [
    "최근 2주의 수면 시간을 기록한다",
    "오후 피로도와 회복 시간을 비교한다",
    "식사 간격과 집중력 변화를 관찰한다",
    "일정 사이의 휴식 간격을 조정한다",
  ],
} as PaidAnalysisDetailOutputV2;

const invalidOutput = {
  checklist: [
    "수면 시간을 기록했다",
    "병원 검사를 완료했다",
    "운동을 시작했다",
    "피로가 개선됐다",
  ],
} as PaidAnalysisDetailOutputV2;

const validMatches =
  findCompletedHealthChecklistExpressions(validOutput);

const invalidMatches =
  findCompletedHealthChecklistExpressions(invalidOutput);

console.log(
  "건강 체크리스트 실행형 통과:",
  validMatches.length === 0,
);

console.log(
  "건강 체크리스트 완료형 탐지:",
  invalidMatches.length === 4,
);

if (validMatches.length !== 0) {
  throw new Error(
    `정상 건강 체크리스트에서 완료형 표현이 잘못 탐지됐습니다: ${validMatches.join(" | ")}`,
  );
}

if (invalidMatches.length !== 4) {
  throw new Error(
    `문제 건강 체크리스트의 완료형 표현을 모두 탐지하지 못했습니다: ${invalidMatches.join(" | ")}`,
  );
}

const unsupportedHealthRealityExpressions = [
  "현재 불면증이 있다",
  "현재 만성피로 상태다",
  "호르몬 문제가 있다",
  "소화기 질환이 있다",
  "면역력이 크게 떨어져 있다",
  "간 기능이 약해져 있다",
  "신경계 이상이 있다",
  "현재 치료가 필요하다",
];

function findUnsupportedHealthRealityExpressions(
  texts: string[],
): string[] {
  return texts.filter((text) =>
    unsupportedHealthRealityExpressions.some((expression) =>
      text.includes(expression),
    ),
  );
}

const groundedHealthRealityTexts = [
  "최근 수면 시간이 줄었다면 피로도와 회복 속도를 함께 기록합니다.",
  "식사 간격이 불규칙하다면 오후 집중력 변화를 관찰합니다.",
  "불편감이 지속되거나 심해질 경우 의료기관의 평가가 필요할 수 있습니다.",
];

const unsupportedHealthRealityTexts = [
  "현재 불면증이 있다.",
  "현재 만성피로 상태다.",
  "호르몬 문제가 있다.",
];

const groundedRealityMatches =
  findUnsupportedHealthRealityExpressions(
    groundedHealthRealityTexts,
  );

const unsupportedRealityMatches =
  findUnsupportedHealthRealityExpressions(
    unsupportedHealthRealityTexts,
  );

console.log(
  "건강 현실 사실 조건형 통과:",
  groundedRealityMatches.length === 0,
);

console.log(
  "건강 미입력 상태 단정 탐지:",
  unsupportedRealityMatches.length === 3,
);

if (groundedRealityMatches.length !== 0) {
  throw new Error(
    `조건형 건강 문장이 현실 사실 단정으로 잘못 탐지됐습니다: ${groundedRealityMatches.join(" | ")}`,
  );
}

if (unsupportedRealityMatches.length !== 3) {
  throw new Error(
    `입력되지 않은 건강 상태 단정을 모두 탐지하지 못했습니다: ${unsupportedRealityMatches.join(" | ")}`,
  );
}

const deterministicMedicalExpressions = [
  "질병이 확실하다",
  "질환이 있다",
  "진단된다",
  "치료가 필요하다",
  "약을 복용해야 한다",
  "병원 치료를 받아야 한다",
  "완치될 것이다",
  "회복이 확실하다",
];

function findDeterministicMedicalExpressions(
  texts: string[],
): string[] {
  return texts.filter((text) =>
    deterministicMedicalExpressions.some((expression) =>
      text.includes(expression),
    ),
  );
}

const safeMedicalTexts = [
  "생활 리듬의 변화가 피로감과 함께 나타나는지 관찰합니다.",
  "불편감이 지속된다면 의료 전문가의 평가를 고려할 수 있습니다.",
  "사주 해석만으로 질병 여부를 판단할 수 없습니다.",
];

const deterministicMedicalTexts = [
  "현재 질병이 확실하다.",
  "이 증상으로 진단된다.",
  "반드시 약을 복용해야 한다.",
  "곧 완치될 것이다.",
];

const safeMedicalMatches =
  findDeterministicMedicalExpressions(safeMedicalTexts);

const deterministicMedicalMatches =
  findDeterministicMedicalExpressions(
    deterministicMedicalTexts,
  );

console.log(
  "건강 안전 의료 표현 통과:",
  safeMedicalMatches.length === 0,
);

console.log(
  "건강 확정 진단·치료 표현 탐지:",
  deterministicMedicalMatches.length === 4,
);

if (safeMedicalMatches.length !== 0) {
  throw new Error(
    `안전한 건강 표현이 확정 의료 표현으로 잘못 탐지됐습니다: ${safeMedicalMatches.join(" | ")}`,
  );
}

if (deterministicMedicalMatches.length !== 4) {
  throw new Error(
    `확정적인 진단·치료 표현을 모두 탐지하지 못했습니다: ${deterministicMedicalMatches.join(" | ")}`,
  );
}

const groundedHealthActionExpressions = [
  "기록",
  "비교",
  "조정",
  "확보",
  "관찰",
  "줄인다",
  "늘린다",
  "정한다",
];

const genericHealthActionExpressions = [
  "건강을 잘 챙긴다",
  "몸 관리를 잘한다",
  "건강에 신경 쓴다",
];

function findGenericHealthActionAdvice(
  texts: string[],
): string[] {
  return texts.filter(
    (text) =>
      genericHealthActionExpressions.some((expression) =>
        text.includes(expression),
      ) &&
      !groundedHealthActionExpressions.some((expression) =>
        text.includes(expression),
      ),
  );
}

const groundedHealthActionTexts = [
  "7일 동안 취침 시간과 기상 시간을 기록해 수면 리듬의 변화를 비교합니다.",
  "오후 피로가 커지는 시간대를 기록하고 일정 사이의 휴식 간격을 조정합니다.",
  "식사 후 컨디션 변화를 관찰해 반복되는 생활 패턴이 있는지 확인합니다.",
];

const genericHealthActionTexts = [
  "평소 건강을 잘 챙긴다.",
  "꾸준히 몸 관리를 잘한다.",
  "앞으로 건강에 신경 쓴다.",
];

const groundedHealthActionMatches =
  findGenericHealthActionAdvice(
    groundedHealthActionTexts,
  );

const genericHealthActionMatches =
  findGenericHealthActionAdvice(
    genericHealthActionTexts,
  );

console.log(
  "건강 구체적 행동 조언 통과:",
  groundedHealthActionMatches.length === 0,
);

console.log(
  "건강 일반론 조언 탐지:",
  genericHealthActionMatches.length === 3,
);

if (groundedHealthActionMatches.length !== 0) {
  throw new Error(
    `구체적인 건강 행동 조언이 일반론으로 잘못 탐지됐습니다: ${groundedHealthActionMatches.join(" | ")}`,
  );
}

if (genericHealthActionMatches.length !== 3) {
  throw new Error(
    `건강 일반론 조언을 모두 탐지하지 못했습니다: ${genericHealthActionMatches.join(" | ")}`,
  );
}

console.log(
  "paid analysis health output quality regression passed",
);