import assert from "node:assert/strict";
import { newYearTargetYear,NEW_YEAR_MONTHS,NEW_YEAR_DOMAINS } from "../app/lib/newYearFortune";
import { buildReferencePeriodSnapshot } from "../app/lib/analysisReferencePeriod";
import { getPeriodAnalysisStrategy } from "../app/lib/analysisPeriodStrategy";
import { computeAnalysisEditionKey } from "../app/lib/analysisEditionKey";
import { getProductPricing } from "../app/lib/productPricing";
for(const [anchorDate,year] of [["2026-10-31",2026],["2026-11-01",2027],["2026-12-31",2027],["2027-01-01",2027],["2027-10-31",2027],["2027-11-01",2028]] as const){
 const snapshot=buildReferencePeriodSnapshot({productId:"new-year-fortune",anchorDate});
 assert.equal(snapshot?.referenceYear,year);
 assert.equal(snapshot?.coverage?.from,`${year}-01-01`);
 assert.equal(snapshot?.coverage?.to,`${year}-12-31`);
 assert.equal(computeAnalysisEditionKey({productId:"new-year-fortune",anchorDate}),`TARGET_YEAR:${year}`);
}
assert.equal(buildReferencePeriodSnapshot({productId:"annual-next",anchorDate:"2027-01-01"})?.referenceYear,2028);
assert.equal(newYearTargetYear({year:2027,month:1}),2027);
assert.equal(getProductPricing("new-year-fortune").amount,29900);
assert.deepEqual(getPeriodAnalysisStrategy("new-year-fortune")?.timelineSpec.labels,NEW_YEAR_MONTHS);
assert.equal(NEW_YEAR_MONTHS.length,12);
assert.equal(NEW_YEAR_DOMAINS.length,8);
console.log("new-year-fortune-regression: PASS");