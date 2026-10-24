// Editorial brief builder: no LLM or paid API call occurs in this module.
// Every creative must pass independently sourced/fact-reviewed copy and media gates.
export const TOPIC_PILLARS=Object.freeze([
 {key:"zodiac",label:"12띠 이야기",examples:["12띠의 전통적 상징","띠 궁합이 전부가 아닌 이유","입춘과 띠의 관계"]},
 {key:"four-pillars",label:"사주 기초",examples:["년주·월주·일주·시주","태어난 시간을 모를 때","오행이 뜻하는 전통적 상징"]},
 {key:"dreams",label:"꿈해몽 민속",examples:["용꿈을 특별하게 보는 까닭","뱀꿈의 다양한 민속적 상징","물꿈과 전통적 해석의 한계"]},
 {key:"compatibility",label:"궁합과 대화",examples:["궁합과 실제 관계의 차이","친구 사이 소통","연애와 가족 대화의 질문"]},
 {key:"seasons",label:"절기와 운세 이야기",examples:["입춘의 의미","절기와 전통 달력","계절을 돌아보는 질문"]},
 {key:"myths",label:"사주 오해 바로잡기",examples:["사주가 미래를 확정하지 않는 이유","같은 생일과 다른 삶","오행을 성격으로 단정하면 안 되는 이유"]},
 {key:"habits",label:"일상 자기 성찰",examples:["돈 관리 습관을 돌아보기","일과 휴식의 균형","선택 앞에서 묻는 질문"]}
]);
export const CONTENT_MIX=Object.freeze({educational:70,interactive:20,brand:10});
const DISCLAIMER="전통적 해석에 관한 참고 정보이며, 결과를 보장하거나 전문적인 의학·금융·법률 조언을 대신하지 않습니다.";
export function createEditorialBrief({kind,slotIndex,recentTopicKeys=[]}){
 if(!["text-image","short-video"].includes(kind))throw Error("KIND_DISABLED_OR_UNKNOWN");
 if(!Number.isSafeInteger(slotIndex)||slotIndex<0)throw Error("INVALID_SLOT");
 if(!Array.isArray(recentTopicKeys))throw Error("HISTORY_REQUIRED");
 const candidates=TOPIC_PILLARS.flatMap(p=>p.examples.map((angle,i)=>({
  topicKey:p.key+":"+i,category:p.key,pillar:p.label,angle
 }))).filter(c=>!recentTopicKeys.includes(c.topicKey));
 if(!candidates.length)throw Error("TOPIC_POOL_EXHAUSTED_NEEDS_NEW_RESEARCH");
 const topic=candidates[slotIndex%candidates.length];
 const formatClass=slotIndex%10===0?"brand":slotIndex%10<=2?"interactive":"educational";
 return Object.freeze({
  ...topic,kind,formatClass,
  targetSeconds:kind==="short-video"?30:null,
  destination:"https://unboda.kr",
  disclaimer:DISCLAIMER,
  verifiedSiteCapabilities:["무료 사주 조회","유료 심층 분석","AI 상담"],
  editorialRestrictions:[
   "띠·꿈해몽을 전통·민속적 상징으로 명확히 구분하고 현대 과학적 예언으로 단정하지 말 것",
   "운보다에 없는 꿈해몽 서비스를 실제 판매 중인 것처럼 소개하지 말 것",
   "이해하기 쉬운 한국어, 내용 자체가 유익한 새로운 사례와 설명",
   "반복되는 광고 문구, 수익 보장, 건강·관계의 단정, 공포 조장 금지"
  ]
 });
}
export function creativePrompt(brief){
 if(!brief||!["text-image","short-video"].includes(brief.kind))throw Error("INVALID_BRIEF");
 return [
  "당신은 한국어 사주·전통문화 교육 채널의 신중한 전문 편집자입니다.",
  "아래 주제를 실제로 배우는 느낌이 들도록 새롭고 정확하게 설명하세요. 사주는 과학적으로 입증된 미래 예측이라는 주장을 하지 마세요.",
  "오래된 전통적 해석과 확인 가능한 사실, 현대적 생각을 구분하세요. 확인 어려운 한자·역사 주장은 만들지 마세요.",
  "상품 홍보보다 학습 가치 우선. 종결부 운보다 홈페이지 자연스러운 안내는 1회 이내.",
  "최종 결과를 JSON 객체로만 반환하세요: title, script, caption, educationalValue, evidenceNotes, imagePrompt, scenes.",
  "scenes는 short-video에만 4개. 각 장면은 seconds, visualPrompt, voiceover, onScreenText를 포함.",
  "외부 저작권 자산을 요구하지 말고 직접 제작한 장면이나 명확히 허가된 자산만 사용하세요.",
  "일반 사용자가 이해하기 쉬운 말 사용. 필수 참고 문구: "+brief.disclaimer,
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
