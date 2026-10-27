// Additional similarity guard against actual observed SNS posts.
// This NEVER certifies complete 90-day history, commercial approval or publication.
import {contentSimilarity} from "./lifestyle-autogenerator.mjs";
const names=new Set(["facebook","instagram","threads","tiktok","youtube"]);
const cleaned=s=>String(s??"").normalize("NFKC").replace(/https?:\/\/\S+/g," ")
 .replace(/#[가-힣\p{L}\p{N}_]+/gu," ").replace(/\s+/g," ").trim();
const length=s=>Array.from(String(s??"").replace(/[^가-힣a-z0-9]/gi,"")).length;
const fragments=s=>{
 const t=cleaned(s);
 const pieces=t.split(/[.!?。！？\n]+/).map(x=>x.trim())
  .filter(x=>length(x)>=14 && length(x)<=280);
 // Long provider captions can hold more than one sentence and useful overlap.
 return [...new Set([t.slice(0,280),...pieces])].slice(0,80);
};
export function checkObservedPublicOriginality(storyboard,record){
 if(record?.source!=="isolated-staging-public-post-observations"||
   record?.verified90DayCoverage!==false||record?.allProviderPagesVerified!==false||
   record?.truncated!==false||!Array.isArray(record.items)||record.items.length>1500)
  return {ok:false,reasons:["UNVERIFIED_OBSERVED_SOCIAL_CORPUS"],full90DayVerified:false};
 if(record.items.some(v=>!v||!names.has(v.network)||
   typeof v.postText!=="string"||v.postText.length>12000||
   typeof v.providerId!=="string"||!v.providerId))
  return {ok:false,reasons:["MALFORMED_OBSERVED_SOCIAL_POST"],full90DayVerified:false};
 const cues=[storyboard?.hook,...(Array.isArray(storyboard?.narrationDraft)?
  storyboard.narrationDraft.slice(0,3):[])].filter(x=>typeof x==="string"&&length(x)>=16);
 if(cues.length<3)
  return {ok:false,reasons:["INSUFFICIENT_STORYBOARD_FOR_SOCIAL_DUPLICATE_CHECK"],full90DayVerified:false};
 let hit;
 for(const post of record.items){
  const sections=fragments(post.postText);
  for(const cue of cues){
   const target=cleaned(cue);
   for(const part of sections){
    const similarity=contentSimilarity(target,part);
    if(similarity>=0.81||((length(target)>=22)&&length(part)>=22&&
       (part.includes(target)||target.includes(part)))){
      hit={network:post.network,providerId:post.providerId,similarity:+similarity.toFixed(3)};
      break;
    }
   }
   if(hit)break;
  }
  if(hit)break;
 }
 return Object.freeze({
  ok:!hit,reasons:hit?["SIMILAR_TO_ACTUAL_OBSERVED_POST"]:[],
  observedCount:record.items.length,
  ...(hit?{matchedNetwork:hit.network,matchedProviderId:hit.providerId,
    matchedSimilarity:hit.similarity}:{}),
  full90DayVerified:false,publicationAllowed:false
 });
}
