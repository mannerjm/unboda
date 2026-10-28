// Genuine OpenAI Responses API *adapter* for new Korean storyboards.
// It is deliberately NOT invoked by current staging/production cron.
// One paid request only after authenticated service-side approval + durable
// budget reservation + VERIFIED COMPLETE external 90-day history.
// No publishing, uploading, automatic retries, or fallback to customer data.
const API='https://api.openai.com/v1/responses';
const NO=(reason)=>Object.assign(new Error(reason),{code:reason});
const schema={
 type:'object',
 properties:{
  topicKey:{type:'string'},situation:{type:'string'},hook:{type:'string'},
  thumbnailTitle:{type:'string'},
  narrationDraft:{type:'array',items:{type:'string'}},
  visualConcepts:{type:'array',items:{type:'string'}},
  scenes:{type:'array',items:{
    type:'object',
    properties:{
      headline:{type:'array',items:{type:'string'}},
      subline:{type:'string'},
      illustration:{type:'string',enum:['clock','message','notes','rest']}
    },
    required:['headline','subline','illustration'],
    additionalProperties:false
  }}
 },
 required:['topicKey','situation','hook','thumbnailTitle','narrationDraft','visualConcepts','scenes'],
 additionalProperties:false
};
const legalText=t=>typeof t==='string'&&t.length>=12&&t.length<=260;
const topicKey=t=>typeof t==='string'&&/^[a-z0-9][a-z0-9:_-]{7,99}$/.test(t);
function assertGate(x){
 if(x?.approvalSource!=='verified-staging-service-worker'||
    x?.ownerExplicitCostApproval!==true||
    x?.budgetReceipt?.state!=='BUDGET_RESERVED_ONLY'||
    x?.budgetReceipt?.publishingAllowed!==false||
    x?.budgetReceipt?.externalCallNotExecuted!==true||
    !Number.isInteger(x?.budgetReceipt?.reservedKrw)||
    x.budgetReceipt.reservedKrw<1||
    x?.verifiedPublishedHistory?.source!=='verified-metricool-published-export'||
    x.verifiedPublishedHistory.paginationComplete!==true||
    x.verifiedPublishedHistory.hasPublishedHistory!==true||
    x?.ownerPrivacyApproval!==true||
    x?.purpose!=='STAGING_EDITORIAL_REVIEW'||
    x?.socialPublishingEnabled!==false)
    throw NO('OWNER_BUDGET_PRIVACY_AND_VERIFIED_90D_HISTORY_REQUIRED');
}
export function buildKoreanStoryboardRequest({model,slotKst,recentTopicKeys=[],usedOpenings=[]}={}){
 if(typeof model!=='string'||!/^[a-zA-Z0-9._-]{4,80}$/.test(model))
  throw NO('EXPLICIT_APPROVED_AI_MODEL_REQUIRED');
 if(typeof slotKst!=='string'||!/^\d{4}-\d\d-\d\d (00|08|12|20):00$/.test(slotKst))
  throw NO('FOUR_KST_EDITORIAL_SLOT_REQUIRED');
 if(!Array.isArray(recentTopicKeys)||!Array.isArray(usedOpenings)||
  recentTopicKeys.length>500||usedOpenings.length>500||
  recentTopicKeys.some(x=>typeof x!=='string'||x.length>110)||
  usedOpenings.some(x=>typeof x!=='string'||x.length>300))
  throw NO('UNBOUNDED_OR_UNVERIFIED_HISTORY_INPUT');
 const localHour=slotKst.slice(11,13);
 const theme={'00':'밤·가족·감정','08':'출근·직장','12':'친구·인간관계','20':'퇴근·생활습관·돈'}[localHour];
 const payload={
  model,store:false,max_output_tokens:1400,
  text:{format:{type:'json_schema',name:'unboda_private_korean_storyboard',
   strict:true,schema}},
  input:[
   {role:'system',content:
    '너는 한국 생활형 30초 영상의 대본 작가다. 반드시 한국어 JSON 1개를 출력한다. '+
    '실제 일상 문제를 첫 문장에 배치하고, 설명은 쉬운 한국어로 쓴다. '+
    '사주를 의학·재무·연애 결과를 보장하는 확정 예언으로 표현하지 않는다. '+
    '구매 유도는 하지 않는다. 4개 장면, 장면당 읽기 편한 15~70자 대사로 구성한다. '+
    '장면마다 새로운 오리지널 움직임 콘셉트를 제시한다. '+
    'narrationDraft의 첫 줄은 situation으로 정확히 시작하고, 같은 줄에 hook 질문 전체를 그대로 포함해야 한다. '+
    'scenes는 정확히 4개이며, 각 headline 두 줄은 짧은 한국어(각 9글자 이내), subline 한 줄, '+
    'illustration은 clock/message/notes/rest 중 하나다. 모든 표현은 콘텐츠 검수를 전제로 한다.'},
   {role:'user',content:JSON.stringify({
    kind:'UNBODA_STAGING_DRAFT_NOT_PUBLISHED',slotKst,theme,
    constraints:{
     topicKey:'영문소문자 8~100자, 가능하면 일자와 새로운 주제 포함',
     situation:'일상에서 실제로 만나는 상황 7~150자',
     hook:'12~90자 질문',thumbnailTitle:'5~26자의 첫 화면 문구',
     narrationDraft:'정확히 4개, 첫 대사의 시작은 situation과 같아야 함',
     visualConcepts:'각 12~160자, 정확히 4개',
     scenes:'정확히 4개, headline 두 줄 각 9글자 이내, subline 간결, illustration 4개 종류 중 하나'},
    excludedTopics:recentTopicKeys,excludedOpenings:usedOpenings
   })}
  ]
 };
 return payload;
}
export async function generatePaidKoreanLifestyleStoryboard({
 apiKey,model,slotKst,recentTopicKeys,usedOpenings,
 gate,fetcher=fetch
}={}){
 assertGate(gate);
 if(typeof apiKey!=='string'||apiKey.length<20||typeof fetcher!=='function')
  throw NO('SERVER_SIDE_MODEL_PROVIDER_NOT_CONNECTED');
 const payload=buildKoreanStoryboardRequest({
  model,slotKst,recentTopicKeys,usedOpenings
 });
 let response;
 // Avoid blind retries when provider timed out and might already charge.
 try{response=await fetcher(API,{
  method:'POST',headers:{Authorization:'Bearer '+apiKey,
   'Content-Type':'application/json'},
  body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)
 })}
 catch{throw NO('AI_PROVIDER_CHARGE_STATE_RECONCILIATION_REQUIRED')}
 if(!response?.ok)throw NO('AI_PROVIDER_STATUS_RECONCILIATION_REQUIRED');
 let body;
 try{body=await response.json()}catch{throw NO('AI_MODEL_RESPONSE_UNREADABLE')}
 if(body?.status!=='completed'||body?.error||!Array.isArray(body.output))
  throw NO('AI_PROVIDER_RESPONSE_NOT_COMPLETED');
 const parts=body.output.flatMap(x=>x?.type==='message'?
   (x.content??[]).filter(c=>c?.type==='output_text').map(c=>c.text):[]);
 if(parts.length!==1||!legalText(parts[0])||parts[0].length>8000)
  throw NO('AI_PROVIDER_STRUCTURED_OUTPUT_INVALID');
 let draft;
 try{draft=JSON.parse(parts[0])}catch{throw NO('AI_PROVIDER_JSON_INVALID')}
 if(!draft||typeof draft!=='object'||Array.isArray(draft)||
  Object.keys(draft).sort().join(',')!==Object.keys(schema.properties).sort().join(',')||
  !topicKey(draft.topicKey)||
  ['situation','hook','thumbnailTitle'].some(k=>typeof draft[k]!=='string')||
  !Array.isArray(draft.narrationDraft)||draft.narrationDraft.length!==4||
  !draft.narrationDraft.every(legalText)||
  !draft.narrationDraft[0].startsWith(draft.situation)||!draft.narrationDraft[0].includes(draft.hook)||
  !Array.isArray(draft.visualConcepts)||draft.visualConcepts.length!==4||
  !draft.visualConcepts.every(legalText)||
  !Array.isArray(draft.scenes)||draft.scenes.length!==4||
  !draft.scenes.every(x=>x&&typeof x==='object'&&!Array.isArray(x)&&
    Object.keys(x).sort().join(',')==='headline,illustration,subline'&&
    Array.isArray(x.headline)&&x.headline.length===2&&
    x.headline.every(line=>typeof line==='string'&&
       Array.from(line.replaceAll(' ','')).length>=2&&
       Array.from(line.replaceAll(' ','')).length<=10)&&
    typeof x.subline==='string'&&x.subline.length<=40&&x.subline.length>=4&&
    ['clock','message','notes','rest'].includes(x.illustration)))
  throw NO('AI_PROVIDER_STORYBOARD_CONTRACT_FAILED');
 return Object.freeze(draft);
}
