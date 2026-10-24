import test from "node:test";
import assert from "node:assert/strict";
import {CADENCE_HOURS,SAFE_BRAND_POSTS_PER_30D,contentId,shouldGenerateSlot,evaluatePublisherGuard} from "./cadence.mjs";

const now=Date.parse("2026-10-24T17:00:00+09:00");
const post={title:"사주를 읽는 네 가지 단서",script:"태어난 해와 달, 날과 시간을 함께 살펴보는 사주의 구조를 정리합니다. 이 해석은 참고용이며 나의 생활과 결정을 대신할 수 없습니다.",caption:"사주 기초를 쉽게 공부해요. https://unboda.kr",mediaHash:"fixture-sha256",originalOrLicensed:true,factChecked:true,topicKey:"four-pillars-basics",durationSeconds:30,originalNarration:true};
const base={kind:"text-image",post,history:[],brandUsage:{posted:100,queued:10},providerUsage:{posted:1,queued:0},network:"instagram",lockAcquired:true,verifiedMedia:true,accountQuotaConfirmed:true};
const plan=(x={})=>evaluatePublisherGuard({...base,...x,post:{...post,...(x.post??{})}});
test("requested 2h, 4h, 6h intervals",()=>{
 assert.deepEqual(CADENCE_HOURS,{"text-image":2,"short-video":4,"long-video":6});
 for(const [kind,hours] of Object.entries(CADENCE_HOURS)){
  assert.equal(shouldGenerateSlot({kind,now,lastSlotAt:now-hours*3600_000+1}),false);
  assert.equal(shouldGenerateSlot({kind,now,lastSlotAt:now-hours*3600_000}),true);
 }
});
test("guard does not publish without durable uniqueness ledger",()=>{
 assert.ok(plan({history:null}).reasons.includes("HISTORY_NOT_VERIFIED"));
 assert.ok(plan({lockAcquired:false}).reasons.includes("IDEMPOTENCY_LOCK_MISSING"));
});
test("guard permits fully verified illustrative mock",()=>assert.equal(plan().ready,true));
test("conservative monthly brand limit",()=>{
 assert.equal(SAFE_BRAND_POSTS_PER_30D,500);
 assert.ok(plan({brandUsage:{posted:475,queued:25}}).reasons.includes("BRAND_MONTHLY_SAFETY_CAP"));
 assert.ok(plan({brandUsage:null}).reasons.includes("BRAND_USAGE_NOT_VERIFIED"));
});
test("provider quota must be verified, including unknown plan",()=>{
 assert.ok(plan({accountQuotaConfirmed:false}).reasons.includes("NETWORK_QUOTA_NOT_VERIFIED"));
 assert.ok(plan({network:"youtube",providerUsage:{posted:8,queued:0}}).reasons.includes("NETWORK_DAILY_SAFETY_CAP"));
});
test("real uploaded media proof required",()=>{
 assert.ok(plan({verifiedMedia:false}).reasons.includes("MEDIA_NOT_VERIFIED"));
 assert.ok(plan({post:{mediaHash:null}}).reasons.includes("MEDIA_NOT_VERIFIED"));
});
test("block reused topic and exact creative",()=>{
 assert.ok(plan({history:[{topicKey:post.topicKey,script:"else"}]}).reasons.includes("REUSED_CREATIVE_OR_TOPIC"));
 assert.ok(plan({history:[{fingerprint:contentId(post)}]}).reasons.includes("REUSED_CREATIVE_OR_TOPIC"));
});
test("block high script similarity across editorial history",()=>{
 assert.ok(plan({history:[{topicKey:"other",script:post.script}]}).reasons.includes("REPETITIVE_SCRIPT"));
});
test("reject photo-only reels and stretched long videos",()=>{
 assert.ok(plan({kind:"short-video",post:{durationSeconds:0}}).reasons.includes("SHORT_DURATION_INVALID"));
 assert.ok(plan({kind:"long-video",post:{durationSeconds:30}}).reasons.includes("LONG_VIDEO_NOT_READY"));
 assert.ok(plan({kind:"long-video",post:{durationSeconds:360,originalNarration:false}}).reasons.includes("LONG_VIDEO_NOT_READY"));
 assert.equal(plan({kind:"long-video",post:{durationSeconds:360,originalNarration:true}}).ready,true);
});
test("automated editorial review must genuinely pass",()=>{
 assert.ok(plan({post:{factChecked:false}}).reasons.includes("EDITORIAL_QA_PENDING"));
 assert.ok(plan({post:{originalOrLicensed:false}}).reasons.includes("ORIGINALITY_NOT_PROVEN"));
});
