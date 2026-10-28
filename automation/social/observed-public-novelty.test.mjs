import test from "node:test";
import assert from "node:assert/strict";
import {checkObservedPublicOriginality} from "./observed-public-novelty.mjs";
const script={hook:"퇴근했는데도 쉬는 느낌이 들지 않는 이유가 뭘까요?",
 narrationDraft:[
  "퇴근했는데도 계속 피곤한 날. 쉬어도 마음이 무거운 이유가 뭘까요?",
  "몸은 집에 왔지만 머릿속은 아직 일하는 중일 수 있어요.",
  "오늘 할 일을 돌아보고 내일로 미뤄도 되는 일을 한 가지 적어 보세요.",
  "나에게 맞는 쉬는 방법을 찾는 것도 중요한 선택이에요."
]};
const source={source:"isolated-staging-public-post-observations",
 verified90DayCoverage:false,allProviderPagesVerified:false,truncated:false,
 items:[{network:"facebook",providerId:"12345",
  postText:"오늘은 가족과 대화하는 시간을 생각해 보세요. 한 번의 대화로 달라질 수 있어요."}]};
test("distinct Korean life advice may pass additional observed-post filter, but never earns publish approval",()=>{
 const p=checkObservedPublicOriginality(script,source);
 assert.equal(p.ok,true);assert.equal(p.publicationAllowed,false);
 assert.equal(p.full90DayVerified,false);
});
test("repeated actual social caption stops new video even if original topic id differs",()=>{
 const r=checkObservedPublicOriginality(script,{...source,items:[{
  network:"instagram",providerId:"987655",postText:
  "오늘의 주제. 몸은 집에 왔지만 머릿속은 아직 일하는 중일 수 있어요. 같이 실천해 볼까요?"
 }]});
 assert.equal(r.ok,false);
 assert.ok(r.reasons.includes("SIMILAR_TO_ACTUAL_OBSERVED_POST"));
 assert.equal(r.matchedNetwork,"instagram");
});
test("partial social corpus cannot masquerade as verified complete 90 day history",()=>{
 for(const bad of [
  {...source,verified90DayCoverage:true},
  {...source,allProviderPagesVerified:true},
  {...source,truncated:true},
  {...source,source:"untrusted-source"},
  {...source,items:[{network:"fake",providerId:"2",postText:"anything"}]}
 ]){
  const r=checkObservedPublicOriginality(script,bad);
  assert.equal(r.ok,false);assert.equal(r.full90DayVerified,false);
 }
});
test("missing script or lack of content cannot be declared novel",()=>{
 assert.equal(checkObservedPublicOriginality(null,source).ok,false);
});
