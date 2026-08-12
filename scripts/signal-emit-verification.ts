/**
 * Signal emit verification for 7 target signals + 50 Topic coverage.
 * Uses production-equivalent path: buildPremiumAnalysis → normalizeRecommendationSignals
 * with same inputs as buildTopicAwareRecommendations.
 */
import { getSaju } from "../app/lib/manse";
import { buildPremiumAnalysis } from "../app/lib/buildPremiumAnalysis";
import { normalizeRecommendationSignals } from "../app/lib/recommendationSignals";
import { TOPIC_PREMIUM_PRODUCTS, type RecommendationSignalKey } from "../app/lib/premiumProductRegistry";

const TARGET_SIGNALS = [
  "wealth_risk",
  "wealth_control",
  "relationship_conflict",
  "relationship_recovery",
  "business_control",
  "wealth_growth",
  "business_growth",
] as const satisfies readonly RecommendationSignalKey[];

function createSaju(birthDate: string, birthTime: string) {
  return getSaju(birthDate, birthTime, "양력", "평달", "남성");
}

function runSignalCheck(label: string, saju: ReturnType<typeof createSaju>) {
  const premium = buildPremiumAnalysis(saju);

  // Production-equivalent input (matches buildTopicAwareRecommendations after fix)
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

  const emitted = new Set(signals.signals.map((s) => s.key));

  console.log(`\n[${label}]`);
  console.log(`  level=${premium.strengthAnalysis.level}, strongest=[${premium.elementAnalysis.strongest.join(",")}], weakest=[${premium.elementAnalysis.weakest.join(",")}]`);
  console.log(`  fortuneFlow.relations types: [${(premium.fortuneFlowAnalysis?.relations ?? []).map((r) => r.type).join(",")}]`);
  console.log(`  emitted: ${[...emitted].join(", ")}`);

  TARGET_SIGNALS.forEach((sig) => {
    const hit = emitted.has(sig);
    const detail = signals.signals.find((s) => s.key === sig);
    console.log(`  ${sig}: ${hit ? "EMIT ✓" : "NOT EMIT"} ${hit ? `(score=${detail!.score}, source=${detail!.source})` : ""}`);
  });

  return emitted;
}

// Fixtures designed to trigger each signal type
// F1: 신약 + 충/형 fortune flow → wealth_risk, wealth_control, relationship_conflict
const f1 = createSaju("1985-08-15", "15:00");    // 신약, 금/수 weakest expected
// F2: 목/화 strongest → wealth_growth, business_growth
const f2 = createSaju("1993-03-20", "07:00");    // 신약 + 목 day
// F3: 기회 우세 + 합 in fortune flow → relationship_recovery
const f3 = createSaju("1990-01-01", "09:00");    // has 합 in fortune relations
// F4: 신강 + conflict fortune flow → business_control (needs conflict + 금/수 weak)
const f4 = createSaju("1986-03-15", "09:00");    // 신강
// F5: 신강 + 충/형/파/해 fortune flow → relationship_conflict
const f5 = createSaju("1977-06-20", "09:00");

const e1 = runSignalCheck("F1 (1985-08-15, 신약)", f1);
const e2 = runSignalCheck("F2 (1993-03-20, 목 day)", f2);
const e3 = runSignalCheck("F3 (1990-01-01, 기회우세+합)", f3);
const e4 = runSignalCheck("F4 (1986-03-15, 신강)", f4);
const e5 = runSignalCheck("F5 (1977-06-20, 신강)", f5);

// Aggregate: which signals are reachable across all fixtures?
const allEmitted = new Set([...e1, ...e2, ...e3, ...e4, ...e5]);

console.log("\n=== 7 SIGNAL COVERAGE SUMMARY ===");
TARGET_SIGNALS.forEach((sig) => {
  console.log(`  ${sig}: ${allEmitted.has(sig) ? "REACHABLE ✓" : "NEVER EMITS ✗"}`);
});

// 50 Topic coverage: which topics can become candidates with any fixture?
const topicProducts = TOPIC_PREMIUM_PRODUCTS.filter((p) => p.kind === "TOPIC");
const allFixtureEmitted = [e1, e2, e3, e4, e5];

const reachableTopics = topicProducts.filter((p) => {
  const profile = p.recommendationProfile;
  if (!profile) return false;
  return allFixtureEmitted.some((emitted) => {
    const required = profile.requiredSignals ?? [];
    const reqMet = required.every((r) => emitted.has(r as RecommendationSignalKey));
    if (!reqMet) return false;
    const score = Object.entries(profile.weights).reduce((acc, [key, weight]) => {
      return acc + (emitted.has(key as RecommendationSignalKey) ? weight : 0);
    }, 0);
    return score > 0;
  });
});

const unreachableTopics = topicProducts.filter((p) => !reachableTopics.find((r) => r.id === p.id));

console.log(`\n=== 50 TOPIC COVERAGE ===`);
console.log(`  Reachable: ${reachableTopics.length}/50`);
console.log(`  Unreachable: ${unreachableTopics.map((p) => p.id).join(", ")}`);
