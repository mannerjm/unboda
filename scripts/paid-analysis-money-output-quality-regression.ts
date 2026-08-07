import type { PaidAnalysisDetailOutputV2 } from "../app/lib/paidAnalysisDetailOutput";

const completedChecklistExpressions = [
  "확인했다",
  "작성했다",
  "개설했다",
  "분리했다",
  "설정했다",
  "정리했다",
  "기록했다",
  "완료했다",
  "적립 중이다",
  "운용 중이다",
];

function findCompletedChecklistExpressions(
  output: PaidAnalysisDetailOutputV2,
): string[] {
  return output.checklist.filter((item) =>
    completedChecklistExpressions.some((expression) =>
      item.includes(expression),
    ),
  );
}

const validOutput = {
  checklist: [
    "현재 지출을 고정비·변동비·비정기 지출로 구분해 정리한다",
    "계약 조건의 수수료·해지·지연 조항을 비교한다",
    "투자 자금과 생활 자금을 분리할 필요가 있는지 확인한다",
  ],
} as PaidAnalysisDetailOutputV2;

const invalidOutput = {
  checklist: [
    "비상자금 전용 계좌를 개설했다",
    "계약서의 해지 조건을 확인했다",
    "투자 기준을 작성했다",
  ],
} as PaidAnalysisDetailOutputV2;

const validMatches = findCompletedChecklistExpressions(validOutput);
const invalidMatches = findCompletedChecklistExpressions(invalidOutput);

console.log(
  "재물 체크리스트 실행형 통과:",
  validMatches.length === 0,
);

console.log(
  "재물 체크리스트 완료형 탐지:",
  invalidMatches.length === 3,
);

if (validMatches.length !== 0) {
  throw new Error(
    `정상 체크리스트에서 완료형 표현이 잘못 탐지됐습니다: ${validMatches.join(" | ")}`,
  );
}

if (invalidMatches.length !== 3) {
  throw new Error(
    `문제 체크리스트의 완료형 표현을 모두 탐지하지 못했습니다: ${invalidMatches.join(" | ")}`,
  );
}

console.log(
  "paid analysis money output quality regression passed",
);