import test from "node:test";
import assert from "node:assert/strict";
import {createEditorialBrief,creativePrompt,generateEditorialCandidate,
 validateCreativeDraft,TOPIC_PILLARS,CONTENT_MIX,LIFESTYLE_ROTATION,LIFESTYLE_POLICY} from "./creative.mjs";

const brief=createEditorialBrief({kind:"short-video",slotIndex:2});
const draft={
 title:"뱀꿈의 의미를 다양한 관점에서 살펴보는 이유",
 script:"전통적으로 뱀꿈에는 여러 상징이 전해집니다. 꿈만으로 재산이나 건강을 예측할 수는 없습니다. 자신이 느낀 감정이나 실제 일상을 함께 돌아보세요. 이는 전통 해석에 관한 참고 정보입니다.",
 caption:"꿈의 의미는 개인과 문화에 따라 달라질 수 있습니다. 참고용 정보입니다. #사주 #운보다 #꿈해몽",
 educationalValue:"뱀꿈을 확정적 재물운으로 단정하지 않고 민속적 이야기와 현실을 구분합니다.",
 imagePrompt:"한국 전통 민화에서 영감을 받은 비현실적 뱀 상징과 아름다운 꿈의 숲 장면, 푸른색과 금색 톤, 글자 없음",
 evidenceNotes:["검증된 민속 자료를 편집자가 별도로 확인해야 함"],
 scenes:Array.from({length:4},(_,i)=>({seconds:7.5,
  visualPrompt:"민화 스타일 오리지널 꿈 장면 "+i,
  voiceover:"꿈은 민속적 상징으로 이해할 수 있습니다.",
  onScreenText:"뱀꿈과 상징 "+i}))
};
test("real-life editor pillars and 100 percent mix loaded from JSON",()=>{
 assert.equal(LIFESTYLE_POLICY.schemaVersion,1);
 assert.ok(TOPIC_PILLARS.some(p=>p.key==="relationships"));
 assert.ok(TOPIC_PILLARS.some(p=>p.key==="career"));
 assert.ok(TOPIC_PILLARS.some(p=>p.key==="practicalSaju"));
 assert.equal(Object.values(CONTENT_MIX).reduce((a,b)=>a+b,0),100);
 assert.equal(LIFESTYLE_POLICY.status.shortVideoPublishingEnabled,false);
});
test("20 consecutive editorial slots match balanced real-life distribution",()=>{
 const counts=Object.fromEntries(Object.keys(CONTENT_MIX).map(k=>[k,0]));
 for(const category of LIFESTYLE_ROTATION)counts[category]++;
 for(const [k,v] of Object.entries(CONTENT_MIX))assert.equal(counts[k],v/5);
 assert.ok(LIFESTYLE_ROTATION.every((x,i)=>i===0||x!==LIFESTYLE_ROTATION[i-1]));
});
test("3h image brief, 6h video brief both build",()=>{
 assert.equal(createEditorialBrief({kind:"text-image",slotIndex:3}).kind,"text-image");
 assert.equal(brief.targetSeconds,30);
 assert.match(creativePrompt(brief),/생활|고민|연애|직장/);
 assert.equal(brief.doNotAutoPublish,true);
 assert.equal(brief.policyId,LIFESTYLE_POLICY.policyId);
});
test("long video is disabled",()=>assert.throws(
 ()=>createEditorialBrief({kind:"long-video",slotIndex:1}),/DISABLED/
));
test("history dedupe excludes recently used topic",()=>{
 const selected=createEditorialBrief({kind:"text-image",slotIndex:0});
 assert.notEqual(createEditorialBrief({kind:"text-image",slotIndex:0,
  recentTopicKeys:[selected.topicKey]}).topicKey,selected.topicKey);
});
test("reject insufficient scenes",()=>assert.ok(
 validateCreativeDraft({...draft,scenes:draft.scenes.slice(0,2)},brief).reasons.includes("FOUR_SCENES_REQUIRED")
));
test("no purchased generator means fail closed",async()=>{
 const got=await generateEditorialCandidate({kind:"short-video",slotIndex:2});
 assert.equal(got.state,"BLOCKED");
 assert.equal(got.reason,"GENERATOR_NOT_CONNECTED");
});
test("generated candidate is not approved for publication",async()=>{
 const got=await generateEditorialCandidate({kind:"short-video",slotIndex:2,
   generator:async()=>JSON.stringify(draft)});
 assert.equal(got.state,"NEEDS_EDITORIAL_QA");
 assert.equal(got.validation.ok,true);
 assert.equal("creatorReviewStatus" in got.draft,false);
});
test("invalid external generation rejected",async()=>{
 const got=await generateEditorialCandidate({kind:"short-video",slotIndex:2,
   generator:async()=>"{invalid"});
 assert.equal(got.reason,"MALFORMED_GENERATION");
});

test("jargon-first hook title is rejected",()=>{
 const result=validateCreativeDraft({...draft,title:"사주의 용신이 의미하는 신비한 비밀"},brief);
 assert.ok(result.reasons.includes("LIFESTYLE_HOOK_REQUIRED"));
});
