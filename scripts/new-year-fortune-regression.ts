import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import { resolveLaunchPurchasableProduct } from "../app/lib/purchases/products";
import type { ProfileDto } from "../app/lib/profiles/types";
import { newYearTargetYear,NEW_YEAR_MONTHS,NEW_YEAR_DOMAINS,isNewYearSalePending,getNewYearArtwork } from "../app/lib/newYearFortune";
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
assert(!isNewYearSalePending("new-year-fortune",true));
assert(!isNewYearSalePending("annual-next"));
assert(!isNewYearSalePending("money-income-stability"));
for (const [file,guard] of [
 ["app/api/orders/route.ts","isNewYearSalePending(resolved.productId,"],
 ["app/lib/purchases/server.ts","isNewYearSalePending(resolved.productId,"],
 ["app/checkout/[productId]/page.tsx","isNewYearSalePending(canonicalProductId,"],
 ["app/components/CustomerFirstPremiumDetail.tsx","isNewYearSalePending(product.id, newYearCheckoutAllowed)"],
] as const) assert(readFileSync(file,"utf8").includes(guard), "seasonal sale must fail closed at "+file);
console.log("new-year-fortune-regression: PASS (season, price, profile-bound monthly facts, unknown hour, original teacher asset)");
const seasonalLanding = readFileSync("app/new-year/page.tsx", "utf8");
assert(seasonalLanding.includes("redirect(href)") && !seasonalLanding.includes("<Image"), "old URL must not render a second storefront");
assert.equal(getNewYearArtwork(2027).src,"/images/premium/2027-jeongmi-red-sheep.webp");
assert.equal(getNewYearArtwork(2028).src,"/images/premium/new-year-fortune.svg");
const detailPage=readFileSync("app/paid-analysis/[productId]/page.tsx","utf8");
assert(detailPage.includes("getActiveProfile(user.id)") && detailPage.includes("newYearYear={year}") && detailPage.includes("<AppShell activeProfileId={seasonalProfile?.id}>"));
const seasonalDetail=readFileSync("app/components/CustomerFirstPremiumDetail.tsx","utf8");
assert(seasonalDetail.includes("getNewYearArtwork(seasonalYear)") && seasonalDetail.includes("NEW_YEAR_MONTHS.map") && seasonalDetail.includes("NEW_YEAR_DOMAINS.map"));
const seasonalShell=readFileSync("app/components/AppShell.tsx","utf8");
assert(seasonalShell.includes('if (item.href === "/new-year") return profileId ? `/paid-analysis/new-year-fortune?profileId=') && seasonalShell.includes('pathname === "/paid-analysis/new-year-fortune"'));
const redSheep = readFileSync("public/images/premium/2027-jeongmi-red-sheep.webp");
assert.equal(redSheep.toString("ascii",0,4),"RIFF");
assert.equal(redSheep.toString("ascii",8,12),"WEBP");
assert.equal(redSheep.length,9006);

const seasonalDetailCleanup = readFileSync("app/components/CustomerFirstPremiumDetail.tsx", "utf8");
assert(!seasonalDetailCleanup.includes("어떤 운세를 볼 수 있나요?"), "remove redundant seasonal jump button");
assert(seasonalDetailCleanup.includes('seasonalYear && state === "not_purchased" && isNewYearSalePending(product.id, newYearCheckoutAllowed)') && seasonalDetailCleanup.includes('aria-labelledby="seasonal-value-heading"'), "keep sale status and full seasonal analysis description");

const seasonalOrders = readFileSync("app/api/orders/route.ts","utf8");
const seasonalPurchaseServer = readFileSync("app/lib/purchases/server.ts","utf8");
assert(seasonalOrders.includes("isNewYearCheckoutAllowed(user.id)") && seasonalPurchaseServer.includes('input.paymentProvider === "toss" && isNewYearCheckoutAllowed(input.userId)'), "seasonal order authorization must be enforced twice, with real provider selected");
assert(readFileSync("app/checkout/[productId]/page.tsx","utf8").includes("isNewYearCheckoutAllowed(user?.id)"), "checkout must use the authenticated server account");

// New-year-only readability and navigation; existing payment paths remain untouched.
const seasonalTeacher = readFileSync("app/components/NewYearTeacherCard.tsx","utf8");
assert(!seasonalTeacher.includes("태운(泰運)") && seasonalTeacher.includes("태운 선생님"));
const seasonalReport = readFileSync("app/paid-analysis/[productId]/PaidAnalysisV4Report.tsx","utf8");
assert(seasonalReport.includes('isNewYear && detail.periodAnalysis') && seasonalReport.includes('!isNewYear && detail.periodAnalysis'));
assert(seasonalReport.includes("대상 월의 운과 내 사주"));
const seasonalTimeline = readFileSync("app/paid-analysis/[productId]/PeriodTimelineSection.tsx","utf8");
assert(seasonalTimeline.includes("나의 새해 운세 한눈에 보기") && seasonalTimeline.includes('id="new-year-months"') && seasonalTimeline.includes('id="new-year-domains"'));
const seasonalPrompt = readFileSync("app/lib/analysisPeriodOutput.ts","utf8");
assert(seasonalPrompt.includes("신년운세 전용 고객 언어") && seasonalPrompt.includes("어려운 한자, 영어, 명리 전문 용어"));
assert(readFileSync("app/lib/phase9NextAnalysis.ts","utf8").includes('"new-year-fortune": ["annual-3years", "wealth", "relationship"]'));
assert(readFileSync("app/lib/aiConsultingPresentation.ts","utf8").includes("새해에 어떤 달을 가장 눈여겨보면 좋을까?"));

// Seasonal final layout: summary, key points, then complete domain and month content.
assert(seasonalReport.indexOf('seasonalView="summary"') < seasonalReport.indexOf("올해 기억할 세 가지"));
assert(seasonalReport.indexOf("올해 기억할 세 가지") < seasonalReport.indexOf('seasonalView="details"'));
assert(seasonalReport.includes("나의 총운") && seasonalReport.includes("태운 선생님의 한마디"));
assert(seasonalReport.includes("세 달마다 달라지는 나의 운세") && seasonalReport.includes("1~3월 · 한 해의 시작"));
assert(seasonalReport.includes("하면 좋은 것") && seasonalReport.includes("조심하면 좋은 것") && seasonalReport.includes("items-start"));
assert(seasonalTimeline.includes("DOMAIN_STYLES") && seasonalTimeline.includes("NewYearMonthCalendar") && seasonalTimeline.includes("aria-expanded") && seasonalTimeline.includes("aria-controls"));
assert(seasonalTimeline.includes("item.summary") && seasonalTimeline.includes("item.actions") && seasonalTimeline.includes("item.cautions"));

// Anonymous entry is presentation only: authenticated order guards remain separate.
assert(detailPage.includes("user ? isNewYearCheckoutAllowed(user.id) : isNewYearPublicSaleEnabled()"));
assert(readFileSync("app/checkout/[productId]/page.tsx","utf8").includes("user ? isNewYearCheckoutAllowed(user?.id) : isNewYearPublicSaleEnabled()"));
assert(!seasonalOrders.includes("isNewYearPublicSaleEnabled") && !seasonalPurchaseServer.includes("isNewYearPublicSaleEnabled"));
