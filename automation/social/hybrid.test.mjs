import test from "node:test";
import assert from "node:assert/strict";
import {assessHybridPlan} from "./hybrid.mjs";
const segments=Array.from({length:4},(_,i)=>({
 duration:i===0?10:7.5,source:i===0?"premium-ai":"original-mograph",
 ownedOrLicensed:true,licenseProof:"created original asset "+i,qualityStatus:"approved"
}));
const evaluate=(x={})=>assessHybridPlan({segments,allowPaid:true,
 plannedCredits:50,approvedCredits:50,...x});
test("realistic hybrid plan caps Runway to one 10s generation",()=>{
 const plan=evaluate();
 assert.equal(plan.ready,true);
 assert.equal(plan.premiumSeconds,10);
 assert.equal(plan.premiumCount,1);
 assert.equal(plan.originalMotionCount,3);
 assert.equal(plan.estimatedRunwayGenerationUsd,.5);
 assert.equal(plan.monthlyRunwayFor120OriginalsUsd,60);
 assert.equal(plan.independentVendorCallPerformed,false);
});
test("four expensive AI clips exceed cost controls",()=>{
 assert.ok(evaluate({segments:segments.map(s=>({...s,source:"premium-ai"}))})
  .reasons.includes("ONE_PAID_TEN_SECOND_CLIP_MAX"));
});
test("missing license/quality blocks",()=>{
 assert.ok(evaluate({segments:[{...segments[0],licenseProof:""},...segments.slice(1)]})
  .reasons.includes("RIGHTS_MISSING"));
 assert.ok(evaluate({segments:[{...segments[0],qualityStatus:"pending"},...segments.slice(1)]})
  .reasons.includes("MEDIA_QA_REQUIRED"));
});
test("budget and external opt-in required",()=>{
 assert.ok(evaluate({allowPaid:false}).reasons.includes("PAID_PROVIDER_NOT_ENABLED"));
 assert.ok(evaluate({approvedCredits:49}).reasons.includes("PREMIUM_BUDGET_UNVERIFIED"));
});
test("no unsupported or anomalous segments",()=>{
 assert.ok(evaluate({segments:[{...segments[0],source:"unknown"},...segments.slice(1)]})
  .reasons.includes("UNSUPPORTED_MEDIA_SOURCE"));
 assert.ok(evaluate({segments:[]}).reasons.includes("FOUR_SEGMENTS_REQUIRED"));
});
