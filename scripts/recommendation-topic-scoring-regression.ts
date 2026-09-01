import { buildPremiumAnalysis } from "../app/lib/buildPremiumAnalysis";
import { getSaju } from "../app/lib/manse";
import { buildFreeAnalysis } from "../app/lib/buildFreeAnalysis";
import {
  PREMIUM_PRODUCT_LOOKUP,
  TOPIC_PREMIUM_PRODUCTS,
  type RecommendationSignalKey,
} from "../app/lib/premiumProductRegistry";
import { normalizeRecommendationSignals } from "../app/lib/recommendationSignals";
import { buildTopicAwareRecommendations, buildAnalysisProductRecommendations } from "../app/lib/analysisProductRecommendations";
import { resolveLaunchPurchasableProduct } from "../app/lib/purchases/products";

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
const profiledTopics = topicProducts.filter((product) => product.recommendationProfile);
assert(profiledTopics.length > 0, "recommendation profiles must exist");
for (const product of profiledTopics) {
  assert(PREMIUM_PRODUCT_LOOKUP[product.id]?.id === product.id, `${product.id}: profile product must be canonical`);
  assert(
    Object.keys(product.recommendationProfile!.weights).every((key) =>
      ["career_change", "career_stability", "career_independence", "wealth_growth", "wealth_risk", "wealth_control", "relationship_new", "relationship_commitment", "relationship_conflict", "relationship_recovery", "social_support", "health_recovery", "health_stress", "business_growth", "business_control", "growth_learning", "growth_transition"].includes(key),
    ),
    `${product.id}: profile has an unsupported signal key`,
  );
}

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
    fortuneFlowRelations: premiumAnalysis.fortuneFlowAnalysis?.relations ?? [],
  });

  const topicCandidates = profiledTopics;

  const scored = topicCandidates
    .map((product) => {
      const profile = product.recommendationProfile!;
      const score = Object.entries(profile.weights).reduce((acc, [signal, weight]) => {
        const matched = signals.signals.find((entry) => entry.key === signal as RecommendationSignalKey);
        return acc + (matched ? matched.score * weight : 0);
      }, 0);
      return { productId: product.id, score };
    })
    .sort((a, b) => b.score - a.score || a.productId.localeCompare(b.productId));

  assert(scored.length > 0, `${label}: topic candidates were not created`);
  assert(scored[0].score >= 0, `${label}: top score should be non-negative`);
  assert(new Set(scored.map((entry) => entry.productId)).size === scored.length, `${label}: duplicated topic ids in scoring output`);

  const topicAware = buildTopicAwareRecommendations({
    strengthAnalysis: premiumAnalysis.strengthAnalysis,
    fortuneBrain: premiumAnalysis.fortuneBrain,
    elementRelations: premiumAnalysis.elementRelations,
    fortuneFlow: premiumAnalysis.fortuneFlowAnalysis,
    elementAnalysis: premiumAnalysis.elementAnalysis,
  });

  assert(topicAware.recommendations.length <= 3, `${label}: topic-aware recommendations should be capped at 3`);
  assert(topicAware.recommendations.every((item) => item.evidence && item.evidence.length > 0), `${label}: topic-aware recommendations need evidence`);
  assert(topicAware.recommendations.every((item) => topicProducts.some((product) => product.id === item.productId)), `${label}: topic-aware recommendations should use canonical registry topics`);
  assert(topicAware.recommendations.every((item) => resolveLaunchPurchasableProduct(item.productId).ok), `${label}: topic-aware recommendations must be launch-authorized`);
  assert(new Set(topicAware.recommendations.map((item) => item.productId)).size === topicAware.recommendations.length, `${label}: topic-aware recommendations must be unique`);

  const fallback = buildAnalysisProductRecommendations({
    strengthAnalysis: premiumAnalysis.strengthAnalysis,
    fortuneBrain: premiumAnalysis.fortuneBrain,
    elementRelations: premiumAnalysis.elementRelations,
    fortuneFlow: premiumAnalysis.fortuneFlowAnalysis,
    elementAnalysis: premiumAnalysis.elementAnalysis,
  });

  assert(fallback.recommendations.length > 0, `${label}: legacy fallback recommendations should exist`);
  assert(fallback.recommendations.every((item) => resolveLaunchPurchasableProduct(item.productId).ok), `${label}: fallback recommendations must be launch-authorized`);
  assert(new Set(fallback.recommendations.map((item) => item.productId)).size === fallback.recommendations.length, `${label}: fallback recommendations must be unique`);
  const repeated = buildTopicAwareRecommendations({
    strengthAnalysis: premiumAnalysis.strengthAnalysis,
    fortuneBrain: premiumAnalysis.fortuneBrain,
    elementRelations: premiumAnalysis.elementRelations,
    fortuneFlow: premiumAnalysis.fortuneFlowAnalysis,
    elementAnalysis: premiumAnalysis.elementAnalysis,
  });
  assert(repeated.recommendations.map((item) => item.productId).join(",") === topicAware.recommendations.map((item) => item.productId).join(","), `${label}: topic-aware ranking must be deterministic`);

  console.log(`${label}: topicAware=${topicAware.recommendations.slice(0, 3).map((item) => item.productId).join(",")}`);
}

runScenario("career-change", createSajuFixture("1995-05-20", "09:00"));
runScenario("relationship-conflict", createSajuFixture("1990-01-01", "09:00"));
runScenario("wealth-risk", createSajuFixture("1988-10-10", "09:00"));
