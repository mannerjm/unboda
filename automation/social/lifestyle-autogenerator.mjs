// Independent lifestyle-original candidate validator. No SNS writes, TTS calls,
// media generation, or approved-publication shortcut.
// A provider adapter may be passed only after separate budget and rights gates.
import {createHash} from "node:crypto";
import {reviewLifestyleVideoScript,FOUR_KST_TIMES} from "./lifestyle-video-planner.mjs";
const DAY=86400000;
const BAD=/100\s*%|절대\s*성공|수익\s*보장|완치|투자\s*확정|운명\s*확정|반드시\s*재회|무료\s*구매/i;
const normalize=text=>String(text??"").normalize("NFKC").toLowerCase()
 .replace(/[^가-힣a-z0-9]/g,"");
function grams(s){
 const x=normalize(s);const output=new Set();
 for(let i=0;i<=x.length-4;i++)output.add(x.slice(i,i+4));
 return output;
}
export function contentSimilarity(a,b){
 const x=grams(a),y=grams(b);
 if(!x.size||!y.size)return 0;
 let common=0;for(const k of x)if(y.has(k))common++;
 return (2*common)/(x.size+y.size);
}
function narrativeValue(c){
 return Array.isArray(c?.narrationDraft)?c.narrationDraft.slice(0,3).join(" "):"";
}
function isValidHistory(history,now){
 return Array.isArray(history)&&history.length<=1500&&history.every(row=>{
  if(!row||typeof row.topicKey!=="string"||!row.topicKey.trim()||
     !Array.isArray(row.narrationDraft)||row.narrationDraft.length<3||
     row.narrationDraft.some(x=>typeof x!=="string"||!x.trim())||
     !Number.isFinite(Date.parse(row.createdAt)))return false;
  const age=now-Date.parse(row.createdAt);
  return age>=-DAY && age<=90*DAY;
 });
}
export function assessNovelLifestyleCandidate(candidate,{history,nowMs}={}){
 const reasons=[];
 if(!candidate||typeof candidate!=="object"||Array.isArray(candidate))
  return {ok:false,reasons:["INVALID_GENERATOR_RESPONSE"]};
 const {topicKey,situation,hook,narrationDraft,visualConcepts,thumbnailTitle}=candidate;
 if(typeof topicKey!=="string"||!/^[a-z0-9][a-z0-9:_-]{7,99}$/.test(topicKey))
  reasons.push("INVALID_TOPIC_ID");
 if(typeof hook!=="string"||hook.trim().length<12||hook.length>90)
  reasons.push("HOOK_INVALID");
 if(!Array.isArray(visualConcepts)||visualConcepts.length!==4||
    visualConcepts.some(v=>typeof v!=="string"||v.trim().length<12||v.length>160))
  reasons.push("FOUR_ORIGINAL_SCENE_BRIEFS_REQUIRED");
 if(typeof thumbnailTitle!=="string"||thumbnailTitle.trim().length<5||
    thumbnailTitle.trim().length>26||/[<>]/.test(thumbnailTitle))
  reasons.push("THUMBNAIL_TITLE_INVALID");
 const editorial=reviewLifestyleVideoScript({situation,narrationDraft});
 reasons.push(...editorial.reasons);
 const body=Array.isArray(narrationDraft)?narrationDraft.join(" "):"";
 if(BAD.test(body)||BAD.test(String(thumbnailTitle??"")))
  reasons.push("UNVERIFIED_OR_MISLEADING_PREDICTION");
 if(!Number.isFinite(nowMs)||!isValidHistory(history,nowMs))
  reasons.push("VERIFIED_90_DAY_HISTORY_REQUIRED");
 else{
  if(history.some(row=>row.topicKey===topicKey))
   reasons.push("REPEATED_90_DAY_TOPIC_KEY");
  if(history.some(row=>contentSimilarity(narrativeValue(row),narrativeValue(candidate))>=0.74))
   reasons.push("REPEATED_90_DAY_NARRATION");
  if(history.some(row=>contentSimilarity(row.narrationDraft[0],narrationDraft?.[0])>=0.84))
   reasons.push("REPEATED_90_DAY_OPENING");
 }
 const hash=createHash("sha256").update(normalize(narrativeValue(candidate))).digest("hex");
 return Object.freeze({ok:reasons.length===0,reasons,hash,
  promotionalSharePercent:editorial.promotionalSharePercent,
  editorialPassed:editorial.ok,mediaVerified:false,publishApproved:false});
}
export async function makeNovelLifestyleCandidate({atMs,fetchHistory,generator,
 maxAttempts=3,timeoutMs=20000,historyVerified=false,offlineDryRun=false}={}){
 const fail=(reason,extra={})=>Object.freeze({state:"BLOCKED",reason,publicationAllowed:false,...extra});
 if(!Number.isFinite(atMs))return fail("SCHEDULE_TIMESTAMP_REQUIRED");
 const local=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",
  year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",
  hourCycle:"h23"}).format(atMs);
 if(!FOUR_KST_TIMES.includes(local.slice(11,16)))return fail("NOT_FIXED_KST_VIDEO_SLOT");
 if(typeof fetchHistory!=="function"||historyVerified!==true)
  return fail("HISTORY_LEDGER_NOT_CONNECTED");
 if(typeof generator!=="function")return fail("ORIGINAL_STORY_GENERATOR_NOT_CONNECTED");
 if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3)
  return fail("INVALID_RETRY_CAP");
 if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>30000)
  return fail("INVALID_GENERATION_TIMEOUT");
 // Paid API calls MUST be authorized by a separate budget reservation layer.
 if(offlineDryRun!==true)return fail("PAID_AND_PROVIDER_EXECUTION_LOCKED");
 let history;
 try{history=await fetchHistory({from:new Date(atMs-90*DAY).toISOString(),
   to:new Date(atMs).toISOString(),includeDrafts:true});}
 catch{return fail("HISTORY_LOOKUP_FAILED");}
 if(!isValidHistory(history,atMs))return fail("VERIFIED_90_DAY_HISTORY_REQUIRED");
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  let proposal;
  try{
   let timeoutId;
   try{
    proposal=await Promise.race([
     Promise.resolve().then(()=>generator({slotKst:local,attempt,
       recentTopicKeys:history.map(x=>x.topicKey),
       usedOpenings:history.map(x=>x.narrationDraft[0])})),
     new Promise((_,reject)=>{
      timeoutId=setTimeout(()=>reject(Error("GENERATOR_TIMEOUT")),timeoutMs);
     })
    ]);
   }finally{clearTimeout(timeoutId);}
  }catch{return fail("GENERATOR_UNAVAILABLE_OR_TIMEOUT",{attempts:attempt});}
  const result=assessNovelLifestyleCandidate(proposal,{history,nowMs:atMs});
  if(result.ok){
   return Object.freeze({state:"CANDIDATE_ONLY",slotKst:local,attempts:attempt,
    topicKey:proposal.topicKey,hash:result.hash,storyboard:proposal,
    requiresCommercialRightsReview:true,requiresNaturalKoreanVoice:true,
    requiresThumbnailAndCaptionQA:true,requiresVideoMediaVerification:true,
    publicationAllowed:false,mediaGenerationAllowed:false});
  }
  if(attempt===maxAttempts)
   return fail("NO_APPROVABLE_ORIGINAL_CANDIDATE",{attempts:attempt,
    validationReasons:result.reasons});
 }
 return fail("CANDIDATE_GENERATION_EXHAUSTED");
}
