import test from 'node:test';
import assert from 'node:assert/strict';
import {buildKoreanStoryboardRequest,generatePaidKoreanLifestyleStoryboard}
 from './openai-lifestyle-generator.mjs';
const story={
 topicKey:'commute-boundaries-20261028',situation:'출근길에 마음이 무거운 날',
 hook:'출근길 마음이 무거울 때 무엇을 해보면 좋을까요?',
 thumbnailTitle:'출근길 마음이 무겁다면?',
 narrationDraft:[
  '출근길에 마음이 무거운 날. 무엇부터 할지 막막한 아침인가요?',
  '급한 일과 중요한 일은 꼭 같은 것은 아니라서 구분할 필요가 있어요.',
  '오늘 할 일 가운데 정말 중요한 하나를 먼저 적어 보세요.',
  '나에게 맞는 하루의 속도를 찾아가는 것도 의미 있는 시작이에요.'
 ],
 visualConcepts:[
  '아침 시곗바늘과 창문 밖으로 흐르는 원본 그래픽',
  '알림 말풍선이 멀어지며 숨을 고르는 모션 그래픽',
  '메모장에 오늘의 중요 할 일 하나를 고르는 원본 모션',
  '부드럽게 번지는 아침 햇살과 쉼표 장면의 원본 영상'
 ],
 scenes:[
  {headline:['출근길부터','마음이 무겁다면'],subline:'작게 살펴보는 오늘의 마음',illustration:'clock'},
  {headline:['급한 일과','중요한 일은 달라요'],subline:'잠시 구분해도 괜찮아요',illustration:'message'},
  {headline:['오늘 가장 먼저','한 가지 적어봐요'],subline:'작은 정리가 시작이에요',illustration:'notes'},
  {headline:['나만의 속도를','찾아가도 괜찮아'],subline:'마음의 속도도 중요한 하루',illustration:'rest'}
 ]};
const gate={
 approvalSource:'verified-staging-service-worker',ownerExplicitCostApproval:true,
 budgetReceipt:{state:'BUDGET_RESERVED_ONLY',publishingAllowed:false,
  externalCallNotExecuted:true,reservedKrw:150},
 verifiedPublishedHistory:{source:'verified-metricool-published-export',
  paginationComplete:true,hasPublishedHistory:true},
 ownerPrivacyApproval:true,purpose:'STAGING_EDITORIAL_REVIEW',
 socialPublishingEnabled:false
};
const args={apiKey:'TEST_ONLY_SERVER_SIDE_SECRET_123456',model:'gpt-4o-mini',
 slotKst:'2026-10-28 08:00',recentTopicKeys:[],
 usedOpenings:[],gate};
const response=()=>({ok:true,json:async()=>({status:'completed',error:null,
 output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(story)}]}]})});
test('current missing owner approvals prevent all paid API requests',async()=>{
 let called=0;
 const blocked=[
  undefined,{...gate,ownerExplicitCostApproval:false},
  {...gate,budgetReceipt:{...gate.budgetReceipt,externalCallNotExecuted:false}},
  {...gate,verifiedPublishedHistory:{...gate.verifiedPublishedHistory,paginationComplete:false}},
  {...gate,ownerPrivacyApproval:false},
  {...gate,socialPublishingEnabled:true},
  {...gate,approvalSource:'unknown-web-request'}
 ];
 for(const item of blocked){
  await assert.rejects(generatePaidKoreanLifestyleStoryboard({...args,
   gate:item,fetcher:async()=>{called++;return response()}}),
   /OWNER_BUDGET_PRIVACY_AND_VERIFIED_90D_HISTORY_REQUIRED/);
 }
 assert.equal(called,0);
});
test('structured output request is four scenes, no user data, no social publish and no storage',()=>{
 const request=buildKoreanStoryboardRequest({...args});
 assert.equal(request.store,false);
 assert.equal(request.max_output_tokens,1400);
 assert.equal(request.text.format.type,'json_schema');
 assert.equal(request.text.format.strict,true);
 assert.equal(request.text.format.schema.additionalProperties,false);
 assert.equal(request.text.format.schema.required.length,7);
 assert.equal(request.input.length,2);
 assert.ok(request.input[0].content.includes('한국어'));
 assert.ok(!JSON.stringify(request).includes('apiKey'));
});
test('one paid request may return only well-formed private draft, not a publication receipt',async()=>{
 let calls=0;let wire;
 const result=await generatePaidKoreanLifestyleStoryboard({...args,
  fetcher:async(url,options)=>{calls++;wire={url,options};return response()}
 });
 assert.equal(calls,1);
 assert.equal(wire.url,'https://api.openai.com/v1/responses');
 assert.equal(wire.options.method,'POST');
 assert.equal(JSON.parse(wire.options.body).store,false);
 assert.deepEqual(result,story);
 assert.equal(result.publicationAllowed,undefined);
});
test('provider timeout, ambiguous HTTP status and refusal do not blindly retry',async()=>{
 let count=0;
 for(const fetcher of [
  async()=>{count++;throw Error('timeout')},
  async()=>{count++;return {ok:false,status:429}},
  async()=>{count++;return {ok:true,json:async()=>({status:'incomplete',output:[]})}}
 ])await assert.rejects(generatePaidKoreanLifestyleStoryboard({...args,fetcher}));
 assert.equal(count,3);
});
test('malformed or unsafe response cannot produce an approved draft',async()=>{
 for(const draft of [
  {...story,narrationDraft:[]},
  {...story,publicationAllowed:true},
  {...story,visualConcepts:[...story.visualConcepts.slice(0,2)]},
  {...story,topicKey:'NOT ALLOWED KEY'},
  {...story,scenes:[...story.scenes.slice(0,3)]},
  {...story,scenes:story.scenes.map((x,i)=>i===0?{...x,headline:['이 문장은 너무 길어 화면 밖으로 나갑니다','다른 문장']}:x)}
 ]){
 const fetcher=async()=>({ok:true,json:async()=>({status:'completed',
  output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft)}]}]})});
 await assert.rejects(generatePaidKoreanLifestyleStoryboard({...args,fetcher}),
 /AI_PROVIDER_STORYBOARD_CONTRACT_FAILED/);
 }
});
test('unbounded 90-day history input is blocked before network call',async()=>{
 let calls=0;
 await assert.rejects(generatePaidKoreanLifestyleStoryboard({...args,
  recentTopicKeys:Array(501).fill('topicKey'),
  fetcher:async()=>{calls++;return response()}}),/UNBOUNDED_OR_UNVERIFIED_HISTORY_INPUT/);
 assert.equal(calls,0);
});
