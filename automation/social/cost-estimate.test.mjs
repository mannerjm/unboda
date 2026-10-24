import test from "node:test";
import assert from "node:assert/strict";
import {estimateMonthlyMediaBudget} from "./cost-estimate.mjs";
test("120 original short videos with one 10s premium clip",()=>{
 const got=estimateMonthlyMediaBudget({});
 assert.equal(got.originals,120);
 assert.equal(got.runwaySeconds,1200);
 assert.equal(got.runwayCredits,6000);
 assert.equal(got.runwayUsd,60);
 assert.equal(got.ttsCreditsApprox,36000);
 assert.equal(got.priceReverificationRequired,true);
});
test("two premium clips per short doubles Runway generation cost",()=>{
 const got=estimateMonthlyMediaBudget({runwaySecondsPerShort:20});
 assert.equal(got.runwayUsd,120);
});
test("retries are part of cost budget, not free",()=>{
 const got=estimateMonthlyMediaBudget({reRenderMultiplier:1.5});
 assert.equal(got.runwayUsd,90);
 assert.equal(got.ttsCreditsApprox,54000);
});
test("out-of-range quote never enables billing",()=>{
 assert.throws(()=>estimateMonthlyMediaBudget({days:100}),/OUT_OF_RANGE/);
 assert.throws(()=>estimateMonthlyMediaBudget({shortsPerDay:-1}),/INVALID/);
});
