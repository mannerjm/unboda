import {
  formatRecommendationEvidence,
  formatRecommendationPresentationText,
  getRecommendationProductDisplayName,
} from "../app/lib/recommendationDisplay";
import { buildAnalysisRecommendation } from "../app/lib/analysisRecommendationBuilder";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const knownSlug = getRecommendationProductDisplayName("relationship-conflict");
assert(knownSlug === "갈등 패턴과 회복 방식", "known product slug must use registry product title");
assert(getRecommendationProductDisplayName("unknown-product") === "추천 심층 분석", "unknown product must not fall back to its raw slug");
console.log("1. product display names use registry titles and safe fallback ✓");

const rawEvidence = "relationship_conflict:fortuneFlowAnalysis relationship_recovery:fortuneFlowAnalysis";
const safeEvidence = formatRecommendationEvidence(rawEvidence);
assert(!safeEvidence.includes("relationship_conflict") && !safeEvidence.includes("fortuneFlowAnalysis"), "known evidence keys must not leak");
assert(safeEvidence.includes("관계 조정") && safeEvidence.includes("관계 회복"), "known evidence must use Korean display labels");

const unknownEvidence = formatRecommendationEvidence("unknown_internal_key:privateSource");
assert(!unknownEvidence.includes("unknown_internal_key") && !unknownEvidence.includes("privateSource"), "unknown evidence keys must not leak");
assert(unknownEvidence.includes("현재 사주와 운의 흐름"), "unknown evidence must use a safe fallback");
console.log("2. known and unknown evidence keys are presentation-safe ✓");

const rawHeadline = formatRecommendationPresentationText("relationship-conflict 심층분석이 우선 추천됩니다.");
assert(rawHeadline.includes("갈등 패턴과 회복 방식") && !rawHeadline.includes("relationship-conflict"), "raw product slugs in text must be replaced with registry titles");
assert(!formatRecommendationPresentationText(rawEvidence).includes("relationship_conflict"), "raw key text must be sanitized at render time");
console.log("3. presentation formatter removes stale internal product and evidence tokens ✓");

const recommendation = buildAnalysisRecommendation({
  engineResult: {
    primary: {
      theme: "relationship-conflict",
      score: 1,
      confidence: 1,
      reasons: [rawEvidence],
    },
    secondary: [],
  },
});
assert(!recommendation.headline.includes("relationship-conflict"), "builder headline must not expose productId");
assert(!recommendation.summary.includes("relationship_conflict"), "builder summary must not expose evidence key");
assert(!recommendation.recommendedReason.includes("fortuneFlowAnalysis"), "builder reason must not expose source key");
console.log("4. deterministic recommendation builder emits safe presentation text ✓");

console.log("\nrecommendation-display-regression passed ✓");
