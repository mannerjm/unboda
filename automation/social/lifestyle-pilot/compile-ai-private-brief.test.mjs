import test from 'node:test';
import assert from 'node:assert/strict';
import {compileAiPrivateBrief} from './compile-ai-private-brief.mjs';
const story={
 topicKey:'workday-boundary-20261028-private',situation:'출근길에 마음이 무거운 날',
 hook:'출근길 마음이 무거울 때 무엇부터 하면 좋을까요?',
 thumbnailTitle:'출근길 마음이 무겁다면?',
 narrationDraft:[
  '출근길에 마음이 무거운 날. 출근길 마음이 무거울 때 무엇부터 하면 좋을까요?',
  '급한 일과 중요한 일이 꼭 같은 것은 아니에요. 잠시 구분해 볼까요?',
  '오늘 가장 중요한 일 하나를 먼저 적어 보세요. 천천히 시작해도 돼요.',
  '내 속도에 맞게 일정을 조절하며 하루를 보내는 것도 좋은 방법이에요.'
 ],
 visualConcepts:[
  '출근 전 움직이는 시계와 도시 창밖 풍경의 원본 모션 그래픽',
  '급한 알림 말풍선이 천천히 줄어드는 작은 오리지널 모션',
  '하나의 중요한 일을 체크하며 정리하는 노트의 자연스러운 움직임',
  '은은한 아침 햇살과 편안해지는 쉼표의 오리지널 움직임'
 ],
 scenes:[
  {headline:['출근길부터','마음이 무겁다면'],subline:'오늘 하루를 작게 시작해요',illustration:'clock'},
  {headline:['급한 일과','중요한 일은 달라요'],subline:'한 번 나누어 살펴봐요',illustration:'message'},
  {headline:['오늘 할 일','한 가지부터'],subline:'작은 정리도 충분해요',illustration:'notes'},
  {headline:['나만의 속도로','하루를 시작해요'],subline:'내 속도를 찾아보세요',illustration:'rest'}
 ]
};
test('approved complete history creates a render.py-compatible private episode, never a post',()=>{
 const x=compileAiPrivateBrief(story,{slotKst:'2026-10-28 08:00',verifiedHistory:true});
 assert.equal(x.state,'PRIVATE_RENDER_BRIEF_ONLY');
 assert.equal(x.brief.schemaVersion,1);assert.equal(x.brief.automatedPublicationAllowed,false);
 assert.equal(x.brief.narrationDraft.length,4);assert.equal(x.brief.scenes.length,4);
 assert.equal(x.brief.licenseReviewRequired,true);
 assert.equal(x.brief.voiceHumanReviewRequired,true);
 assert.equal(x.paidModelCallAllowed,false);assert.equal(x.publicationAllowed,false);
});
test('unverified 90-day publication history blocks production compilation',()=>{
 const r=compileAiPrivateBrief(story,{slotKst:'2026-10-28 08:00'});
 assert.equal(r.state,'BLOCKED');assert.equal(r.publicationAllowed,false);
});
test('missing AI scene or inaccurate opening is rejected not auto-shortened',()=>{
 const cases=[
  {...story,narrationDraft:['바뀐 내용',...story.narrationDraft.slice(1)]},
  {...story,scenes:story.scenes.slice(0,3)},
  {...story,scenes:story.scenes.map((x,i)=>i===0?{...x,headline:['이것은 너무 길게 작성되어서 읽을 수 없어요','단축하기 금지']}:x)},
  {...story,thumbnailTitle:'너무나 길어서 첫 화면에서 읽기 어려운 썸네일 제목입니다'}
 ];
 for(const b of cases){
  const r=compileAiPrivateBrief(b,{slotKst:'2026-10-28 08:00',verifiedHistory:true});
  assert.equal(r.state,'BLOCKED');
 }
});
test('only four KST slots can be represented',()=>{
 assert.equal(compileAiPrivateBrief(story,{slotKst:'2026-10-28 06:00',verifiedHistory:true}).state,'BLOCKED');
 assert.equal(compileAiPrivateBrief(story,{slotKst:'2026-10-28 20:00',verifiedHistory:true}).state,'PRIVATE_RENDER_BRIEF_ONLY');
});
