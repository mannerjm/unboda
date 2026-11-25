import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import { resolveLaunchPurchasableProduct } from "../app/lib/purchases/products";
import type { ProfileDto } from "../app/lib/profiles/types";
import { newYearTargetYear,NEW_YEAR_MONTHS,NEW_YEAR_DOMAINS,isNewYearSalePending } from "../app/lib/newYearFortune";
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
const purchasable = resolveLaunchPurchasableProduct("new-year-fortune");
assert(purchasable.ok);
assert.equal(purchasable.amount,29900);
assert.equal(purchasable.productId,"new-year-fortune");

const base: ProfileDto = {
 id:"11111111-1111-4111-8111-111111111111", label:"테스트 A", relationshipType:"self",
 birthDate:"1995-05-20", birthTime:"09:00", birthTimeKnown:true, gender:"남성",
 calendarType:"양력", isLeapMonth:false, createdAt:"2026-01-01T00:00:00.000Z", updatedAt:"2026-01-01T00:00:00.000Z"
};
const a = buildPaidAnalysisInputFromProfile(base,"new-year-fortune","2026-11-25");
const b = buildPaidAnalysisInputFromProfile({...base,id:"22222222-2222-4222-8222-222222222222",label:"테스트 B",relationshipType:"spouse",birthDate:"1995-05-21",birthTime:"12:00",birthTimeKnown:false},"new-year-fortune","2026-11-25");
type MonthlyFact = {year:number;month:number;samples:{day:number;yearPillar:string;monthPillar:string;natalDayStemRelation:string}[]};
function monthFacts(input:ReturnType<typeof buildPaidAnalysisInputFromProfile>):MonthlyFact[]{
 assert.equal(input.referencePeriod?.referenceYear,2027);
 assert.equal(input.evidenceFacts?.seun?.year,2027);
 assert(input.v4Context?.periodTiming);
 const facts = JSON.parse(input.v4Context.periodTiming).targetMonthFacts as MonthlyFact[];
 assert.equal(facts.length,12);
 for(let i=0;i<12;i++){
   const fact=facts[i];
   assert.equal(fact.year,2027);
   assert.equal(fact.month,i+1);
   assert.deepEqual(fact.samples.map(sample=>sample.day),[1,15,new Date(Date.UTC(2027,i+1,0)).getUTCDate()]);
   assert(fact.samples.every(sample=>sample.yearPillar.length===2&&sample.monthPillar.length===2&&sample.natalDayStemRelation.length>0));
 }
 return facts;
}
const monthsA=monthFacts(a);
const monthsB=monthFacts(b);
assert.notDeepEqual(monthsA.map(m=>m.samples.map(s=>s.natalDayStemRelation)),monthsB.map(m=>m.samples.map(s=>s.natalDayStemRelation)),"different natal day stems must affect the monthly interpretation inputs");
assert.equal(JSON.parse(b.birthData).birthTimeKnown,false);
assert(!JSON.parse(b.birthData).hourPillarHanja,"unknown birth time must never generate an hour pillar");

const landing=readFileSync("app/new-year/page.tsx","utf8");
assert(landing.includes("getUserProfile(profileId, user.id)")&&landing.includes("getActiveProfile(user.id)")&&landing.includes("encodeURIComponent(profile.id)"),"seasonal product must use server-verified selected profiles");
const asset=readFileSync("public/teachers/taeun-full-v4.webp");
assert.equal(asset.toString("ascii",0,4),"RIFF");
assert.equal(asset.toString("ascii",8,12),"WEBP");
assert(asset.length>4000,"Taeun portrait must be the actual local image");
assert(isNewYearSalePending("new-year-fortune"));
assert(!isNewYearSalePending("annual-next"));
assert(!isNewYearSalePending("money-income-stability"));
for (const [file,guard] of [
 ["app/api/orders/route.ts","isNewYearSalePending(resolved.productId)"],
 ["app/lib/purchases/server.ts","isNewYearSalePending(resolved.productId)"],
 ["app/checkout/[productId]/page.tsx","isNewYearSalePending(canonicalProductId)"],
 ["app/components/CustomerFirstPremiumDetail.tsx","isNewYearSalePending(product.id)"],
] as const) assert(readFileSync(file,"utf8").includes(guard), "seasonal sale must fail closed at "+file);
console.log("new-year-fortune-regression: PASS (season, price, profile-bound monthly facts, unknown hour, original teacher asset)");
const seasonalLanding = readFileSync("app/new-year/page.tsx", "utf8");
assert(seasonalLanding.includes('year === 2027 ? "/images/premium/2027-jeongmi-red-sheep.webp" : "/images/premium/new-year-fortune.svg"'), "red sheep artwork must apply to 2027 only");
const redSheep = readFileSync("public/images/premium/2027-jeongmi-red-sheep.webp");
assert.equal(redSheep.toString("ascii",0,4),"RIFF");
assert.equal(redSheep.toString("ascii",8,12),"WEBP");
assert.equal(redSheep.length,9006);
