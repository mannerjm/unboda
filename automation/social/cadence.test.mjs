import test from "node:test";
import assert from "node:assert/strict";
import {CADENCE_HOURS,SAFE_BRAND_POSTS_PER_30D,contentId,
 shouldGenerateSlot,evaluatePublisherGuard,selectChannels,CHANNELS} from "./cadence.mjs";

const now=Date.parse("2026-10-24T17:00:00+09:00");
const post={title:"사주를 읽는 네 가지 단서",
 script:"태어난 해와 달, 날과 시간을 함께 살펴보는 사주의 구조를 정리합니다. 이 해석은 참고용이며 일상적 결정을 대신할 수 없습니다.",
 caption:"사주 기초를 쉽게 공부해요. https://unboda.kr",mediaHash:"fixture-sha256",
 originalOrLicensed:true,factChecked:true,topicKey:"four-pillars-basics",
 durationSeconds:30,originalNarration:true};
const base={kind:"text-image",post,history:[],brandUsage:{posted:100,queued:10},
 providerUsage:{posted:1,queued:0},network:"instagram",
 lockAcquired:true,verifiedMedia:true,accountQuotaConfirmed:true,verifiedEditorialHistory:true};
const plan=(x={})=>evaluatePublisherGuard({...base,...x,post:{...post,...(x.post??{})}});
test("owner's final 3h image, 6h shorts; no long videos",()=>{
 assert.deepEqual(CADENCE_HOURS,{"text-image":3,"short-video":6});
 for(const [kind,hours] of Object.entries(CADENCE_HOURS)){
  assert.equal(shouldGenerateSlot({kind,now,lastSlotAt:now-hours*3600000+1}),false);
  assert.equal(shouldGenerateSlot({kind,now,lastSlotAt:now-hours*3600000}),true);
 }
 assert.throws(()=>shouldGenerateSlot({kind:"long-video",now}),/DISABLED/);
});
test("fully verified illustrative mock passes",()=>assert.equal(plan().ready,true));
test("must hold durable ledger, lock, media and fact QA",()=>{
 assert.ok(plan({history:null}).reasons.includes("HISTORY_NOT_VERIFIED"));
 assert.ok(plan({verifiedEditorialHistory:false}).reasons.includes("HISTORY_NOT_VERIFIED"));
 assert.ok(plan({lockAcquired:false}).reasons.includes("IDEMPOTENCY_LOCK_MISSING"));
 assert.ok(plan({verifiedMedia:false}).reasons.includes("MEDIA_NOT_VERIFIED"));
 assert.ok(plan({post:{factChecked:false}}).reasons.includes("EDITORIAL_QA_PENDING"));
});
test("500 per rolling 30 days counts queued new delivery",()=>{
 assert.equal(SAFE_BRAND_POSTS_PER_30D,500);
 assert.ok(plan({brandUsage:{posted:475,queued:25}}).reasons.includes("BRAND_MONTHLY_SAFETY_CAP"));
 assert.ok(plan({brandUsage:{posted:498,queued:1},expectedDeliveries:2})
  .reasons.includes("BRAND_MONTHLY_SAFETY_CAP"));
});
test("TikTok and YouTube quota require confirmed account status",()=>{
 assert.ok(CHANNELS["short-video"].includes("tiktok"));
 assert.ok(plan({kind:"short-video",network:"tiktok",accountQuotaConfirmed:false})
  .reasons.includes("NETWORK_QUOTA_NOT_VERIFIED"));
 assert.ok(plan({kind:"short-video",network:"youtube",providerUsage:{posted:8,queued:0}})
  .reasons.includes("NETWORK_DAILY_SAFETY_CAP"));
});
test("crosspost original at most 2 and only eligible",()=>{
 const c=[
  {network:"tiktok",connected:true,available:true,quotaConfirmed:true,lastPublishedAt:300},
  {network:"youtube",connected:true,available:true,quotaConfirmed:true,lastPublishedAt:200},
  {network:"instagram",connected:true,available:true,quotaConfirmed:true,lastPublishedAt:100},
  {network:"facebook",connected:false,available:true,quotaConfirmed:true,lastPublishedAt:0}
 ];
 assert.deepEqual(selectChannels({kind:"short-video",channels:c}),["instagram","youtube"]);
 assert.deepEqual(selectChannels({kind:"text-image",channels:c}),["instagram"]);
 assert.throws(()=>selectChannels({kind:"text-image",channels:c,maxNetworks:3}),/INVALID_NETWORK_TARGET/);
});
test("block reused topic and copied script",()=>{
 assert.ok(plan({history:[{topicKey:post.topicKey}]}).reasons.includes("REUSED_CREATIVE_OR_TOPIC"));
 assert.ok(plan({history:[{fingerprint:contentId(post)}]}).reasons.includes("REUSED_CREATIVE_OR_TOPIC"));
 assert.ok(plan({history:[{topicKey:"different",script:post.script}]}).reasons.includes("REPETITIVE_SCRIPT"));
});
test("short video must be 15-45 seconds",()=>{
 assert.ok(plan({kind:"short-video",post:{durationSeconds:0}}).reasons.includes("SHORT_DURATION_INVALID"));
 assert.ok(plan({kind:"short-video",post:{durationSeconds:46}}).reasons.includes("SHORT_DURATION_INVALID"));
});
