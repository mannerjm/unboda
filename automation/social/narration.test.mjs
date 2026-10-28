import test from "node:test";
import assert from "node:assert/strict";
import {koreanVoiceRequest,requestKoreanNarration} from "./narration.mjs";
const budget={approvedMonthlyLimitCents:1000,spentCents:0,reservedCents:0,
 budgetLockAcquired:true,subscriptionConfirmed:true};
const base={script:"사주는 태어난 시간을 통해 전통적인 상징을 살펴보는 방식입니다. 중요한 결정은 현실적 근거와 함께 판단하세요. 참고용 정보입니다.",
 voiceId:"KR_voice_123456789",
 voiceRightsApproved:true,editorialApproved:true,
 estimatedCents:40,budget,reservationId:"reservation-01",allowPaid:true};
test("Korean voice requires budget, rights, QA and real opt-in",()=>{
 assert.equal(koreanVoiceRequest({...base,allowPaid:false}).authorized,false);
 assert.ok(koreanVoiceRequest({...base,voiceRightsApproved:false}).reasons.includes("VOICE_RIGHTS_NOT_APPROVED"));
 assert.ok(koreanVoiceRequest({...base,editorialApproved:false}).reasons.includes("EDITORIAL_APPROVAL_REQUIRED"));
 assert.ok(koreanVoiceRequest({...base,reservationId:null}).reasons.includes("BUDGET_RESERVATION_REQUIRED"));
 assert.ok(koreanVoiceRequest({...base,budget:{...budget,approvedMonthlyLimitCents:0}})
  .reasons.includes("MONTHLY_BUDGET_NOT_APPROVED"));
});
test("no API request when paid generation is disabled",async()=>{
 let called=false;
 const r=await requestKoreanNarration({...base,allowPaid:false,apiKey:"mocksecret123",
  fetcher:async()=>{called=true;throw Error("network forbidden");}});
 assert.equal(r.state,"BLOCKED");assert.equal(called,false);
});
test("mock Korean TTS binary is guarded, not published",async()=>{
 let hit=0;
 const r=await requestKoreanNarration({...base,apiKey:"mocksecret123",
  fetcher:async(url,req)=>{
   hit++;assert.match(url,/elevenlabs\.io\/v1\/text-to-speech\//);
   assert.equal(req.method,"POST");
   const body=JSON.parse(req.body);
   assert.equal(body.model_id,"eleven_multilingual_v2");
   assert.equal(body.text,base.script);
   assert.equal(req.headers["xi-api-key"],"mocksecret123");
   return {ok:true,headers:{get:()=> "audio/mpeg"},
    arrayBuffer:async()=>new Uint8Array(512).buffer};
  }});
 assert.equal(hit,1);assert.equal(r.state,"AUDIO_GENERATED_NEEDS_QA");
 assert.equal(r.bytes.length,512);assert.equal(r.pronunciationReviewStatus,"pending");
 assert.equal(r.outputNotSaved,true);
});
test("bad audio response is never approved",async()=>{
 const r=await requestKoreanNarration({...base,apiKey:"mocksecret123",
  fetcher:async()=>({ok:true,headers:{get:()=>"text/html"},
   arrayBuffer:async()=>new ArrayBuffer(512)})});
 assert.equal(r.reason,"AUDIO_RESPONSE_INVALID");
});
test("provider rate-limit response requires controlled retry",async()=>{
 const r=await requestKoreanNarration({...base,apiKey:"mocksecret123",
  fetcher:async()=>({ok:false,status:429})});
 assert.equal(r.state,"FAILED");assert.equal(r.retryable,true);
});
