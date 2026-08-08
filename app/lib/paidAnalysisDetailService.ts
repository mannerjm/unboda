import { evaluateRelationshipPremiumQuality } from "./paidAnalysisRelationshipPremiumQuality";
import { validatePaidAnalysisHealthSafety } from "./paidAnalysisHealthSafetyValidator";
import { generateAnalysisText } from "./ai/generateAnalysisText";
import { reviewPaidAnalysisDetail } from "./paidAnalysisSelfReview";
import type {
  PaidAnalysisDetailOutput,
  PaidAnalysisDetailOutputV2,
    PaidAnalysisDetailOutputV3,
} from "./paidAnalysisDetailOutput";
import { validatePaidAnalysisConsistency } from "./paidAnalysisConsistencyValidator";
import {
  parsePaidAnalysisDetailOutput,
  parsePaidAnalysisDetailOutputV2,
   parsePaidAnalysisDetailOutputV3,
} from "./paidAnalysisDetailOutputParser";
import {
  buildPaidAnalysisDetailPrompt,
  buildPaidAnalysisDetailPromptV2,
    buildPaidAnalysisDetailPromptV3,
  type PaidAnalysisDetailPromptInput,
} from "./paidAnalysisDetailPrompt";

function parseGeneratedPaidAnalysisDetail(
  value: unknown,
): PaidAnalysisDetailOutput {
  const parsedValue =
    typeof value === "string"
      ? JSON.parse(value)
      : value;

  return parsePaidAnalysisDetailOutput(parsedValue);
}

function parseGeneratedPaidAnalysisDetailV2(
  value: unknown,
): PaidAnalysisDetailOutputV2 {
  const parsedValue =
    typeof value === "string"
      ? JSON.parse(value)
      : value;

  return parsePaidAnalysisDetailOutputV2(parsedValue);
}

function parseGeneratedPaidAnalysisDetailV3(
  value: unknown,
): PaidAnalysisDetailOutputV3 {
  const parsedValue =
    typeof value === "string"
      ? JSON.parse(value)
      : value;

  return parsePaidAnalysisDetailOutputV3(parsedValue);
}

export async function generatePaidAnalysisDetail(
  input: PaidAnalysisDetailPromptInput,
): Promise<PaidAnalysisDetailOutput> {
  const prompt = buildPaidAnalysisDetailPrompt(input);

  const responseText = await generateAnalysisText(prompt);

  return parseGeneratedPaidAnalysisDetail(responseText);
}

export async function generatePaidAnalysisDetailV2(
  input: PaidAnalysisDetailPromptInput,
): Promise<PaidAnalysisDetailOutputV3> {

  console.log("PAID ANALYSIS V2 INPUT:", {
  analysisType: input.analysisType,
  userConcern: input.userConcern,
});

  const prompt = buildPaidAnalysisDetailPromptV3(input);

  console.log("HEALTH RULE INCLUDED:", prompt.includes("상품별 분석 규칙 - 건강운"));
console.log("CAREER RULE INCLUDED:", prompt.includes("상품별 분석 규칙 - 직업·사업운"));

console.log(
  "RELATIONSHIP PREMIUM RULE INCLUDED:",
  prompt.includes("연애·관계 5만원급 심층 분석 품질 규칙"),
);

  const responseText = await generateAnalysisText(prompt);

  const detail = parseGeneratedPaidAnalysisDetailV3(responseText);

  const consistencyResult = validatePaidAnalysisConsistency(detail);

  if (!consistencyResult.ok) {
    const issueMessage = consistencyResult.issues
      .map((issue) => `${issue.field}: ${issue.message}`)
      .join(" | ");

    throw new Error(
      `심층 분석 결과의 섹션 간 일관성 검증에 실패했습니다. ${issueMessage}`,
    );
  }

const selfReview = reviewPaidAnalysisDetail(detail);

if (!selfReview.passed) {
  const feedbackMessage = selfReview.feedback.join(" | ");

  throw new Error(
    `심층 분석 결과의 Self Review에 실패했습니다. 점수: ${selfReview.overallScore}. ${feedbackMessage}`,
  );
}

const isHealthAnalysis =
  input.analysisType.includes("건강") ||
  input.analysisType.includes("컨디션") ||
  input.analysisType.includes("회복");

if (isHealthAnalysis) {
  const healthSafetyResult =
    validatePaidAnalysisHealthSafety(detail);

  if (!healthSafetyResult.ok) {
    const issueMessage = healthSafetyResult.issues
      .map((issue) => `${issue.field}: ${issue.message}`)
      .join(" | ");

    throw new Error(
      `건강운 심층 분석 결과의 안전 검증에 실패했습니다. ${issueMessage}`,
    );
  }
}

const isRelationshipAnalysis =
  input.analysisType.includes("연애") ||
  input.analysisType.includes("관계");

if (isRelationshipAnalysis) {
  const relationshipPremiumResult =
    evaluateRelationshipPremiumQuality({
      pastPatternSummary:
        detail.pastPattern.summary,

      pastPatternVerificationQuestion:
        detail.pastPattern.periods[0]?.verificationQuestion ?? "",

      currentCoreProblemTitle:
        detail.currentCoreProblem.title,

      currentCoreProblemDescription:
        detail.currentCoreProblem.description,

      currentCoreProblemWhyItMatters:
        detail.currentCoreProblem.whyItMatters,

      futureTimelineTexts:
        detail.futureTimeline.map(
          (item) =>
            `${item.period} ${item.title} ${item.description}`,
        ),

      actionGuide:
        detail.actionGuide,
    });

  if (!relationshipPremiumResult.ok) {
    const failedChecks = Object.entries(
      relationshipPremiumResult.checks,
    )
      .filter(([, passed]) => !passed)
      .map(([check]) => check);

    const issueMessage = [
      ...failedChecks,
      ...relationshipPremiumResult.businessMatches,
      ...relationshipPremiumResult.genericAdviceMatches,
    ].join(" | ");

    throw new Error(
      `연애·관계 심층 분석 결과가 5만원급 품질 기준을 충족하지 못했습니다. ${issueMessage}`,
    );
  }
}

  return detail;
}