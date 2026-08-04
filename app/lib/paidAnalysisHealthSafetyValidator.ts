import type { PaidAnalysisDetailOutputV2 } from "./paidAnalysisDetailOutput";

export type PaidAnalysisHealthSafetyIssue = {
  field: string;
  message: string;
};

export type PaidAnalysisHealthSafetyResult = {
  ok: boolean;
  issues: PaidAnalysisHealthSafetyIssue[];
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
  output: PaidAnalysisDetailOutputV2,
): Array<{ field: string; text: string }> {
  return [
    {
      field: "heroSummary.headline",
      text: output.heroSummary.headline,
    },
    {
      field: "heroSummary.subheadline",
      text: output.heroSummary.subheadline,
    },
    {
      field: "heroSummary.keyMessage",
      text: output.heroSummary.keyMessage,
    },
    {
      field: "decisionAnchor.focus",
      text: output.decisionAnchor.focus,
    },
    {
      field: "decisionAnchor.rationale",
      text: output.decisionAnchor.rationale,
    },
    {
      field: "causeAnalysis.summary",
      text: output.causeAnalysis.summary,
    },
    ...output.causeAnalysis.reasons.map((text, index) => ({
      field: `causeAnalysis.reasons[${index}]`,
      text,
    })),
    {
      field: "fortuneStructure.summary",
      text: output.fortuneStructure.summary,
    },
    ...output.fortuneStructure.items.flatMap((item, index) => [
      {
        field: `fortuneStructure.items[${index}].label`,
        text: item.label,
      },
      {
        field: `fortuneStructure.items[${index}].value`,
        text: item.value,
      },
      {
        field: `fortuneStructure.items[${index}].interpretation`,
        text: item.interpretation,
      },
    ]),
    {
      field: "currentSituation.summary",
      text: output.currentSituation.summary,
    },
    ...output.currentSituation.opportunities.map((text, index) => ({
      field: `currentSituation.opportunities[${index}]`,
      text,
    })),
    ...output.currentSituation.cautions.map((text, index) => ({
      field: `currentSituation.cautions[${index}]`,
      text,
    })),
    ...output.futureTimeline.flatMap((item, index) => [
      {
        field: `futureTimeline[${index}].title`,
        text: item.title,
      },
      {
        field: `futureTimeline[${index}].description`,
        text: item.description,
      },
    ]),
    ...output.actionGuide.map((text, index) => ({
      field: `actionGuide[${index}]`,
      text,
    })),
    ...output.avoidGuide.map((text, index) => ({
      field: `avoidGuide[${index}]`,
      text,
    })),
    {
      field: "coachMessage.title",
      text: output.coachMessage.title,
    },
    {
      field: "coachMessage.message",
      text: output.coachMessage.message,
    },
    ...output.checklist.map((text, index) => ({
      field: `checklist[${index}]`,
      text,
    })),
  ];
}

export function validatePaidAnalysisHealthSafety(
  output: PaidAnalysisDetailOutputV2,
): PaidAnalysisHealthSafetyResult {
  const issues: PaidAnalysisHealthSafetyIssue[] = [];

  const reportTexts = collectHealthReportTexts(output);

  for (const item of reportTexts) {
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