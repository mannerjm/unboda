// Development-only editorial planner: shared JSON policy, no paid generation or posting.
import {readFileSync} from "node:fs";
export const LIFESTYLE_POLICY=Object.freeze(JSON.parse(
 readFileSync(new URL("./lifestyle-content-policy.v1.json",import.meta.url),"utf8")
));
export const CONTENT_MIX=Object.freeze({...LIFESTYLE_POLICY.editorial.mixPercent});
export const TOPIC_PILLARS=Object.freeze(Object.entries(
 LIFESTYLE_POLICY.editorial.pillars).map(([key,entry])=>Object.freeze({
 key,label:entry.label,examples:Object.freeze([...entry.examples])
})));
const ORDER=Object.keys(CONTENT_MIX);
const PERIOD=20;
const QUOTAS=Object.freeze(Object.fromEntries(
 ORDER.map(key=>[key,CONTENT_MIX[key]/5])));
if(ORDER.reduce((sum,key)=>sum+CONTENT_MIX[key],0)!==100||
   ORDER.some(key=>!Number.isInteger(QUOTAS[key])))
 throw Error("EDITORIAL_WEIGHTS_MUST_BE_5_PERCENT_INCREMENTS");
function makeBalancedRotation(){
 const used=Object.fromEntries(ORDER.map(key=>[key,0]));
 const sequence=[];
 for(let i=0;i<PERIOD;i++){
  const ranked=ORDER.filter(key=>used[key]<QUOTAS[key]).sort((a,b)=>
   ((i+1)*QUOTAS[b]/PERIOD-used[b])-
   ((i+1)*QUOTAS[a]/PERIOD-used[a]));
  const winner=ranked[0];
  if(!winner)throw Error("INVALID_EDITORIAL_ROTATION");
  used[winner]++;
  sequence.push(winner);
 }
 return Object.freeze(sequence);
}
export const LIFESTYLE_ROTATION=makeBalancedRotation();
const DISCLAIMER="전통적 해석에 관한 참고 정보이며, 결과를 보장하거나 전문적인 의학·금융·법률 조언을 대신하지 않습니다.";
export function createEditorialBrief({kind,slotIndex,recentTopicKeys=[]}){
 if(!["text-image","short-video"].includes(kind))throw Error("KIND_DISABLED_OR_UNKNOWN");
 if(!Number.isSafeInteger(slotIndex)||slotIndex<0)throw Error("INVALID_SLOT");
 if(!Array.isArray(recentTopicKeys))throw Error("HISTORY_REQUIRED");
 const category=LIFESTYLE_ROTATION[slotIndex%LIFESTYLE_ROTATION.length];
 const pillar=TOPIC_PILLARS.find(p=>p.key===category);
 const candidates=pillar.examples.map((angle,i)=>({
  topicKey:pillar.key+":"+i,category:pillar.key,pillar:pillar.label,angle
 })).filter(c=>!recentTopicKeys.includes(c.topicKey));
 if(!candidates.length)throw Error("TOPIC_POOL_EXHAUSTED_NEEDS_NEW_RESEARCH");
 // A repeated concept is not a freshly authored post; downstream semantic QA
 // and 90-day published/queued history are mandatory before scheduling.
 const topic=candidates[Math.floor(slotIndex/PERIOD)%candidates.length];
 const formatClass=category==="brand"?"brand":
   category==="practicalSaju"?"educational":"practical";
 return Object.freeze({
  ...topic,kind,formatClass,
  hook:topic.angle,
  policyId:LIFESTYLE_POLICY.policyId,
  lifestyleFirst:category!=="practicalSaju",
  doNotAutoPublish:true,
  targetSeconds:kind==="short-video"?30:null,
  destination:"https://unboda.kr",
  disclaimer:DISCLAIMER,
  verifiedSiteCapabilities:["무료 사주 조회","유료 심층 분석","AI 상담"],
  editorialRestrictions:[
   "띠·꿈해몽을 전통·민속적 상징으로 명확히 구분하고 현대 과학적 예언으로 단정하지 말 것",
   "운보다에 없는 꿈해몽 서비스를 실제 판매 중인 것처럼 소개하지 말 것",
   "누구나 겪는 생활 속 구체적인 고민을 첫 문장으로 사용하고 실제 도움이 되는 점검 포인트 1~3개 포함",
   "기존 예약물은 절대 변경하지 않고, 90일간 게시·예약 콘텐츠의 제목·본문·이미지 유사도를 검사",
   "이해하기 쉬운 한국어, 내용 자체가 유익한 새로운 사례와 설명",
   "반복되는 광고 문구, 수익 보장, 건강·관계의 단정, 공포 조장 금지"
  ]
 });
}
export function creativePrompt(brief){
 if(!brief||!["text-image","short-video"].includes(brief.kind))throw Error("INVALID_BRIEF");
 return [
  "당신은 한국어 사주·전통문화 교육 채널의 신중한 전문 편집자입니다.",
  "무조건 사주 용어의 정의부터 시작하지 말고, 현실의 연애·직장·돈·가족 고민을 첫 문장에 놓고 구체적인 생활 팁으로 답하세요.",
  "사주는 현대적 사실이나 확정적 미래 예측이 아니라 자기성찰에 참고하는 전통 해석입니다.",
  "오래된 전통적 해석과 확인 가능한 사실, 현대적 생각을 구분하세요. 확인 어려운 한자·역사 주장은 만들지 마세요.",
  "상품 홍보보다 실용 정보와 신뢰 우선. 직접 사이트 방문 CTA는 일부 게시물에만; 불필요한 링크 반복 금지.",
  "후킹 제목은 구체적인 생활 상황, 이미지 텍스트 중복·잘림 없는 디자인, 플랫폼별 톤을 사용합니다.",
  "최종 결과를 JSON 객체로만 반환하세요: title, script, caption, educationalValue, evidenceNotes, imagePrompt, scenes.",
  "scenes는 short-video에만 4개. 각 장면은 seconds, visualPrompt, voiceover, onScreenText를 포함.",
  "외부 저작권 자산을 요구하지 말고 직접 제작한 장면이나 명확히 허가된 자산만 사용하세요.",
  "일반 사용자가 이해하기 쉬운 말 사용. 필수 참고 문구: "+brief.disclaimer,
  "생활형 콘텐츠 정책(JSON): "+JSON.stringify({mix:LIFESTYLE_POLICY.editorial.mixPercent,quality:LIFESTYLE_POLICY.safety}),
  "작업지시(JSON): "+JSON.stringify(brief)
 ].join("\n");
}
export function validateCreativeDraft(draft,brief){
 const reasons=[];
 if(!draft||typeof draft!=="object"||Array.isArray(draft))return {ok:false,reasons:["INVALID_DRAFT"]};
 for(const field of ["title","script","caption","educationalValue","imagePrompt"]){
  if(typeof draft[field]!=="string"||draft[field].trim().length<(field==="title"?8:field==="imagePrompt"?30:field==="educationalValue"?30:50))
   reasons.push("INVALID_"+field.toUpperCase());
 }
 if(typeof draft.title==="string"&&/^(사주(?:에서|의)|용신|지장간|십성|천간|지지|일간|일주|상생|상극)/.test(draft.title.trim()))
  reasons.push("LIFESTYLE_HOOK_REQUIRED");
 if(!draft.script?.includes("참고")&&!draft.caption?.includes("참고"))
  reasons.push("DISCLAIMER_MISSING");
 if(!Array.isArray(draft.evidenceNotes)||draft.evidenceNotes.length<1)
  reasons.push("FACT_REVIEW_SOURCES_REQUIRED");
 if(brief.kind==="short-video"){
  if(!Array.isArray(draft.scenes)||draft.scenes.length!==4)reasons.push("FOUR_SCENES_REQUIRED");
  else{
   let sec=0;
   for(const s of draft.scenes){
    if(!Number.isFinite(s.seconds)||s.seconds<3||s.seconds>15||
       !s.voiceover||!s.visualPrompt||!s.onScreenText)reasons.push("SCENE_INVALID");
    sec+=s.seconds||0;
   }
   if(sec<15||sec>45)reasons.push("VIDEO_DURATION_OUT_OF_RANGE");
  }
 }
 if(!brief.topicKey||!brief.disclaimer)reasons.push("BRIEF_NOT_VERIFIED");
 return {ok:reasons.length===0,reasons:[...new Set(reasons)]};
}
// Generator interface may be backed by a paid LLM later, but no unauthorized spending.
// The returned raw draft is NOT editorial-approved and must not be auto-published.
export async function generateEditorialCandidate({kind,slotIndex,recentTopicKeys=[],generator}){
 if(typeof generator!=="function")return {state:"BLOCKED",reason:"GENERATOR_NOT_CONNECTED"};
 const brief=createEditorialBrief({kind,slotIndex,recentTopicKeys});
 const raw=await generator(creativePrompt(brief));
 let draft;
 try{draft=typeof raw==="string"?JSON.parse(raw):raw;}
 catch{return {state:"BLOCKED",reason:"MALFORMED_GENERATION"};}
 const validation=validateCreativeDraft(draft,brief);
 return {state:validation.ok?"NEEDS_EDITORIAL_QA":"BLOCKED",brief,draft,validation};
}
