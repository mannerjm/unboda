import test from "node:test";
import assert from "node:assert/strict";
import {nextSixHourSlots,monthlyVideoCreditProjection,
 ESTIMATED_30_DAY_CREDITS,headlessReleaseReadiness} from "./six-hour-controller.mjs";
test("every six hours build eight future slots inside 48h; KST anchor is stable UTC",()=>{
 const start="2026-10-25T11:17:00+09:00";
 const slots=nextSixHourSlots({now:start});
 assert.equal(slots.length,8);
 assert.equal(slots[0].dueAt,"2026-10-25T05:00:00.000Z");
 for(let i=1;i<slots.length;i++){
  assert.equal(new Date(slots[i].dueAt)-new Date(slots[i-1].dueAt),6*3600_000);
  assert.notEqual(slots[i].slotId,slots[i-1].slotId);
  assert.equal(slots[i].publishNetworksMax,2);
 }
});
test("30-day cap estimate: 120 originals, 50 Runway + ~3 narrator credits each",()=>{
 const r=monthlyVideoCreditProjection();
 assert.equal(r.videos,120);
 assert.equal(r.minimumCredits,6360);
 assert.equal(ESTIMATED_30_DAY_CREDITS,6360);
 assert.equal(r.excludesReRenders,true);
 assert.equal(r.isGuaranteedInvoice,false);
});
test("existing 1,950 credit balance by itself does NOT authorize ongoing generation",()=>{
 const r=headlessReleaseReadiness({permanentSourceAvailable:true,
  currentCredits:1950});
 assert.equal(r.state,"NOT_READY");
 assert.ok(r.reasons.includes("ONE_TIME_MONTHLY_CREDIT_CEILING_REQUIRED"));
 assert.ok(r.reasons.includes("FINAL_VIDEO_MISSING"));
 assert.ok(r.reasons.includes("SIX_HOUR_CLOUD_SCHEDULER_MISSING"));
 assert.equal(r.userManualPerVideoApprovalRequired,false);
});
test("even with paid video+voice, Buffer and cloud scheduler safeguards remain required",()=>{
 const r=headlessReleaseReadiness({
  permanentSourceAvailable:true,finalVideoReady:true,
  koreanNarrationVerified:true,commercialRightsVerified:true,
  ownerApprovedMonthlyCredits:7000,currentCredits:1950,
  creditsSpentThisMonth:200,creditsReserved:200,
  autoBillingEnabled:false
 });
 assert.equal(r.state,"NOT_READY");
 assert.ok(r.reasons.includes("BUFFER_AUTOMATIC_WRITE_NOT_VERIFIED"));
 assert.ok(r.reasons.includes("DURABLE_QUEUE_LEDGER_NOT_CONNECTED"));
});
test("autobilling never silently enabled; cap reached pauses only the affected job",()=>{
 const r=headlessReleaseReadiness({
  permanentSourceAvailable:true,finalVideoReady:true,
  koreanNarrationVerified:true,commercialRightsVerified:true,
  cloudWorkerConnected:true,durableQueueAndLockConnected:true,
  cloudSchedulerKind:"github-actions-prod",
  bufferAutomaticModeVerified:true,
  bufferRemoteReconciliationVerified:true,bufferQueueCapacityVerified:true,
  ownerApprovedMonthlyCredits:6000,currentCredits:1950,
  creditsSpentThisMonth:6000,creditsReserved:0,
  autoBillingEnabled:true
 });
 assert.equal(r.state,"NOT_READY");
 assert.ok(r.reasons.includes("AUTOBILLING_REQUIRES_EXPLICIT_SEPARATE_APPROVAL"));
 assert.ok(r.reasons.includes("MONTHLY_RUNWAY_CREDIT_CEILING_REACHED"));
});
