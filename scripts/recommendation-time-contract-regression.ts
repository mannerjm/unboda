import { readFileSync } from "node:fs";
import { getSaju } from "../app/lib/manse";
import { buildPremiumAnalysis } from "../app/lib/buildPremiumAnalysis";
import { buildAnalysisProductRecommendations } from "../app/lib/analysisProductRecommendations";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }
function recommendationInput(saju: ReturnType<typeof getSaju>) {
  const premium = buildPremiumAnalysis(saju);
  return {
    ...premium,
    fortuneFlow: premium.fortuneFlowAnalysis,
    evaluationContext: saju.evaluationContext,
  };
}

const natal = "1990-01-15";
const dates = ["2026-08-15", "2026-09-15", "2027-01-15"] as const;
const results = dates.map((date) => buildAnalysisProductRecommendations(recommendationInput(getSaju(natal, "09:00", "양력", "평달", "남성", date))));
const repeat = buildAnalysisProductRecommendations(recommendationInput(getSaju(natal, "09:00", "양력", "평달", "남성", dates[0])));

assert(results[0].evaluationContext?.evaluationDate === dates[0], "August context is explicit");
assert(results[1].evaluationContext?.evaluationDate === dates[1], "September context is explicit");
assert(results[2].evaluationContext?.evaluationDate === dates[2], "January context is explicit");
assert(JSON.stringify(results[0].recommendations) === JSON.stringify(repeat.recommendations), "same context is deterministic");
assert(JSON.stringify(results[0].evaluationContext) !== JSON.stringify(results[1].evaluationContext), "month context changes");
assert(JSON.stringify(results[1].evaluationContext) !== JSON.stringify(results[2].evaluationContext), "year/month context changes");
assert(results.every((result) => result.recommendations.length === 3), "all contexts produce top three");
assert(results[0].recommendations.every((item, index, items) => index === 0 || items[index - 1].score >= item.score), "stable score ordering");
assert(JSON.stringify(getSaju(natal, "09:00", "양력", "평달", "남성", dates[0]).yearPillar) === JSON.stringify(getSaju(natal, "09:00", "양력", "평달", "남성", dates[1]).yearPillar), "natal pillars stay fixed");
const source = readFileSync("app/lib/analysisProductRecommendations.ts", "utf8");
assert(!/popularity|sales|conversion|bestseller/i.test(source), "recommendation scorer has no commercial ranking dependency");
assert(!source.includes("purchases") && !source.includes("entitlements"), "core scorer is purchase-independent");
assert(source.includes("localeCompare"), "equal scores use stable product tie-break");
console.log(JSON.stringify({ explicitEvaluationContext: true, sameContextDeterministic: true, monthContextChanged: true, yearContextChanged: true, fixedNatalStable: true, purchaseIndependent: true, noCommercialPriority: true, topThree: true }));
