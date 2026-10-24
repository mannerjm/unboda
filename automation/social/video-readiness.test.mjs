import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {inspectAutopilotReadiness,validateAutopilotConfig,
 plannedSixHourSlots,REQUIRED_VIDEO_ENV} from "./video-readiness.mjs";
const cfg=JSON.parse(await readFile(new URL("./video-automation.config.json",import.meta.url),"utf8"));
test("automation JSON keeps videos OFF until paid/API release checks are done",()=>{
 assert.equal(validateAutopilotConfig(cfg).ok,true);
 assert.equal(cfg.existingTextImage.doNotModify,true);
 assert.equal(cfg.video.targetCadenceHours,6);
 assert.equal(cfg.video.enabled,false);
 assert.equal(cfg.controls.livePublishingEnabled,false);
 assert.equal(cfg.controls.monthlyGenerationBudgetUsdCents,0);
});
test("no cloud tokens, no live video or false 365-day claim",()=>{
 const r=inspectAutopilotReadiness({config:cfg,env:{},proofs:{}});
 assert.equal(r.ready,false);
 assert.ok(r.missingEnvironment.includes("METRICOOL_API_TOKEN"));
 assert.ok(r.missingEnvironment.includes("RUNWAY_API_KEY"));
 assert.ok(r.gates.includes("LIVE_PUBLISH_DISABLED"));
 assert.ok(r.missingProofs.includes("verifiedKoreanNarrationPronunciation"));
 assert.ok(r.connectedChatPluginDoesNotGrantRESTCredentials);
 assert.equal(r.planOnly,true);
});
test("environment alone cannot bypass independent media rights and remote proof",()=>{
 const env=Object.fromEntries(REQUIRED_VIDEO_ENV.map(k=>[k,"mock-not-a-real-secret"]));
 const r=inspectAutopilotReadiness({config:cfg,env,proofs:{}});
 assert.deepEqual(r.missingEnvironment,[]);
 assert.equal(r.ready,false);
 assert.ok(r.missingProofs.includes("validMediaPublicURL"));
});
test("enable flags without approved budget do not authorize spending",()=>{
 const c=structuredClone(cfg);
 c.video.enabled=true;
 c.controls.schedulerEnabled=true;
 c.controls.paidGenerationEnabled=true;
 c.controls.livePublishingEnabled=true;
 const env=Object.fromEntries(REQUIRED_VIDEO_ENV.map(k=>[k,"synthetic"]));
 const r=inspectAutopilotReadiness({config:c,env,proofs:{}});
 assert.equal(r.ready,false);
 assert.ok(r.gates.includes("MONTHLY_SPEND_NOT_APPROVED"));
});
test("simulated full readiness is a preflight only, never proof of a real upload",()=>{
 const c=structuredClone(cfg);
 c.video.enabled=true;
 c.controls.schedulerEnabled=true;
 c.controls.paidGenerationEnabled=true;
 c.controls.livePublishingEnabled=true;
 c.controls.monthlyGenerationBudgetUsdCents=15000;
 const env=Object.fromEntries(REQUIRED_VIDEO_ENV.map(k=>[k,"fixture"]));
 const proofs=Object.fromEntries([
  "approvedCommercialVoice","verifiedVideoContentQuality",
  "verifiedKoreanNarrationPronunciation","approvedOriginalImageRights",
  "validMediaPublicURL","persistedUniqueJobAndBudgetReservation",
  "verifiedMetricoolApiResponse","verifiedPostingAndReconciliation",
  "verifiedSocialAccountQuota","ownerApprovedMonthlyBudget"
 ].map(x=>[x,true]));
 const r=inspectAutopilotReadiness({config:c,env,proofs});
 assert.equal(r.ready,true);
 assert.equal(r.planOnly,true);
});
test("eight 6h slots form a 48h forward planning window",()=>{
 const from=Date.parse("2026-10-25T08:00:00+09:00");
 const slots=plannedSixHourSlots({now:from,count:8});
 assert.equal(slots.length,8);
 assert.equal(slots[0].atKst,"2026-10-25 08:00:00");
 assert.equal(slots[1].atKst,"2026-10-25 14:00:00");
 assert.equal(slots[7].atKst,"2026-10-27 02:00:00");
 assert.equal(new Set(slots.map(x=>x.slotKey)).size,8);
});
test("unsafe config fails and no hidden change to 3h text work",()=>{
 const c=structuredClone(cfg);
 c.existingTextImage.doNotModify=false;
 assert.equal(validateAutopilotConfig(c).ok,false);
 assert.ok(validateAutopilotConfig(c).issues.includes("EXISTING_TEXT_AUTOMATION_MUST_BE_PRESERVED"));
});
