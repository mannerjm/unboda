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

/**
 * Words that mark the clause as preparing a decision rather than executing one.
 * "비교 대상을 확대한다" is compatible with 보류; "사업을 확대한다" is not.
 */
const DELIBERATION_MARKERS = [
  "판단",
  "검토",
  "비교",
  "기준",
  "범위",
  "선택지",
  "후보",
  "관찰",
  "확인",
  "점검",
  "기록",
  "질문",
  "정리",
  "정보",
];

/**
 * Clause boundaries. Sequential connectives matter: "비교한 뒤 이직을 추진한다"
 * finishes the deliberation clause before the executed action starts.
 */
const CLAUSE_SEPARATOR =
  /[.!?\n·,]|한 뒤|한 후에|한 후|한 다음에|한 다음|뒤에|후에|다음에|하고|하며|하되/;

/** The sentence-ish span around a keyword, used to read its context. */
function extractClause(text: string, index: number): string {
  const before = text.slice(0, index);
  const after = text.slice(index);

  const beforeParts = before.split(CLAUSE_SEPARATOR);
  const afterParts = after.split(CLAUSE_SEPARATOR);

  return `${beforeParts[beforeParts.length - 1] ?? ""}${afterParts[0] ?? ""}`;
}

/** Returns the keyword that actually reverses the stated direction, if any. */
function findDirectionConflict(
  segments: string[],
  keywords: string[],
): string | null {
  for (const segment of segments) {
    for (const keyword of keywords) {
      let index = segment.indexOf(keyword);

      while (index !== -1) {
        const clause = extractClause(segment, index);

        if (!includesAny(clause, DELIBERATION_MARKERS)) {
          return keyword;
        }

        index = segment.indexOf(keyword, index + keyword.length);
      }
    }
  }

  return null;
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

  // target/condition/completionCriteria describe when the judgement flips, so the
  // opposite direction legitimately appears there; only executed actions are checked.
  const executedActions = [
    output.conclusion.immediateAction,
    ...output.action.map((item) => item.action),
  ];

  if (output.conclusion.direction === "보류") {
    const conflict = findDirectionConflict(executedActions, EXPANSION_KEYWORDS);

    if (conflict) {
      issues.push({
        field: "conclusion.direction",
        message: `conclusion.direction이 보류인데 실행 행동에 확대·즉시 실행 표현(${conflict})이 포함되어 있습니다.`,
      });
    }
  }

  if (output.conclusion.direction === "확대") {
    const conflict = findDirectionConflict(executedActions, HOLD_KEYWORDS);

    if (conflict) {
      issues.push({
        field: "conclusion.direction",
        message: `conclusion.direction이 확대인데 실행 행동에 보류·중단 표현(${conflict})이 포함되어 있습니다.`,
      });
    }
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