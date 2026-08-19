import { getLaunchProductIds, resolvePaidAnalysisLaunchSpecialization } from "../app/lib/paidAnalysisTopicConfig";
import { getPaidAnalysisEngine } from "../app/lib/paidAnalysisEngine";
import { getPeriodAnalysisStrategy } from "../app/lib/analysisPeriodStrategy";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }

const periodIds = ["daeun-current", "yearly-current", "monthly-next"] as const;
const launchIds = getLaunchProductIds();
assert(launchIds.length === 50, "Final launch catalog must contain exactly 50 products");
assert(new Set(launchIds).size === launchIds.length, "Final launch IDs must be unique");
for (const id of periodIds) {
  const strategy = getPeriodAnalysisStrategy(id);
  assert(Boolean(strategy), `${id} needs a period strategy`);
  assert(Boolean(getPremiumProduct(id)), `${id} needs a premium registry entry`);
  assert(getPaidAnalysisEngine(id) === "PERIOD", `${id} must map to PERIOD`);
  assert(resolvePaidAnalysisLaunchSpecialization(id).kind === "period", `${id} must resolve as a launch period product`);
  if (id !== "daeun-current") {
    assert(strategy!.focus.length === 4, `${id} needs exactly four period insight responsibilities`);
  }
  assert(strategy!.prohibitedPatterns.length > 0, `${id} needs temporal safety patterns`);
}
const daeun = getPeriodAnalysisStrategy("daeun-current")!;
const yearly = getPeriodAnalysisStrategy("yearly-current")!;
const monthly = getPeriodAnalysisStrategy("monthly-next")!;
assert(daeun.coreQuestion !== yearly.coreQuestion && yearly.coreQuestion !== monthly.coreQuestion && daeun.coreQuestion !== monthly.coreQuestion, "period customer questions must differ");
assert(daeun.timeGranularity === "daeun", "daeun owns long-cycle scale");
assert(yearly.timeGranularity === "year", "yearly owns annual scale");
assert(monthly.timeGranularity === "month", "monthly owns near-term scale");
assert(JSON.stringify(daeun.focus) !== JSON.stringify(yearly.focus) && JSON.stringify(yearly.focus) !== JSON.stringify(monthly.focus), "period mechanisms must differ");
assert(JSON.stringify(daeun.timelineSpec.labels) !== JSON.stringify(yearly.timelineSpec.labels) && JSON.stringify(yearly.timelineSpec.labels) !== JSON.stringify(monthly.timelineSpec.labels), "period review scales must differ");
for (const strategy of [daeun, yearly, monthly]) {
  assert(strategy.prohibitedPatterns.some((item) => item.includes("특정 사건") || item.includes("특정 날짜") || item.includes("특정 승진")), `${strategy.productId} must prohibit deterministic events`);
}
console.log("paid-analysis-v4-catalog-batch-6-regression passed ✓");