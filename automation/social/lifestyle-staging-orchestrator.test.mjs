import test from "node:test";
import assert from "node:assert/strict";
import {
 checkRemote90DayCoverage,runOfflineStagingEditorialCycle
} from "./lifestyle-staging-orchestrator.mjs";
const nowMs=Date.parse("2026-10-27T14:00:00Z");
const slot="2026-10-27T23:00:00.000Z";
const channelSet=["facebook","instagram","threads","tiktok","youtube"];
const remote={
 source:"verified-metricool-published-export",paginationComplete:true,
 hasPublishedHistory:true,from:new Date(nowMs-91*86400000).toISOString(),
 through:new Date(nowMs-60000).toISOString(),
 fetchedAt:new Date(nowMs-120000).toISOString(),
 channels:channelSet,items:[]
};
const staging={source:"isolated-staging-review-ledger",truncated:false,
 includesAllPublishedPlatforms:false,verifiedRemoteHistory:false,items:[]};
const proposal=()=>({
 topicKey:"commute-alternatives-20261029",situation:"출근길에 마음이 무거운 날",
 hook:"출근 전부터 벌써 지친 이유를 생각해 본 적 있나요?",
 narrationDraft:[
  "출근길에 마음이 무거운 날. 출근 전부터 벌써 지친 이유를 생각해 본 적 있나요?",
  "오늘 일정을 확인하고 중요한 일을 한 가지씩 나눠 적어 보세요.",
  "동료와 대화할 때 불편한 순간을 살펴보고 내 표현도 돌아보세요.",
  "사주는 자신을 이해하는 참고 관점이며 최종 선택은 나의 몫입니다."
 ],
 visualConcepts:[
  "이른 아침 버스 창밖으로 지나가는 실제 거리의 움직임",
  "메모장에 오늘 할 일을 정리하는 손의 실제 움직임",
  "동료와 대화를 시작하는 생활 장면의 움직임",
  "귀가 길에 한숨 돌리는 자연스러운 생활 영상"
 ],
 thumbnailTitle:"출근 전부터 왜 지칠까?"
});
const valid={
 nowMs,remoteHistory:remote,
 offlineDryRun:true,hasApprovedReadOnlyProviders:true,
 readStagingHistory:async()=>staging,
 readObservedPosts:async()=>({
  source:"isolated-staging-public-post-observations",
  verified90DayCoverage:false,allProviderPagesVerified:false,
  truncated:false,items:[]}),
 claimCandidate:async()=>({claimed_job_key:"a".repeat(64),candidate_slot:slot}),
 generateCandidate:async()=>proposal(),
 persistCandidate:async({claimed_job_key})=>({
  state:"STAGING_REVIEW_ONLY",publicationAllowed:false,
  rightsVerified:false,mediaReady:false,jobKey:claimed_job_key,
  scheduledFor:slot
 })
};
test("public 90-day history must be complete, fresh, all connected channels",()=>{
 assert.equal(checkRemote90DayCoverage(remote,nowMs).ok,true);
 for(const bad of [
  {...remote,paginationComplete:false},
  {...remote,hasPublishedHistory:false},
  {...remote,channels:["instagram"]},
  {...remote,source:"isolated-staging-review-ledger"},
  {...remote,from:new Date(nowMs-20*86400000).toISOString()},
  {...remote,through:new Date(nowMs-8*3600000).toISOString()},
  {...remote,fetchedAt:new Date(nowMs-24*3600000).toISOString()}
 ]){
  assert.equal(checkRemote90DayCoverage(bad,nowMs).ok,false);
 }
});
test("missing public history is fail closed BEFORE any DB claim or generation",async()=>{
 let writes=0;
 const res=await runOfflineStagingEditorialCycle({...valid,
  remoteHistory:{...remote,hasPublishedHistory:false},
  claimCandidate:async()=>{writes++;throw Error("should not claim")},
  generateCandidate:async()=>{writes++;return proposal()}
 });
 assert.equal(res.state,"BLOCKED");
 assert.equal(res.reason,"VERIFIED_90_DAY_PUBLIC_HISTORY_REQUIRED");
 assert.equal(writes,0);
});
test("verified mocked sources lead only to isolated DB review, never SNS post",async()=>{
 let claims=0,writes=0;
 const result=await runOfflineStagingEditorialCycle({...valid,
  claimCandidate:async()=>{claims++;return {claimed_job_key:"a".repeat(64),candidate_slot:slot}},
  persistCandidate:async({claimed_job_key,storyboard})=>{
   writes++;assert.equal(storyboard.topicKey,proposal().topicKey);
   return {...await valid.persistCandidate({claimed_job_key})};
  }
 });
 assert.equal(result.state,"STAGING_REVIEW_ONLY");
 assert.equal(result.publicationAllowed,false);
 assert.equal(result.paidGenerationAllowed,false);
 assert.equal(result.remotePublicationPerformed,false);
 assert.equal(result.actualMediaNotYetGenerated,true);
 assert.equal(claims,1);assert.equal(writes,1);
});
test("duplicate from either public or staging scripts blocks durable insert",async()=>{
 let writes=0;
 const used={topicKey:proposal().topicKey,narrationDraft:proposal().narrationDraft,
  createdAt:new Date(nowMs-86400000).toISOString()};
 for(const overrides of [
  {remoteHistory:{...remote,items:[used]}},
  {readStagingHistory:async()=>({...staging,items:[used]})}
 ]){
  const r=await runOfflineStagingEditorialCycle({...valid,...overrides,
   persistCandidate:async()=>{writes++;return {state:"STAGING_REVIEW_ONLY"}}
  });
  assert.equal(r.state,"BLOCKED");
  assert.equal(r.draftReason,"NO_APPROVABLE_ORIGINAL_CANDIDATE");
 }
 assert.equal(writes,0);
});
test("no media/publish rights can be implied by a forged save receipt",async()=>{
 const r=await runOfflineStagingEditorialCycle({...valid,
  persistCandidate:async()=>({...await valid.persistCandidate({claimed_job_key:"a".repeat(64)}),
   mediaReady:true,publicationAllowed:true})
 });
 assert.equal(r.state,"BLOCKED");
 assert.equal(r.reason,"UNVERIFIED_DURABLE_DRAFT_RECEIPT");
});
test("no background paid/provider call without exact offline dry-run flag",async()=>{
 let n=0;
 for(const overrides of [{offlineDryRun:false},{hasApprovedReadOnlyProviders:false}]){
  const result=await runOfflineStagingEditorialCycle({...valid,...overrides,
   generateCandidate:async()=>{n++;return proposal()}
  });
  assert.equal(result.state,"BLOCKED");
 }
 assert.equal(n,0);
});

test("actual observed public post duplicate triggers retry, never permanent publication",async()=>{
 let attempts=0,writes=0;
 const r=await runOfflineStagingEditorialCycle({...valid,
  readObservedPosts:async()=>({
   source:"isolated-staging-public-post-observations",
   verified90DayCoverage:false,allProviderPagesVerified:false,
   truncated:false,items:[{network:"instagram",providerId:"unique987",
     postText:"출근길에 마음이 무거운 날. 출근 전부터 벌써 지친 이유를 생각해 본 적 있나요?"}]
  }),
  generateCandidate:async()=>{attempts++;return proposal()},
  persistCandidate:async()=>{writes++;return {state:"STAGING_REVIEW_ONLY"}}
 });
 assert.equal(r.state,"BLOCKED");
 assert.equal(r.draftReason,"POST_ORIGINALITY_CHECK_EXHAUSTED");
 assert.equal(attempts,3);assert.equal(writes,0);
});
test("no read access to observed actual social posts stops before any slot claim",async()=>{
 let claimed=0;
 const r=await runOfflineStagingEditorialCycle({...valid,
  readObservedPosts:async()=>({
   source:"isolated-staging-public-post-observations",
   verified90DayCoverage:true,allProviderPagesVerified:false,truncated:false,items:[]
  }),
  claimCandidate:async()=>{claimed++;return {claimed_job_key:"a".repeat(64),candidate_slot:slot}}
 });
 assert.equal(r.state,"BLOCKED");
 assert.equal(r.reason,"OBSERVED_PUBLIC_POST_HISTORY_UNVERIFIED");
 assert.equal(claimed,0);
});
