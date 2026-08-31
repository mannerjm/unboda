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
const sameMonthDifferentDay = buildAnalysisProductRecommendations(recommendationInput(getSaju(natal, "09:00", "양력", "평달", "남성", "2026-08-28")));

assert(results[0].evaluationContext?.evaluationDate === dates[0], "August context is explicit");
assert(results[1].evaluationContext?.evaluationDate === dates[1], "September context is explicit");
assert(results[2].evaluationContext?.evaluationDate === dates[2], "January context is explicit");
assert(JSON.stringify(results[0].recommendations) === JSON.stringify(repeat.recommendations), "same context is deterministic");
assert(JSON.stringify(results[0].evaluationContext) !== JSON.stringify(results[1].evaluationContext), "month context changes");
assert(JSON.stringify(results[1].evaluationContext) !== JSON.stringify(results[2].evaluationContext), "year/month context changes");
assert(results.every((result) => result.recommendations.length === 3), "all contexts produce top three");
assert(results[0].recommendations.every((item, index, items) => index === 0 || items[index - 1].score >= item.score), "stable score ordering");
assert(sameMonthDifferentDay.evaluationContext?.evaluationMonth === results[0].evaluationContext?.evaluationMonth, "same calendar month, different day, same evaluation month");
assert(sameMonthDifferentDay.recommendations.every((item, index, items) => index === 0 || items[index - 1].score >= item.score), "same-month different-day ordering remains deterministic");

// Natal structure must stay fixed across every evaluation-context boundary above
// (month change Aug->Sep, year change 2026->2027, and the Dec31/Jan1 boundary below).
// Only current-period selection (seun/daeun-current/fortuneFlow) may change.
const dec31 = getSaju(natal, "09:00", "양력", "평달", "남성", "2026-12-31");
const jan1 = getSaju(natal, "09:00", "양력", "평달", "남성", "2027-01-01");
assert(dec31.evaluationContext.evaluationYear === 2026 && jan1.evaluationContext.evaluationYear === 2027, "Dec31/Jan1 evaluation year boundary changes correctly");

const sajuByDate = dates.map((date) => getSaju(natal, "09:00", "양력", "평달", "남성", date));
for (const other of [sajuByDate[1], sajuByDate[2], dec31, jan1]) {
  assert(JSON.stringify(other.yearPillar) === JSON.stringify(sajuByDate[0].yearPillar), "year pillar immutable across evaluation contexts");
  assert(JSON.stringify(other.monthPillar) === JSON.stringify(sajuByDate[0].monthPillar), "month pillar immutable across evaluation contexts");
  assert(JSON.stringify(other.dayPillar) === JSON.stringify(sajuByDate[0].dayPillar), "day pillar immutable across evaluation contexts");
  assert(JSON.stringify(other.hourPillar) === JSON.stringify(sajuByDate[0].hourPillar), "hour pillar immutable across evaluation contexts");
  assert(JSON.stringify(other.elementAnalysis) === JSON.stringify(sajuByDate[0].elementAnalysis), "element distribution immutable across evaluation contexts");
  assert(JSON.stringify(other.strengthAnalysis) === JSON.stringify(sajuByDate[0].strengthAnalysis), "strength classification immutable across evaluation contexts");
  assert(JSON.stringify(other.daeunAnalysis) === JSON.stringify(sajuByDate[0].daeunAnalysis), "natal daeun sequence immutable across evaluation contexts");
}
assert(JSON.stringify(getSaju(natal, "09:00", "양력", "평달", "남성", dates[0]).yearPillar) === JSON.stringify(getSaju(natal, "09:00", "양력", "평달", "남성", dates[1]).yearPillar), "natal pillars stay fixed");
const source = readFileSync("app/lib/analysisProductRecommendations.ts", "utf8");
assert(!/popularity|sales|conversion|bestseller/i.test(source), "recommendation scorer has no commercial ranking dependency");
assert(!source.includes("purchases") && !source.includes("entitlements"), "core scorer is purchase-independent");
assert(source.includes("localeCompare"), "equal scores use stable product tie-break");
console.log(JSON.stringify({ explicitEvaluationContext: true, sameContextDeterministic: true, monthContextChanged: true, yearContextChanged: true, sameMonthDifferentDay: true, yearBoundaryDec31Jan1: true, fixedNatalStable: true, purchaseIndependent: true, noCommercialPriority: true, topThree: true }));
