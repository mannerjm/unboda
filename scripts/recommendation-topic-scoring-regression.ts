import { buildPremiumAnalysis } from "../app/lib/buildPremiumAnalysis";
import { getSaju } from "../app/lib/manse";
import { buildFreeAnalysis } from "../app/lib/buildFreeAnalysis";
import { TOPIC_PREMIUM_PRODUCTS, type RecommendationSignalKey } from "../app/lib/premiumProductRegistry";
import { normalizeRecommendationSignals } from "../app/lib/recommendationSignals";
import { buildTopicAwareRecommendations, buildAnalysisProductRecommendations } from "../app/lib/analysisProductRecommendations";

function createSajuFixture(birthDate: string, birthTime: string) {
  return getSaju(
    birthDate,
    birthTime,
    "양력",
    "평달",
    "남성",
  );
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const topicProducts = TOPIC_PREMIUM_PRODUCTS.filter((product) => product.kind === "TOPIC");
assert(topicProducts.length === 50, "topic premium products should total 50");
assert(topicProducts.every((product) => Boolean(product.recommendationProfile)), "every topic should have a recommendation profile");

function runScenario(label: string, saju: ReturnType<typeof getSaju>) {
  const freeAnalysis = buildFreeAnalysis(saju);
  const premiumAnalysis = buildPremiumAnalysis(saju);
  const signals = normalizeRecommendationSignals({
    strengthLevel: premiumAnalysis.strengthAnalysis.level,
    strongestElements: premiumAnalysis.elementAnalysis.strongest,
    weakestElements: premiumAnalysis.elementAnalysis.weakest,
    flowLabel: premiumAnalysis.fortuneFlowAnalysis?.currentFlow,
    relationHighlights: premiumAnalysis.elementRelations.highlights.map((entry) => ({
      type: entry.type,
      strength: entry.strength,
    })),
  });

  const topicCandidates = topicProducts.filter(
    (product) => product.recommendationProfile,
  );

  const scored = topicCandidates
    .map((product) => {
      const profile = product.recommendationProfile!;
      const score = Object.entries(profile.weights).reduce((acc, [signal, weight]) => {
        const matched = signals.signals.find((entry) => entry.key === signal as RecommendationSignalKey);
        return acc + (matched ? matched.score * weight : 0);
      }, 0);
      return { productId: product.id, score };
    })
    .sort((a, b) => b.score - a.score);

  assert(scored.length > 0, `${label}: topic candidates were not created`);
  assert(scored[0].score >= 0, `${label}: top score should be non-negative`);
  assert(new Set(scored.map((entry) => entry.productId)).size === scored.length, `${label}: duplicated topic ids in scoring output`);

  const topicAware = buildTopicAwareRecommendations({
    strengthAnalysis: premiumAnalysis.strengthAnalysis,
    fortuneBrain: premiumAnalysis.fortuneBrain,
    elementRelations: premiumAnalysis.elementRelations,
    fortuneFlow: premiumAnalysis.fortuneFlowAnalysis,
  });

  assert(topicAware.recommendations.length <= 3, `${label}: topic-aware recommendations should be capped at 3`);
  assert(topicAware.recommendations.every((item) => item.evidence && item.evidence.length > 0), `${label}: topic-aware recommendations need evidence`);
  assert(topicAware.recommendations.every((item) => topicProducts.some((product) => product.id === item.productId)), `${label}: topic-aware recommendations should use canonical registry topics`);

  const fallback = buildAnalysisProductRecommendations({
    strengthAnalysis: premiumAnalysis.strengthAnalysis,
    fortuneBrain: premiumAnalysis.fortuneBrain,
    elementRelations: premiumAnalysis.elementRelations,
    fortuneFlow: premiumAnalysis.fortuneFlowAnalysis,
  });

  assert(fallback.recommendations.length > 0, `${label}: legacy fallback recommendations should exist`);

  console.log(`${label}: topicAware=${topicAware.recommendations.slice(0, 3).map((item) => item.productId).join(",")}`);
}

runScenario("career-change", createSajuFixture("1995-05-20", "09:00"));
runScenario("relationship-conflict", createSajuFixture("1990-01-01", "09:00"));
runScenario("wealth-risk", createSajuFixture("1988-10-10", "09:00"));
