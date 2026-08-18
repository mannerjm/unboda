import type {
  PaidAnalysisEvidenceKey,
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

export type PaidAnalysisPremiumDepthInsight = {
  insightId: string;
  evidenceKey: PaidAnalysisEvidenceKey;
  mechanism: string;
  observableCondition: string;
  actionResponsibility: string;
};

export type PaidAnalysisPremiumDepthContract = {
  productId: string;
  requiredInsightIds: readonly string[];
  evidenceFocus: readonly PaidAnalysisEvidenceKey[];
  actionFocus: readonly string[];
  positiveOwnership: readonly string[];
  insightOwnership: readonly PaidAnalysisPremiumDepthInsight[];
  timingMode: "contextual" | "period";
  temporalEvidence?: readonly PaidAnalysisEvidenceKey[];
};

function normalizeOwnershipText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const GENERIC_ACTION_ONLY = new Set([
  "기록하세요",
  "확인하세요",
  "점검하세요",
  "대화하세요",
  "천천히 하세요",
  "신중하세요",
]);

/**
 * Validates the static reasoning responsibilities that a V4 topic must make
 * available to the eventual generator and self-review layer.
 */
export function validatePremiumDepthContract(
  contract: PaidAnalysisPremiumDepthContract,
): PaidAnalysisQualityResult {
  const issues: PaidAnalysisQualityIssue[] = [];
  const requiredIds = contract.requiredInsightIds.map(normalizeOwnershipText);
  const ownershipIds = contract.insightOwnership.map((item) => item.insightId);

  if (requiredIds.length === 0) {
    issues.push({ field: "requiredInsightIds", message: "필수 통찰이 없습니다." });
  }

  if (new Set(requiredIds).size !== requiredIds.length) {
    issues.push({ field: "requiredInsightIds", message: "필수 통찰 ID가 중복됩니다." });
  }

  if (
    ownershipIds.length !== requiredIds.length ||
    ownershipIds.some((id) => !requiredIds.includes(id))
  ) {
    issues.push({ field: "insightOwnership", message: "모든 필수 통찰에 정확히 하나의 깊이 책임이 필요합니다." });
  }

  if (contract.positiveOwnership.length === 0) {
    issues.push({ field: "positiveOwnership", message: "긍정적 분석 소유권이 없습니다." });
  }

  if (contract.actionFocus.length === 0) {
    issues.push({ field: "actionFocus", message: "상품별 행동 책임이 없습니다." });
  } else if (
    contract.actionFocus.every((action) =>
      GENERIC_ACTION_ONLY.has(normalizeOwnershipText(action)),
    )
  ) {
    issues.push({ field: "actionFocus", message: "상품의 행동 초점이 일반 행동 문구만으로 구성되었습니다." });
  }

  const mechanisms = new Set<string>();
  const responsibilities = new Set<string>();

  for (const [index, insight] of contract.insightOwnership.entries()) {
    const prefix = `insightOwnership[${index}]`;
    const mechanism = normalizeOwnershipText(insight.mechanism);
    const observableCondition = normalizeOwnershipText(insight.observableCondition);
    const actionResponsibility = normalizeOwnershipText(insight.actionResponsibility);

    if (!contract.evidenceFocus.includes(insight.evidenceKey)) {
      issues.push({ field: `${prefix}.evidenceKey`, message: "통찰의 근거 key가 상품 evidenceFocus에 없습니다." });
    }

    if (!mechanism || !observableCondition || !actionResponsibility) {
      issues.push({ field: prefix, message: "통찰마다 mechanism, observable condition, action responsibility가 필요합니다." });
      continue;
    }

    if (GENERIC_ACTION_ONLY.has(actionResponsibility)) {
      issues.push({ field: `${prefix}.actionResponsibility`, message: "통찰 책임이 일반 행동 문구만으로 구성되었습니다." });
    }

    if (mechanisms.has(mechanism)) {
      issues.push({ field: `${prefix}.mechanism`, message: "서로 다른 통찰이 같은 mechanism으로 붕괴됩니다." });
    }
    mechanisms.add(mechanism);

    const responsibilityKey = `${observableCondition}|${actionResponsibility}`;
    if (responsibilities.has(responsibilityKey)) {
      issues.push({ field: prefix, message: "서로 다른 통찰이 같은 observable/action 책임으로 붕괴됩니다." });
    }
    responsibilities.add(responsibilityKey);
  }

  if (contract.timingMode === "period") {
    if (!contract.temporalEvidence || contract.temporalEvidence.length === 0) {
      issues.push({ field: "temporalEvidence", message: "기간 상품에는 의미 있는 temporal evidence가 필요합니다." });
    }
  } else if (contract.temporalEvidence && contract.temporalEvidence.length > 0) {
    issues.push({ field: "temporalEvidence", message: "비기간 상품은 event-date ownership을 가질 수 없습니다." });
  }

  return { ok: issues.length === 0, issues };
}

/** Excluded focus cannot be the only distinction between neighboring products. */
export function validatePremiumDepthSiblingDistinction(
  left: PaidAnalysisPremiumDepthContract,
  right: PaidAnalysisPremiumDepthContract,
): PaidAnalysisQualityResult {
  const leftOwnership = left.positiveOwnership.map(normalizeOwnershipText).join("|");
  const rightOwnership = right.positiveOwnership.map(normalizeOwnershipText).join("|");

  const tokenSet = (value: string): Set<string> =>
    new Set(value.split(/[\s|·,./()]+/).filter((token) => token.length >= 2));
  const leftTokens = tokenSet(leftOwnership);
  const rightTokens = tokenSet(rightOwnership);
  const sharedTokenCount = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const maxTokenCount = Math.max(leftTokens.size, rightTokens.size, 1);
  const ownershipOverlap = sharedTokenCount / maxTokenCount;

  if (leftOwnership === rightOwnership || ownershipOverlap >= 0.85) {
    return {
      ok: false,
      issues: [{ field: "positiveOwnership", message: "제외 범위와 무관하게 두 상품의 긍정적 분석 소유권이 실질적으로 같습니다." }],
    };
  }

  return { ok: true, issues: [] };
}

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
