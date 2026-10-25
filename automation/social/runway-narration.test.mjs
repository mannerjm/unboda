import test from "node:test";
import assert from "node:assert/strict";
import {
 planRunwayKoreanNarration,
 requestRunwayKoreanNarration,
 readRunwayKoreanNarrationTask
} from "./runway-narration.mjs";
const script="띠는 태어난 해를 나타내는 열두 동물의 상징입니다. 사주는 태어난 해와 달, 날, 시간을 함께 살펴보는 전통적인 해석 방식입니다.";
const taskId="1aac3df9-7f5c-4b9b-a749-7d133eb71ad3";
test("paid Korean TTS defaults to off and does not access provider",async()=>{
 let hits=0;
 const r=await requestRunwayKoreanNarration({text:script,apiKey:"mock-runway-test-token",
  fetcher:async()=>{hits++;throw Error("not allowed")}});
 assert.equal(r.state,"BLOCKED");
 assert.equal(hits,0);
 assert.ok(r.reasons.includes("PAID_VOICE_DISABLED"));
 assert.ok(r.reasons.includes("MONTHLY_AUDIO_CREDIT_BUDGET_MISSING"));
});
test("Korean scripts estimate multilingual v2 credits at one per 50 codepoints",()=>{
 const r=planRunwayKoreanNarration({text:script});
 assert.equal(r.estimatedCredits,Math.ceil(Array.from(script).length/50));
 assert.ok(r.estimatedCredits<=4);
});
test("approved mock voice request only posts Runway Eleven multilingual v2",async()=>{
 let hits=0;
 const r=await requestRunwayKoreanNarration({
  text:script,apiKey:"mock-runway-test-token",allowPaid:true,
  editorialApproved:true,commercialRightsConfirmed:true,
  monthlyCreditLimit:20,ledgerReservationConfirmed:true,
  fetcher:async(url,req)=>{
   hits++;
   assert.equal(url,"https://api.dev.runwayml.com/v1/text_to_speech");
   assert.equal(req.method,"POST");
   const body=JSON.parse(req.body);
   assert.equal(body.model,"eleven_multilingual_v2");
   assert.equal(Object.hasOwn(body,"outputFormat"),false);
   assert.equal(Object.hasOwn(body,"sampleRate"),false);
   assert.equal(body.promptText,script);
   return {ok:true,json:async()=>({id:taskId})};
  }
 });
 assert.equal(hits,1);
 assert.equal(r.state,"TTS_TASK_ACCEPTED_NOT_VERIFIED");
 assert.equal(r.outputNotVerified,true);
});
test("budget reservation is mandatory even with an explicit allowPaid flag",()=>{
 const r=planRunwayKoreanNarration({text:script,
  allowPaid:true,editorialApproved:true,commercialRightsConfirmed:true,
  monthlyCreditLimit:3,usedCredits:2,reservedCredits:2,
  ledgerReservationConfirmed:false});
 assert.equal(r.authorized,false);
 assert.ok(r.reasons.includes("DURABLE_BUDGET_RESERVATION_REQUIRED"));
 assert.ok(r.reasons.includes("AUDIO_CREDIT_BUDGET_EXCEEDED"));
});
test("completed speech task still requires audio storage and Korean pronunciation QA",async()=>{
 const r=await readRunwayKoreanNarrationTask({taskId,
  apiKey:"mock-runway-test-token",
  fetcher:async()=>({ok:true,json:async()=>({status:"SUCCEEDED",
   output:["https://cdn.provider.example/voice.mp3"]})})});
 assert.equal(r.state,"TTS_OUTPUT_NEEDS_STORAGE_AND_PRONUNCIATION_QA");
 assert.equal(r.pronunciationVerified,false);
 assert.equal(r.mediaPersisted,false);
});
test("TTS callback errors do not trigger blind second charges",async()=>{
 const r=await requestRunwayKoreanNarration({
  text:script,apiKey:"mock-runway-test-token",allowPaid:true,
  editorialApproved:true,commercialRightsConfirmed:true,
  monthlyCreditLimit:20,ledgerReservationConfirmed:true,
  fetcher:async()=>({ok:false,status:502})
 });
 assert.equal(r.state,"UNKNOWN_PROVIDER_OUTCOME_NO_BLIND_RETRY");
 assert.equal(r.doNotRetryAutomatically,true);
});
