import type { ResolvedPaidAnalysisDetailV4 } from "./paidAnalysisDetailOutput";

export type PaidAnalysisV4HealthSafetyIssue = {
  field: string;
  message: string;
};

export type PaidAnalysisV4HealthSafetyResult = {
  ok: boolean;
  issues: PaidAnalysisV4HealthSafetyIssue[];
};

const FORBIDDEN_MEDICAL_EXPRESSIONS = [
  "교감신경 항진",
  "면역력 저하",
  "위장 기능 저하",
  "심박 이상",
  "호르몬 이상",
  "신경계 이상",
  "장기 이상",
  "질병이 있다",
  "질환이 있다",
  "치료가 필요하다",
  "약을 복용해야 한다",
  "수술이 필요하다",
];

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function collectHealthReportTexts(
  output: ResolvedPaidAnalysisDetailV4,
): Array<{ field: string; text: string }> {
  const entries: Array<{ field: string; text: string }> = [
    { field: "conclusion.headline", text: output.conclusion.headline },
    { field: "conclusion.focus", text: output.conclusion.focus },
    { field: "conclusion.rationale", text: output.conclusion.rationale },
    { field: "conclusion.immediateAction", text: output.conclusion.immediateAction },
    { field: "coreProblem.title", text: output.coreProblem.title },
    { field: "coreProblem.description", text: output.coreProblem.description },
    { field: "coreProblem.whyItMatters", text: output.coreProblem.whyItMatters },
    { field: "cause.summary", text: output.cause.summary },
    { field: "current.summary", text: output.current.summary },
    { field: "confidence.limitations", text: output.confidence.limitations },
  ];

  output.cause.reasons.forEach((reason, index) => {
    entries.push(
      { field: `cause.reasons[${index}].title`, text: reason.title },
      { field: `cause.reasons[${index}].observedStructure`, text: reason.observedStructure },
      { field: `cause.reasons[${index}].realWorldPattern`, text: reason.realWorldPattern },
      { field: `cause.reasons[${index}].problemLinkage`, text: reason.problemLinkage },
    );
  });

  output.evidence.forEach((item, index) => {
    entries.push(
      { field: `evidence[${index}].meaning`, text: item.meaning },
      { field: `evidence[${index}].linkage`, text: item.linkage },
    );
  });

  output.current.opportunities.forEach((item, index) => {
    entries.push(
      { field: `current.opportunities[${index}].situation`, text: item.situation },
      { field: `current.opportunities[${index}].implication`, text: item.implication },
      { field: `current.opportunities[${index}].observableSignal`, text: item.observableSignal },
    );
  });

  output.current.cautions.forEach((item, index) => {
    entries.push(
      { field: `current.cautions[${index}].situation`, text: item.situation },
      { field: `current.cautions[${index}].implication`, text: item.implication },
      { field: `current.cautions[${index}].observableSignal`, text: item.observableSignal },
    );
  });

  output.timeline.forEach((item, index) => {
    entries.push(
      { field: `timeline[${index}].label`, text: item.label },
      { field: `timeline[${index}].changeSignal`, text: item.changeSignal },
      { field: `timeline[${index}].preparation`, text: item.preparation },
    );
  });

  output.action.forEach((item, index) => {
    entries.push(
      { field: `action[${index}].action`, text: item.action },
      { field: `action[${index}].target`, text: item.target },
      { field: `action[${index}].condition`, text: item.condition },
      { field: `action[${index}].completionCriteria`, text: item.completionCriteria },
    );
  });

  output.avoid.forEach((item, index) => {
    entries.push(
      { field: `avoid[${index}].behavior`, text: item.behavior },
      { field: `avoid[${index}].reason`, text: item.reason },
    );
  });

  output.decisionCheck?.forEach((text, index) => {
    entries.push({ field: `decisionCheck[${index}]`, text });
  });

  output.confidence.strongestEvidence.forEach((text, index) => {
    entries.push({ field: `confidence.strongestEvidence[${index}]`, text });
  });

  output.confidence.uncertaintyFactors.forEach((text, index) => {
    entries.push({ field: `confidence.uncertaintyFactors[${index}]`, text });
  });

  return entries;
}

export function validatePaidAnalysisV4HealthSafety(
  output: ResolvedPaidAnalysisDetailV4,
): PaidAnalysisV4HealthSafetyResult {
  const issues: PaidAnalysisV4HealthSafetyIssue[] = [];

  for (const item of collectHealthReportTexts(output)) {
    const normalized = normalizeText(item.text);

    for (const forbiddenExpression of FORBIDDEN_MEDICAL_EXPRESSIONS) {
      if (normalized.includes(forbiddenExpression)) {
        issues.push({
          field: item.field,
          message: `"${forbiddenExpression}" 표현은 의료적 진단이나 치료 지시처럼 읽힐 수 있어 건강운 리포트에서 사용할 수 없습니다.`,
        });
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
