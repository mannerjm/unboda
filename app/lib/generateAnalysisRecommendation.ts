import { generateAnalysisText } from "./ai";
import {
  buildAnalysisRecommendationRequest,
} from "./analysisRecommendationRequest";
import {
  parseAnalysisRecommendationOutput,
} from "./analysisRecommendationOutputParser";
import type {
  AnalysisRecommendationOutput,
  RecommendationExplanationItem,
} from "./analysisRecommendationOutput";
import type {
  BuildAnalysisRecommendationPromptInput,
} from "./analysisRecommendationPrompt";
import type { AnalysisRecommendation } from "./analysisRecommendation";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildRecommendationExplanationItems(
  recommendation: AnalysisRecommendation
): RecommendationExplanationItem[] {
  const contextMap = new Map(
    (recommendation.recommendationContext ?? []).map((item) => [item.productId, item])
  );

  const rankedProductIds = [
    recommendation.recommendedProductId,
    ...recommendation.secondaryRecommendations.map((item) => item.productId),
  ].filter((productId): productId is string => Boolean(productId));

  return rankedProductIds.slice(0, 3).map((productId, index) => {
    const context = contextMap.get(productId);
    const title = context?.title ?? productId;
    const evidenceSignals = (context?.evidence ?? [])
      .slice(0, 2)
      .map((entry) => entry.signal)
      .filter(isNonEmptyString);
    const focusSignals = (context?.analysisFocus ?? []).slice(0, 2);
    const outcomeSignals = (context?.expectedOutcome ?? []).slice(0, 2);

    const evidenceText = evidenceSignals.length > 0
      ? evidenceSignals.join(", ")
      : "현재 추천 근거";
    const focusText = focusSignals.length > 0
      ? focusSignals.join(", ")
      : "핵심 흐름";
    const outcomeText = outcomeSignals.length > 0
      ? outcomeSignals.join(", ")
      : "확인 포인트";

    const headline = index === 0
      ? `${title} 심층 분석이 현재 우선 추천됩니다.`
      : `${title} 심층 분석은 현재 추천 순위에 맞춰 확인할 가치가 있습니다.`;

    const summary = `${title}는 ${evidenceText}를 기준으로 현재 추천 순위에 맞춰 우선 점검할 가치가 있습니다.`;
    const userMeaning = `이 분석을 통해 사용자는 ${focusText}를 중심으로 ${outcomeText}를 확인할 수 있습니다.`;

    return {
      productId,
      headline,
      summary,
      userMeaning,
    };
  });
}

export function buildDeterministicRecommendationExplanation(
  recommendation: AnalysisRecommendation
): AnalysisRecommendationOutput {
  const fallbackItems = buildRecommendationExplanationItems(recommendation);
  const firstReason = fallbackItems[0]?.summary ?? recommendation.recommendedReason;
  const secondReason = fallbackItems[1]?.summary ?? recommendation.secondaryRecommendations[0]?.reason ?? recommendation.recommendedReason;
  const thirdReason = fallbackItems[2]?.summary ?? recommendation.secondaryRecommendations[1]?.reason ?? recommendation.recommendedReason;

  return {
    headline: recommendation.headline || "추천 심층 분석이 준비되었습니다.",
    summary: recommendation.summary || "현재 추천 순위에 따라 핵심 확인 포인트를 안내합니다.",
    userMeaning: recommendation.userMeaning || "추천된 분석을 통해 사용자가 중요한 확인 포인트를 파악할 수 있습니다.",
    cardReasons: {
      first: firstReason,
      second: secondReason,
      third: thirdReason,
    },
    conversionGuidance: {
      whyNow: "현재 추천 순위에 따라 핵심 확인 포인트를 먼저 살펴보는 것이 좋습니다.",
      whatYouWillLearn: "이 심층 분석을 통해 추천 상품의 핵심 흐름과 확인 포인트를 이해할 수 있습니다.",
      riskOfDelay: "이 분석을 미루면 현재 추천 순위의 핵심 체크 포인트를 놓칠 수 있습니다.",
    },
    recommendationItems: fallbackItems,
  };
}

function buildMergedRecommendationItems(
  recommendation: AnalysisRecommendation,
  aiOutput: AnalysisRecommendationOutput | null,
  fallback: AnalysisRecommendationOutput
): RecommendationExplanationItem[] {
  const expectedProductIds = [
    recommendation.recommendedProductId,
    ...recommendation.secondaryRecommendations.map((item) => item.productId),
  ].filter((productId): productId is string => Boolean(productId)).slice(0, 3);

  const aiItems = (aiOutput?.recommendationItems ?? []) as readonly RecommendationExplanationItem[];
  const aiItemByProductId = new Map<string, RecommendationExplanationItem>();

  for (const item of aiItems) {
    if (!item?.productId) {
      continue;
    }

    const normalizedProductId = item.productId.trim();

    if (!normalizedProductId) {
      continue;
    }

    if (
      isNonEmptyString(item.headline) &&
      isNonEmptyString(item.summary) &&
      isNonEmptyString(item.userMeaning)
    ) {
      aiItemByProductId.set(normalizedProductId, item);
    }
  }

  return expectedProductIds.map((productId) => {
    const fallbackItem = fallback.recommendationItems?.find((item) => item.productId === productId);
    const aiItem = aiItemByProductId.get(productId);

    if (aiItem) {
      return aiItem;
    }

    return fallbackItem ?? {
      productId,
      headline: fallback.headline,
      summary: fallback.summary,
      userMeaning: fallback.userMeaning,
    };
  });
}

export function mergeAnalysisRecommendationOutput(input: {
  recommendation: AnalysisRecommendation;
  aiOutput: AnalysisRecommendationOutput | null;
}): AnalysisRecommendationOutput {
  const fallback = buildDeterministicRecommendationExplanation(input.recommendation);

  if (!input.aiOutput) {
    return fallback;
  }

  const aiOutput = input.aiOutput;
  const mergedItems = buildMergedRecommendationItems(input.recommendation, aiOutput, fallback);

  const hasAnyValidContent =
    isNonEmptyString(aiOutput.headline) ||
    isNonEmptyString(aiOutput.summary) ||
    isNonEmptyString(aiOutput.userMeaning) ||
    isNonEmptyString(aiOutput.cardReasons?.first) ||
    isNonEmptyString(aiOutput.cardReasons?.second) ||
    isNonEmptyString(aiOutput.cardReasons?.third) ||
    isNonEmptyString(aiOutput.conversionGuidance?.whyNow) ||
    isNonEmptyString(aiOutput.conversionGuidance?.whatYouWillLearn) ||
    isNonEmptyString(aiOutput.conversionGuidance?.riskOfDelay) ||
    (aiOutput.recommendationItems?.some((item) =>
      isNonEmptyString(item?.headline) ||
      isNonEmptyString(item?.summary) ||
      isNonEmptyString(item?.userMeaning)
    ) ?? false);

  if (!hasAnyValidContent) {
    return fallback;
  }

  return {
    headline: isNonEmptyString(aiOutput.headline)
      ? aiOutput.headline
      : fallback.headline,
    summary: isNonEmptyString(aiOutput.summary)
      ? aiOutput.summary
      : fallback.summary,
    userMeaning: isNonEmptyString(aiOutput.userMeaning)
      ? aiOutput.userMeaning
      : fallback.userMeaning,
    cardReasons: {
      first: isNonEmptyString(aiOutput.cardReasons?.first)
        ? aiOutput.cardReasons.first
        : fallback.cardReasons.first,
      second: isNonEmptyString(aiOutput.cardReasons?.second)
        ? aiOutput.cardReasons.second
        : fallback.cardReasons.second,
      third: isNonEmptyString(aiOutput.cardReasons?.third)
        ? aiOutput.cardReasons.third
        : fallback.cardReasons.third,
    },
    conversionGuidance: {
      whyNow: isNonEmptyString(aiOutput.conversionGuidance?.whyNow)
        ? aiOutput.conversionGuidance.whyNow
        : fallback.conversionGuidance.whyNow,
      whatYouWillLearn: isNonEmptyString(aiOutput.conversionGuidance?.whatYouWillLearn)
        ? aiOutput.conversionGuidance.whatYouWillLearn
        : fallback.conversionGuidance.whatYouWillLearn,
      riskOfDelay: isNonEmptyString(aiOutput.conversionGuidance?.riskOfDelay)
        ? aiOutput.conversionGuidance.riskOfDelay
        : fallback.conversionGuidance.riskOfDelay,
    },
    recommendationItems: mergedItems,
  };
}

export async function generateAnalysisRecommendation(
  input: BuildAnalysisRecommendationPromptInput
): Promise<AnalysisRecommendationOutput> {
  const prompt = buildAnalysisRecommendationRequest(input);

  try {
    const outputText = await generateAnalysisText(prompt);

    if (!isNonEmptyString(outputText)) {
      return buildDeterministicRecommendationExplanation(input.recommendation);
    }

    try {
      const parsed = parseAnalysisRecommendationOutput(outputText);
      return mergeAnalysisRecommendationOutput({
        recommendation: input.recommendation,
        aiOutput: parsed,
      });
    } catch {
      return buildDeterministicRecommendationExplanation(input.recommendation);
    }
  } catch {
    return buildDeterministicRecommendationExplanation(input.recommendation);
  }
}