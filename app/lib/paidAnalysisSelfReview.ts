export type PaidAnalysisSelfReviewResult = {
  passed: boolean;

  overallScore: number;

  checks: {
    consistency: boolean;
    readability: boolean;
    duplication: boolean;
    persuasiveness: boolean;
    actionability: boolean;
  };

  feedback: string[];

  revisedSections: string[];
};

import type { PaidAnalysisDetailOutputV2 } from "./paidAnalysisDetailOutput";
import { validatePaidAnalysisConsistency } from "./paidAnalysisConsistencyValidator";

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim();
}

function collectReportTexts(
  output: PaidAnalysisDetailOutputV2,
): string[] {
  return [
    output.heroSummary.headline,
    output.heroSummary.subheadline,
    output.heroSummary.keyMessage,
    output.decisionAnchor.focus,
    output.decisionAnchor.rationale,
    output.causeAnalysis.summary,
    ...output.causeAnalysis.reasons,
    output.fortuneStructure.summary,
    ...output.fortuneStructure.items.flatMap((item) => [
      item.label,
      item.value,
      item.interpretation,
    ]),
    output.currentSituation.summary,
    ...output.currentSituation.opportunities,
    ...output.currentSituation.cautions,
    ...output.futureTimeline.flatMap((item) => [
      item.period,
      item.title,
      item.description,
    ]),
    ...output.actionGuide,
    ...output.avoidGuide,
    output.coachMessage.title,
    output.coachMessage.message,
    ...output.checklist,
  ].map(normalizeText);
}

function hasDuplicateContent(texts: string[]): boolean {
  const meaningfulTexts = texts.filter((text) => text.length >= 10);
  const uniqueTexts = new Set(meaningfulTexts);

  return uniqueTexts.size !== meaningfulTexts.length;
}

function hasWeakActionExpression(text: string): boolean {
  const weakExpressions = [
    "노력하세요",
    "조심하세요",
    "신중하세요",
    "잘 판단하세요",
    "긍정적으로 생각하세요",
  ];

  return weakExpressions.some((expression) => {
    return text === expression || text.endsWith(expression);
  });
}

export function reviewPaidAnalysisDetail(
  output: PaidAnalysisDetailOutputV2,
): PaidAnalysisSelfReviewResult {
  const feedback: string[] = [];
  const revisedSections: string[] = [];

  const consistencyResult =
    validatePaidAnalysisConsistency(output);

  const texts = collectReportTexts(output);

  const duplicationPassed = !hasDuplicateContent(texts);

  const readabilityPassed = texts.every(
    (text) => text.length > 0 && !/\s{2,}/.test(text),
  );

  const actionabilityPassed = output.actionGuide.every(
    (guide) => !hasWeakActionExpression(normalizeText(guide)),
  );

  const persuasivenessPassed =
    output.causeAnalysis.reasons.length >= 3 &&
    output.decisionAnchor.rationale.length >= 10;

  if (!consistencyResult.ok) {
    feedback.push("리포트 섹션 사이에 방향성 모순이 있습니다.");
  }

  if (!readabilityPassed) {
    feedback.push("빈 문장 또는 불필요한 공백이 포함되어 있습니다.");
  }

  if (!duplicationPassed) {
    feedback.push("동일하거나 지나치게 반복되는 문장이 있습니다.");
  }

  if (!persuasivenessPassed) {
    feedback.push("핵심 판단을 뒷받침하는 근거가 부족합니다.");
  }

  if (!actionabilityPassed) {
    feedback.push("행동 가이드에 추상적인 표현이 포함되어 있습니다.");
  }

  const checks = {
    consistency: consistencyResult.ok,
    readability: readabilityPassed,
    duplication: duplicationPassed,
    persuasiveness: persuasivenessPassed,
    actionability: actionabilityPassed,
  };

  const passed = Object.values(checks).every(Boolean);

  const passedCheckCount =
    Object.values(checks).filter(Boolean).length;

  const overallScore = passedCheckCount * 20;

  return {
    passed,
    overallScore,
    checks,
    feedback,
    revisedSections,
  };
}