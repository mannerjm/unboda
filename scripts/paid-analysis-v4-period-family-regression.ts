import { getLaunchProductIds, resolvePaidAnalysisLaunchSpecialization } from "../app/lib/paidAnalysisTopicConfig";
import { getPaidAnalysisEngine } from "../app/lib/paidAnalysisEngine";
import { getPeriodAnalysisStrategy } from "../app/lib/analysisPeriodStrategy";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }

const periodIds = ["monthly-current", "monthly-next", "yearly-current", "annual-next", "annual-3years", "daeun-current", "lifetime-overview"] as const;
const launchIds = getLaunchProductIds();
assert(launchIds.length === 54, "Launch catalog must contain 47 topic products and 7 period products");
assert(new Set(launchIds).size === launchIds.length, "Launch IDs must be unique");
assert(launchIds.filter((id) => resolvePaidAnalysisLaunchSpecialization(id).kind === "topic").length === 47, "Topic family must remain exactly 47 products");
assert(launchIds.filter((id) => resolvePaidAnalysisLaunchSpecialization(id).kind === "period").length === 7, "Period family must contain exactly 7 products");
assert(!launchIds.includes("annual-current"), "annual-current must be an alias, not a second commercial launch product");

const strategies = periodIds.map((id) => {
  const strategy = getPeriodAnalysisStrategy(id);
  assert(Boolean(strategy), `${id} needs a strategy`);
  assert(Boolean(getPremiumProduct(id)), `${id} needs a registry product`);
  assert(getPaidAnalysisEngine(id) === "PERIOD", `${id} must map to PERIOD`);
  assert(resolvePaidAnalysisLaunchSpecialization(id).kind === "period", `${id} must resolve as launch period`);
  assert(strategy!.focus.length >= 4, `${id} needs distinct insight responsibilities`);
  assert(strategy!.prohibitedPatterns.length > 0, `${id} needs temporal safety patterns`);
  return strategy!;
});

assert(getPremiumProduct("annual-current")?.id === "yearly-current", "annual-current compatibility lookup must resolve to yearly-current");
assert(getPeriodAnalysisStrategy("annual-current")?.productId === "yearly-current", "annual-current compatibility strategy must resolve to yearly-current");

const byId = Object.fromEntries(strategies.map((strategy) => [strategy.productId, strategy]));
const pairs = [
  ["monthly-current", "monthly-next"],
  ["yearly-current", "annual-next"],
  ["yearly-current", "annual-3years"],
  ["annual-3years", "daeun-current"],
  ["daeun-current", "lifetime-overview"],
] as const;
for (const [leftId, rightId] of pairs) {
  const left = byId[leftId]; const right = byId[rightId];
  assert(left.coreQuestion !== right.coreQuestion, `${leftId}/${rightId} need distinct customer decisions`);
  assert(left.timeGranularity !== right.timeGranularity || left.timelineSpec.rule !== right.timelineSpec.rule, `${leftId}/${rightId} need distinct period scale or review window`);
  assert(JSON.stringify(left.focus) !== JSON.stringify(right.focus), `${leftId}/${rightId} need distinct mechanisms`);
  assert(JSON.stringify(left.timelineSpec.labels) !== JSON.stringify(right.timelineSpec.labels), `${leftId}/${rightId} need distinct review windows`);
  assert(left.timelineSpec.rule !== right.timelineSpec.rule, `${leftId}/${rightId} need distinct action/review responsibility`);
}

for (const strategy of strategies) {
  assert(strategy.prohibitedPatterns.some((item) => /특정 (사건|날짜|승진|연도|시점)|사건.*확정|예측/.test(item)), `${strategy.productId} must prohibit deterministic events`);
}
console.log("paid-analysis-v4-period-family-regression passed ✓");