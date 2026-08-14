import type { AnalysisRecommendation } from "../app/lib/analysisRecommendation";
import type { AnalysisRecommendationOutput } from "../app/lib/analysisRecommendationOutput";
import {
  buildDeterministicRecommendationExplanation,
  mergeAnalysisRecommendationOutput,
} from "../app/lib/generateAnalysisRecommendation";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const baseRecommendation: AnalysisRecommendation = {
  primaryTheme: "career-job-change",
  headline: "커리어 전환이 필요한 시점입니다.",
  summary: "현재 운의 흐름상 커리어 전환을 점검할 시점입니다.",
  userMeaning: "이 분석은 커리어 방향을 다시 보게 합니다.",
  reasons: [
    { id: "career-job-change-1", label: "추천 근거 1", explanation: "직업 전환의 흐름이 강화됩니다." },
    { id: "career-job-change-2", label: "추천 근거 2", explanation: "새로운 역할 기회가 열립니다." },
    { id: "career-job-change-3", label: "추천 근거 3", explanation: "실행 시점이 중요합니다." },
  ],
  recommendedProductId: "career-job-change",
  recommendedReason: "직업 전환의 흐름이 강화됩니다.",
  secondaryRecommendations: [
    { productId: "money-investment", reason: "재무 관리를 보완할 시점입니다." },
    { productId: "relationship-boundary", reason: "관계 경계 정리가 필요합니다." },
  ],
  recommendationContext: [
    {
      productId: "career-job-change",
      title: "커리어 전환",
      analysisFocus: ["직무 방향", "시기 조정"],
      expectedOutcome: ["전환 방향 확인", "리스크 최소화"],
      score: 3.2,
      evidence: [
        { signal: "직업 전환 흐름", source: "recommendationEngine", contribution: 1.1 },
      ],
    },
    {
      productId: "money-investment",
      title: "재무 관리",
      analysisFocus: ["자산 포트폴리오", "투자 시점"],
      expectedOutcome: ["안정적 자산 관리"],
      score: 2.5,
      evidence: [
        { signal: "재무 관리 필요성", source: "recommendationEngine", contribution: 0.9 },
      ],
    },
    {
      productId: "relationship-boundary",
      title: "관계 경계",
      analysisFocus: ["관계 정리"],
      expectedOutcome: ["소통 방식 정리"],
      score: 2.1,
      evidence: [
        { signal: "관계 정리 필요성", source: "recommendationEngine", contribution: 0.8 },
      ],
    },
  ],
};

function createValidAiOutput(): AnalysisRecommendationOutput {
  return {
    headline: "AI headline",
    summary: "AI summary",
    userMeaning: "AI userMeaning",
    cardReasons: {
      first: "AI first",
      second: "AI second",
      third: "AI third",
    },
    conversionGuidance: {
      whyNow: "AI whyNow",
      whatYouWillLearn: "AI whatYouWillLearn",
      riskOfDelay: "AI riskOfDelay",
    },
    recommendationItems: [
      { productId: "career-job-change", headline: "AI item 1", summary: "AI summary 1", userMeaning: "AI meaning 1" },
      { productId: "money-investment", headline: "AI item 2", summary: "AI summary 2", userMeaning: "AI meaning 2" },
      { productId: "relationship-boundary", headline: "AI item 3", summary: "AI summary 3", userMeaning: "AI meaning 3" },
    ],
  };
}

const fallback = buildDeterministicRecommendationExplanation(baseRecommendation);
assert(fallback.recommendationItems?.[0]?.productId === "career-job-change", "fallback should preserve the primary product id");
assert(fallback.recommendationItems?.[1]?.productId === "money-investment", "fallback should preserve the secondary product id");
assert(fallback.recommendationItems?.[2]?.productId === "relationship-boundary", "fallback should preserve the tertiary product id");
assert(fallback.conversionGuidance.whyNow.includes("커리어 전환"), "fallback briefing should name the current primary product");
assert(fallback.conversionGuidance.whyNow.includes("직업 전환 흐름"), "fallback briefing should use primary recommendation evidence");
assert(fallback.conversionGuidance.whatYouWillLearn.includes("직무 방향"), "fallback briefing should use primary product analysis focus");

const wealthRecommendation: AnalysisRecommendation = {
  ...baseRecommendation,
  primaryTheme: "money-leak-risk",
  headline: "재물 지출 흐름을 점검할 시점입니다.",
  summary: "지출 변동 신호가 강해 재물 흐름을 먼저 살펴볼 필요가 있습니다.",
  recommendedProductId: "money-leak-risk",
  recommendedReason: "지출 변동 신호가 강해 재물 흐름을 점검할 시점입니다.",
  recommendationContext: [
    {
      productId: "money-leak-risk",
      title: "돈이 새는 구조와 손실 위험",
      analysisFocus: ["지출 구조", "손실 위험"],
      expectedOutcome: ["지출 관리 기준"],
      score: 3.4,
      evidence: [
        { signal: "지출 변동 신호", source: "recommendationEngine", contribution: 1.3 },
      ],
    },
    ...baseRecommendation.recommendationContext!.slice(1),
  ],
};
const wealthFallback = buildDeterministicRecommendationExplanation(wealthRecommendation);
assert(wealthFallback.conversionGuidance.whyNow.includes("돈이 새는 구조와 손실 위험"), "fallback briefing should follow a different Profile's primary product");
assert(wealthFallback.conversionGuidance.whyNow.includes("지출 변동 신호"), "fallback briefing should follow a different Profile's primary evidence");
assert(!wealthFallback.conversionGuidance.whyNow.includes("직업 전환 흐름"), "fallback briefing must not reuse another recommendation's evidence");

const mergedValid = mergeAnalysisRecommendationOutput({
  recommendation: baseRecommendation,
  aiOutput: createValidAiOutput(),
});
assert(mergedValid.headline === "AI headline", "valid AI output should be used");
assert(mergedValid.recommendationItems?.[0]?.productId === "career-job-change", "valid AI output should preserve the canonical product id");

const invalidAiOutput: AnalysisRecommendationOutput = {
  headline: "",
  summary: "",
  userMeaning: "",
  cardReasons: {
    first: "",
    second: "",
    third: "",
  },
  conversionGuidance: {
    whyNow: "",
    whatYouWillLearn: "",
    riskOfDelay: "",
  },
  recommendationItems: [
    { productId: "wrong-id", headline: "bad", summary: "bad", userMeaning: "bad" },
    { productId: "money-investment", headline: "bad", summary: "bad", userMeaning: "bad" },
    { productId: "relationship-boundary", headline: "bad", summary: "bad", userMeaning: "bad" },
  ],
};
const mergedFallback = mergeAnalysisRecommendationOutput({
  recommendation: baseRecommendation,
  aiOutput: invalidAiOutput,
});
assert(mergedFallback.headline === fallback.headline, "invalid AI output should fall back to deterministic content");
assert(mergedFallback.recommendationItems?.[0]?.productId === "career-job-change", "invalid AI output should not change the canonical product id");

const partialAiOutput: AnalysisRecommendationOutput = {
  headline: "Partial AI headline",
  summary: "Partial AI summary",
  userMeaning: "Partial AI meaning",
  cardReasons: {
    first: "",
    second: "AI second",
    third: "",
  },
  conversionGuidance: {
    whyNow: "AI whyNow",
    whatYouWillLearn: "",
    riskOfDelay: "AI riskOfDelay",
  },
  recommendationItems: [
    { productId: "career-job-change", headline: "AI item 1", summary: "AI summary 1", userMeaning: "AI meaning 1" },
    { productId: "wrong-id", headline: "bad", summary: "bad", userMeaning: "bad" },
    { productId: "relationship-boundary", headline: "AI item 3", summary: "AI summary 3", userMeaning: "AI meaning 3" },
  ],
};
const mergedPartial = mergeAnalysisRecommendationOutput({
  recommendation: baseRecommendation,
  aiOutput: partialAiOutput,
});
assert(mergedPartial.cardReasons.first === fallback.cardReasons.first, "invalid first reason should fall back");
assert(mergedPartial.cardReasons.second === "AI second", "valid second reason should be preserved");
assert(mergedPartial.recommendationItems?.[1]?.productId === "money-investment", "invalid second recommendation item should fall back to the canonical product id");

const reorderedAiOutput: AnalysisRecommendationOutput = {
  headline: "AI headline",
  summary: "AI summary",
  userMeaning: "AI userMeaning",
  cardReasons: {
    first: "AI first",
    second: "AI second",
    third: "AI third",
  },
  conversionGuidance: {
    whyNow: "AI whyNow",
    whatYouWillLearn: "AI whatYouWillLearn",
    riskOfDelay: "AI riskOfDelay",
  },
  recommendationItems: [
    { productId: "relationship-boundary", headline: "AI item 3", summary: "AI summary 3", userMeaning: "AI meaning 3" },
    { productId: "career-job-change", headline: "AI item 1", summary: "AI summary 1", userMeaning: "AI meaning 1" },
    { productId: "money-investment", headline: "AI item 2", summary: "AI summary 2", userMeaning: "AI meaning 2" },
  ],
};
const mergedReordered = mergeAnalysisRecommendationOutput({
  recommendation: baseRecommendation,
  aiOutput: reorderedAiOutput,
});
assert(mergedReordered.recommendationItems?.[0]?.productId === "career-job-change", "reordered AI output should still map to the original ranking order");
assert(mergedReordered.recommendationItems?.[1]?.productId === "money-investment", "reordered AI output should still map to the original ranking order");
assert(mergedReordered.recommendationItems?.[2]?.productId === "relationship-boundary", "reordered AI output should still map to the original ranking order");

const invalidProductIdAiOutput: AnalysisRecommendationOutput = {
  headline: "AI headline",
  summary: "AI summary",
  userMeaning: "AI userMeaning",
  cardReasons: {
    first: "AI first",
    second: "AI second",
    third: "AI third",
  },
  conversionGuidance: {
    whyNow: "AI whyNow",
    whatYouWillLearn: "AI whatYouWillLearn",
    riskOfDelay: "AI riskOfDelay",
  },
  recommendationItems: [
    { productId: "unknown-product", headline: "Unknown", summary: "Unknown", userMeaning: "Unknown" },
    { productId: "career-job-change", headline: "AI item 1", summary: "AI summary 1", userMeaning: "AI meaning 1" },
    { productId: "love", headline: "Legacy alias", summary: "Legacy alias", userMeaning: "Legacy alias" },
  ],
};
const mergedUnknownProductIds = mergeAnalysisRecommendationOutput({
  recommendation: baseRecommendation,
  aiOutput: invalidProductIdAiOutput,
});
assert(mergedUnknownProductIds.recommendationItems?.[0]?.productId === "career-job-change", "unknown product ids should fall back to the canonical ranking order");
assert(mergedUnknownProductIds.recommendationItems?.[0]?.headline === "AI item 1", "the canonical product id should still use the valid AI content");
assert(mergedUnknownProductIds.recommendationItems?.[1]?.productId === "money-investment", "the second recommendation should remain in the original ranking order");
assert(mergedUnknownProductIds.recommendationItems?.[2]?.productId === "relationship-boundary", "the third recommendation should remain in the original ranking order");

console.log("explanation fallback regression passed");
