import type {
  PaidAnalysisDetailOutputV2,
  PaidAnalysisDetailOutputV4,
} from "./paidAnalysisDetailOutput";

export type PaidAnalysisConsistencyIssue = {
  field: string;
  message: string;
};

export type PaidAnalysisConsistencyResult = {
  ok: boolean;
  issues: PaidAnalysisConsistencyIssue[];
};

const EXPANSION_KEYWORDS = [
  "확대",
  "늘리",
  "적극",
  "추진",
  "바로 시작",
  "즉시 실행",
  "공격적",
];

const HOLD_KEYWORDS = [
  "보류",
  "미루",
  "기다리",
  "중단",
  "하지 않",
  "멈추",
  "유보",
];

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function validateDirection(
  output: PaidAnalysisDetailOutputV2,
): PaidAnalysisConsistencyIssue[] {
  const issues: PaidAnalysisConsistencyIssue[] = [];

  const actionText = output.actionGuide.join(" ");
  const coachText = `${output.coachMessage.title} ${output.coachMessage.message}`;
  const combinedText = `${actionText} ${coachText}`;

  if (
    output.decisionAnchor.direction === "보류" &&
    includesAny(combinedText, EXPANSION_KEYWORDS)
  ) {
    issues.push({
      field: "decisionAnchor.direction",
      message:
        "decisionAnchor가 보류인데 actionGuide 또는 coachMessage에 확대·즉시 실행 표현이 포함되어 있습니다.",
    });
  }

  if (
    output.decisionAnchor.direction === "확대" &&
    includesAny(combinedText, HOLD_KEYWORDS)
  ) {
    issues.push({
      field: "decisionAnchor.direction",
      message:
        "decisionAnchor가 확대인데 actionGuide 또는 coachMessage에 보류·중단 표현이 포함되어 있습니다.",
    });
  }

  return issues;
}

export function validatePaidAnalysisConsistency(
  output: PaidAnalysisDetailOutputV2,
): PaidAnalysisConsistencyResult {
  const issues = [...validateDirection(output)];

  return {
    ok: issues.length === 0,
    issues,
  };
}

// V4 drops coachMessage, so the direction check reads conclusion + action items.
function validateDirectionV4(
  output: PaidAnalysisDetailOutputV4,
): PaidAnalysisConsistencyIssue[] {
  const issues: PaidAnalysisConsistencyIssue[] = [];

  const combinedText = [
    output.conclusion.immediateAction,
    ...output.action.flatMap((item) => [
      item.action,
      item.target,
      item.condition,
      item.completionCriteria,
    ]),
  ].join(" ");

  if (
    output.conclusion.direction === "보류" &&
    includesAny(combinedText, EXPANSION_KEYWORDS)
  ) {
    issues.push({
      field: "conclusion.direction",
      message:
        "conclusion.direction이 보류인데 immediateAction 또는 action에 확대·즉시 실행 표현이 포함되어 있습니다.",
    });
  }

  if (
    output.conclusion.direction === "확대" &&
    includesAny(combinedText, HOLD_KEYWORDS)
  ) {
    issues.push({
      field: "conclusion.direction",
      message:
        "conclusion.direction이 확대인데 immediateAction 또는 action에 보류·중단 표현이 포함되어 있습니다.",
    });
  }

  return issues;
}

export function validatePaidAnalysisConsistencyV4(
  output: PaidAnalysisDetailOutputV4,
): PaidAnalysisConsistencyResult {
  const issues = [...validateDirectionV4(output)];

  return {
    ok: issues.length === 0,
    issues,
  };
}