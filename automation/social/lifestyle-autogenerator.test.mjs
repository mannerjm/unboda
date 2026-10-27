import test from "node:test";
import assert from "node:assert/strict";
import {contentSimilarity,assessNovelLifestyleCandidate,makeNovelLifestyleCandidate}
 from "./lifestyle-autogenerator.mjs";
const atMs=Date.parse("2026-10-29T08:00:00+09:00");
const proposal=(topicKey="commute-alternatives-20261029")=>({
 topicKey,situation:"출근길에 마음이 무거운 날",
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
const historyEntry=(p,createdAt="2026-10-27T00:00:00+09:00")=>({
 topicKey:p.topicKey,narrationDraft:p.narrationDraft,createdAt
});
const ready={atMs,historyVerified:true,offlineDryRun:true,
 fetchHistory:async()=>[],generator:async()=>proposal()};
test("accepts original daily-life brief as draft only, never publisher input",async()=>{
 const x=await makeNovelLifestyleCandidate(ready);
 assert.equal(x.state,"CANDIDATE_ONLY");
 assert.equal(x.publicationAllowed,false);
 assert.equal(x.mediaGenerationAllowed,false);
 assert.equal(x.requiresNaturalKoreanVoice,true);
 assert.equal(x.attempts,1);
});
test("when history unavailable or gates off never invokes original generator",async()=>{
 let invoked=0;
 const generator=async()=>{invoked++;return proposal();};
 for(const option of [
  {historyVerified:false},{fetchHistory:null},{offlineDryRun:false},
  {atMs:Date.parse("2026-10-29T10:00:00+09:00")}
 ]){
  const r=await makeNovelLifestyleCandidate({...ready,generator,...option});
  assert.equal(r.state,"BLOCKED");
 }
 assert.equal(invoked,0);
});
test("blocks repeated topic or near-identical Korean narration across 90 days",()=>{
 const item=proposal();
 const repeated=assessNovelLifestyleCandidate(item,{
  nowMs:atMs,history:[historyEntry(item)]});
 assert.equal(repeated.ok,false);
 assert.ok(repeated.reasons.includes("REPEATED_90_DAY_TOPIC_KEY"));
 assert.ok(repeated.reasons.includes("REPEATED_90_DAY_NARRATION"));
 assert.ok(repeated.reasons.includes("REPEATED_90_DAY_OPENING"));
 assert.ok(contentSimilarity("퇴근 후 마음이 지친 날","퇴근 후 마음이 지친 날")>0.99);
});
test("90-day history invalid or stale proof fails closed",()=>{
 const x=assessNovelLifestyleCandidate(proposal(),{nowMs:atMs,history:[
  {topicKey:"old",narrationDraft:["a","b","c"],createdAt:"2025-01-01"}
 ]});
 assert.equal(x.ok,false);
 assert.ok(x.reasons.includes("VERIFIED_90_DAY_HISTORY_REQUIRED"));
 assert.equal(assessNovelLifestyleCandidate(proposal(),{
  nowMs:atMs,history:undefined}).ok,false);
});
test("candidate retries within 3 attempts but never loops forever",async()=>{
 let n=0;const x=await makeNovelLifestyleCandidate({...ready,generator:async()=>{
  n++;
  return n===1?proposal("same-duplicate-topic"):proposal("new-story-for-20261029");
 },fetchHistory:async()=>[historyEntry(proposal("same-duplicate-topic"))]});
 // Same substantive narration must remain blocked even after new topic identifier.
 assert.equal(x.state,"BLOCKED");
 assert.equal(x.reason,"NO_APPROVABLE_ORIGINAL_CANDIDATE");
 assert.equal(x.attempts,3);
 assert.equal(n,3);
});
test("rejects advertising, unsafe assertions, missing original scenes and thumbnail",()=>{
 const x=proposal();x.narrationDraft[1]="운보다 결제하면 반드시 재회하고 수익 보장됩니다.";
 x.visualConcepts=[];
 x.thumbnailTitle="";
 const checked=assessNovelLifestyleCandidate(x,{nowMs:atMs,history:[]});
 assert.equal(checked.ok,false);
 assert.ok(checked.reasons.includes("FOUR_ORIGINAL_SCENE_BRIEFS_REQUIRED"));
 assert.ok(checked.reasons.includes("THUMBNAIL_TITLE_INVALID"));
 assert.ok(checked.reasons.includes("UNVERIFIED_OR_MISLEADING_PREDICTION"));
});
test("one malformed history record blocks generated output",async()=>{
 let invoked=0;
 const x=await makeNovelLifestyleCandidate({...ready,fetchHistory:async()=>[
  {topicKey:"missing-created-at",narrationDraft:["a","b","c"]}
 ],generator:async()=>{invoked++;return proposal();}});
 assert.equal(x.state,"BLOCKED");assert.equal(invoked,0);
});
