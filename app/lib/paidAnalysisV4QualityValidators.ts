import type {
  PaidAnalysisDetailOutputV4,
  ResolvedPaidAnalysisDetailV4,
} from "./paidAnalysisDetailOutput";
import { getPeriodAnalysisStrategy } from "./analysisPeriodStrategy";

export type PaidAnalysisQualityIssue = {
  field: string;
  message: string;
};

export type PaidAnalysisQualityResult = {
  ok: boolean;
  issues: PaidAnalysisQualityIssue[];
};

/** Explicit calendar references. TOPIC products have no period data to back them. */
const CONCRETE_DATE_PATTERNS: RegExp[] = [
  /\d{4}\s*년/,
  /\d{4}[-.]\d{1,2}/,
  /\d{1,2}\s*월/,
  /\d{1,2}\s*일(?![상하])/,
];

function findDateMatch(text: string): string | null {
  for (const pattern of CONCRETE_DATE_PATTERNS) {
    const match = text.match(pattern);

    if (match) {
      return match[0];
    }
  }

  return null;
}

/**
 * PERIOD products are allowed to name real years because analysisPeriodStrategy
 * supplies the reference period; TOPIC products are not.
 */
export function validateTopicTimelineDates(
  output: PaidAnalysisDetailOutputV4,
  productId?: string,
): PaidAnalysisQualityResult {
  if (productId && getPeriodAnalysisStrategy(productId)) {
    return { ok: true, issues: [] };
  }

  const issues: PaidAnalysisQualityIssue[] = [];

  output.timeline.forEach((item, index) => {
    const fields: [string, string][] = [
      ["label", item.label],
      ["changeSignal", item.changeSignal],
      ["preparation", item.preparation],
    ];

    for (const [fieldName, value] of fields) {
      const match = findDateMatch(value);

      if (match) {
        issues.push({
          field: `timeline[${index}].${fieldName}`,
          message: `기간 계산 근거가 없는 상품에서 구체적인 시점 표현(${match})을 사용했습니다.`,
        });
      }
    }
  });

  return { ok: issues.length === 0, issues };
}

/** Kept in sync with the phrases the V4 prompt forbids. */
const GENERIC_ACTION_PHRASES = [
  "노력하세요",
  "조심하세요",
  "신중하세요",
  "잘 판단하세요",
  "긍정적으로 생각하세요",
  "소통하세요",
  "건강을 챙기세요",
  "무리하지 마세요",
  "계획을 세우세요",
  "자신을 믿으세요",
  "꾸준히 하세요",
];

export function validateActionStructure(
  output: PaidAnalysisDetailOutputV4,
): PaidAnalysisQualityResult {
  const issues: PaidAnalysisQualityIssue[] = [];

  output.action.forEach((item, index) => {
    const combined = `${item.action} ${item.target} ${item.condition} ${item.completionCriteria}`;

    const matched = GENERIC_ACTION_PHRASES.find((phrase) =>
      combined.includes(phrase),
    );

    if (matched) {
      issues.push({
        field: `action[${index}]`,
        message: `누구에게나 적용되는 표현(${matched})이 포함되어 있습니다.`,
      });
    }
  });

  return { ok: issues.length === 0, issues };
}

/** Investment execution and return promises only; ordinary budgeting stays allowed. */
const MONEY_FORBIDDEN_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /매수|매도|손절|익절/, label: "매매 지시" },
  { pattern: /수익률/, label: "수익률 제시" },
  { pattern: /원금\s*보장|손실\s*(을\s*)?(보전|회복)(할 수 있|됩니|된다)/, label: "손실 회복 보장" },
  { pattern: /주식|코인|가상화폐|비트코인|펀드|ETF|채권/, label: "특정 투자 상품 지목" },
  { pattern: /부동산을?\s*(매입|구입|사)/, label: "부동산 매입 지시" },
  { pattern: /\d+\s*(만원|억|천만원)/, label: "구체 금액 제시" },
];

function collectV4Texts(output: PaidAnalysisDetailOutputV4): [string, string][] {
  const entries: [string, string][] = [
    ["conclusion.headline", output.conclusion.headline],
    ["conclusion.rationale", output.conclusion.rationale],
    ["conclusion.immediateAction", output.conclusion.immediateAction],
    ["coreProblem.description", output.coreProblem.description],
    ["cause.summary", output.cause.summary],
  ];

  output.cause.reasons.forEach((reason, index) => {
    entries.push([`cause.reasons[${index}]`, reason.realWorldPattern]);
  });

  output.evidence.forEach((item, index) => {
    entries.push([`evidence[${index}].meaning`, item.meaning]);
    entries.push([`evidence[${index}].linkage`, item.linkage]);
  });

  [...output.current.opportunities, ...output.current.cautions].forEach(
    (item, index) => {
      entries.push([`current[${index}]`, item.implication]);
    },
  );

  output.action.forEach((item, index) => {
    entries.push([
      `action[${index}]`,
      `${item.action} ${item.target} ${item.condition} ${item.completionCriteria}`,
    ]);
  });

  output.avoid.forEach((item, index) => {
    entries.push([`avoid[${index}]`, `${item.behavior} ${item.reason}`]);
  });

  return entries;
}

export function validateMoneySafety(
  output: PaidAnalysisDetailOutputV4,
): PaidAnalysisQualityResult {
  const issues: PaidAnalysisQualityIssue[] = [];

  for (const [field, text] of collectV4Texts(output)) {
    for (const { pattern, label } of MONEY_FORBIDDEN_PATTERNS) {
      if (pattern.test(text)) {
        issues.push({
          field,
          message: `재무 안전 규칙 위반: ${label}`,
        });
        break;
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Warning only. Semantic linkage cannot be checked reliably, so this reports weak
 * evidence instead of failing generation.
 */
export function reviewEvidenceLinkage(
  output: ResolvedPaidAnalysisDetailV4,
): PaidAnalysisQualityIssue[] {
  const warnings: PaidAnalysisQualityIssue[] = [];
  const focus = output.conclusion.focus.trim();

  output.evidence.forEach((item, index) => {
    if (!item.linkage.trim()) {
      warnings.push({
        field: `evidence[${index}].linkage`,
        message: "근거와 결론의 연결 설명이 비어 있습니다.",
      });
      return;
    }

    const mentionsDirection = item.linkage.includes(
      output.conclusion.direction,
    );
    const mentionsFocus = focus.length > 0 && item.linkage.includes(focus);

    if (!mentionsDirection && !mentionsFocus) {
      warnings.push({
        field: `evidence[${index}].linkage`,
        message: "근거가 결론의 방향이나 대상과 명시적으로 연결되지 않았습니다.",
      });
    }
  });

  return warnings;
}
