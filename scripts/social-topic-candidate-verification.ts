/**
 * Verification: social-helper, social-friendship, social-family, social-workplace
 * can become recommendation candidates after social_support gate removal.
 */
import { getSaju } from "../app/lib/manse";
import { buildPremiumAnalysis } from "../app/lib/buildPremiumAnalysis";
import { normalizeRecommendationSignals } from "../app/lib/recommendationSignals";
import { TOPIC_PREMIUM_PRODUCTS, type RecommendationSignalKey } from "../app/lib/premiumProductRegistry";

const SOCIAL_TOPICS = ["social-helper", "social-friendship", "social-family", "social-workplace"] as const;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function createSaju(birthDate: string, birthTime: string) {
  return getSaju(birthDate, birthTime, "양력", "평달", "남성");
}

function checkCandidateWithFullInput(label: string, saju: ReturnType<typeof createSaju>) {
  const premium = buildPremiumAnalysis(saju);

  // Use full element arrays matching the production path
  const signals = normalizeRecommendationSignals({
    strengthLevel: premium.strengthAnalysis.level,
    strongestElements: premium.elementAnalysis.strongest,
    weakestElements: premium.elementAnalysis.weakest,
    flowLabel: premium.fortuneFlowAnalysis?.currentFlow,
    relationHighlights: premium.elementRelations.highlights.map((e) => ({
      type: e.type,
      strength: e.strength,
    })),
    fortuneFlowRelations: premium.fortuneFlowAnalysis?.relations ?? [],
  });

  const emittedKeys = signals.signals.map((s) => s.key);

  const topicProducts = TOPIC_PREMIUM_PRODUCTS.filter((p) => p.kind === "TOPIC");

  const scoredTopics = topicProducts
    .filter((p) => p.recommendationProfile)
    .map((p) => {
      const profile = p.recommendationProfile!;

      // Check requiredSignals gate
      const requiredMet =
        !profile.requiredSignals ||
        profile.requiredSignals.every((req) => emittedKeys.includes(req as RecommendationSignalKey));

      if (!requiredMet) return { id: p.id, score: 0, blocked: true };

      const score = Object.entries(profile.weights).reduce((acc, [key, weight]) => {
        const matched = signals.signals.find((s) => s.key === (key as RecommendationSignalKey));
        return acc + (matched ? matched.score * weight : 0);
      }, 0);

      return { id: p.id, score, blocked: false };
    });

  const candidateIds = scoredTopics
    .filter((t) => !t.blocked && t.score > 0)
    .map((t) => t.id);

  const blockedIds = scoredTopics
    .filter((t) => t.blocked)
    .map((t) => t.id);

  console.log(`\n[${label}]`);
  console.log(`  strengthLevel: ${premium.strengthAnalysis.level}`);
  console.log(`  emittedSignals: ${emittedKeys.join(", ")}`);
  console.log(`  candidates (${candidateIds.length}): ${candidateIds.join(", ")}`);
  console.log(`  blocked (${blockedIds.length}): ${blockedIds.join(", ")}`);

  const socialResults = SOCIAL_TOPICS.map((id) => {
    const entry = scoredTopics.find((t) => t.id === id);
    return {
      id,
      candidate: entry ? !entry.blocked && entry.score > 0 : false,
      blocked: entry?.blocked ?? true,
      score: entry?.score ?? 0,
    };
  });

  socialResults.forEach((r) => {
    const status = r.candidate ? "CANDIDATE ✓" : r.blocked ? "BLOCKED ✗" : "score=0 ✗";
    console.log(`  ${r.id}: ${status} (score=${r.score.toFixed(2)})`);
  });

  return socialResults;
}

// Fixture A: 신약 → triggers health_recovery, relationship_new (생조 highlight)
const fixtureA = createSaju("1985-08-15", "15:00");

// Fixture B: 신약 + 목/화 day element → relationship_new, wealth_growth
const fixtureB = createSaju("1993-03-20", "07:00");

// Fixture C: 중화, 기회 우세 → career_change, relationship_new
const fixtureC = createSaju("1990-01-01", "09:00");

// Fixture D: 신강 → triggers relationship_commitment, career_stability, growth_learning
// confirmed: 1986-03-15 → 신강
const fixtureD = createSaju("1986-03-15", "09:00");

// Fixture E: 신강 with relationship_new — 1977-06-20
const fixtureE = createSaju("1977-06-20", "09:00");

const resultsA = checkCandidateWithFullInput("Fixture-A (1985-08-15 15:00, 신약 expected)", fixtureA);
const resultsB = checkCandidateWithFullInput("Fixture-B (1993-03-20 07:00, 신약 expected)", fixtureB);
const resultsC = checkCandidateWithFullInput("Fixture-C (1990-01-01 09:00, 중화 expected)", fixtureC);
const resultsD = checkCandidateWithFullInput("Fixture-D (1986-03-15 09:00, 신강 expected)", fixtureD);
const resultsE = checkCandidateWithFullInput("Fixture-E (1977-06-20 09:00, 신강 expected)", fixtureE);

console.log("\n=== SOCIAL TOPIC CANDIDATE SUMMARY ===");

const allResults = [
  ...resultsA.map((r) => ({ ...r, fixture: "A" })),
  ...resultsB.map((r) => ({ ...r, fixture: "B" })),
  ...resultsC.map((r) => ({ ...r, fixture: "C" })),
  ...resultsD.map((r) => ({ ...r, fixture: "D" })),
  ...resultsE.map((r) => ({ ...r, fixture: "E" })),
];

for (const topicId of SOCIAL_TOPICS) {
  const perFixture = allResults.filter((r) => r.id === topicId);
  const anyCandidate = perFixture.some((r) => r.candidate);
  console.log(`  ${topicId}: ${anyCandidate ? "REACHABLE ✓" : "NEVER CANDIDATE ✗"}`);
}

// Assert all 4 social topics are reachable across at least one fixture
for (const topicId of SOCIAL_TOPICS) {
  const perFixture = allResults.filter((r) => r.id === topicId);
  assert(
    perFixture.some((r) => r.candidate),
    `${topicId} is never a candidate in any fixture — social_support gate may still be blocking`,
  );
}

console.log("\nAll social topic candidate assertions passed ✓");

// Also verify social_support is NOT listed as a required gate for these 4 topics
const registry = TOPIC_PREMIUM_PRODUCTS.filter((p) => SOCIAL_TOPICS.includes(p.id as typeof SOCIAL_TOPICS[number]));
for (const p of registry) {
  const required = p.recommendationProfile?.requiredSignals ?? [];
  assert(
    !required.includes("social_support"),
    `${p.id} still has social_support in requiredSignals`,
  );
}
console.log("social_support is no longer a required gate for any of the 4 social topics ✓");
