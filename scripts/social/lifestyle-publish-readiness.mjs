#!/usr/bin/env node
/**
 * UNBODA lifestyle seven-slot *preflight only*.
 * Never sends a Metricool POST, changes scheduled items, or sets any approved flag.
 * The live worker must independently rerun this guard, obtain an atomic claim,
 * perform a single provider request and verify post readback before declaring success.
 */
import fs from "node:fs";
import assert from "node:assert/strict";
const HOURS=["01","04","10","13","16","19","22"];
const PROVIDERS={ "01":"facebook","04":"instagram","10":"threads",
 "13":"facebook","16":"instagram","19":"threads","22":"facebook" };
const REAL_LICENSES=new Set([
 "CC0","Public domain","CC BY 4.0","CC BY 3.0","CC BY 2.5","CC BY 2.0",
 "CC BY-SA 4.0","CC BY-SA 3.0","CC BY-SA 2.5","CC BY-SA 2.0"
]);
function isDate(s){return typeof s==="string" && /^\d{4}-\d{2}-\d{2}$/.test(s)&&
new Date(s+"T00:00:00.000Z").toISOString().slice(0,10)===s}
function pointDay(date,hour){return Date.parse(date+"T"+hour+":00:00+09:00")}
function bytesLen(str){return [...String(str??"")].length}
function sha(s){return typeof s==="string"&&/^[0-9a-f]{64}$/.test(s)}
function sameMedia(a,b){return a===b}
function closePhash(a,b){if(!/^[0-9a-f]{16}$/.test(a??"")||!/^[0-9a-f]{16}$/.test(b??""))return false;
 let n=BigInt("0x"+a)^BigInt("0x"+b),cnt=0;
 while(n>0n){cnt++;n&=n-1n}return cnt<=6
}
export function inspectLifeReadiness({
 editorial,candidates,vision,media,history,existing,nowMs=Date.now(),catalog,atomicClaimReady=false
}){
 const issues=[];
 const block=(kind,hour,detail="")=>issues.push({kind,hour:hour??null,detail:String(detail).slice(0,160)});
 if(!editorial||!isDate(editorial.dateKst)||editorial.stories?.length!==7)
  return {state:"BLOCKED",ready:false,issues:[{kind:"INVALID_DATE_OR_SEVEN_EDITORIAL",hour:null}]};
 const date=editorial.dateKst, timeNow=Number(nowMs);
 if(!Number.isFinite(timeNow))block("INVALID_CLOCK");
 if(candidates?.dateKst!==date||vision?.dateKst!==date)block("SOURCE_DATE_MISMATCH");
 if(!Array.isArray(candidates?.photos)||!Array.isArray(vision?.photos))block("MISSING_PHOTO_QA");
 if(candidates?.publicationAllowed!==false || vision?.publicationAllowed!==false)
  block("CANDIDATE_MUST_REMAIN_PUBLICATION_BLOCKED");
 if(candidates?.rightsMachineChecked!==true)block("MISSING_LICENSE_VALIDATION");
 if(!catalog?.products?.length)block("PRODUCT_CATALOG_NOT_VERIFIED");
 const beforeDay=new Date(pointDay(date,"00")-86400000).toISOString().slice(0,10);
 const coverageStart=new Date(pointDay(date,"00")-90*86400000).toISOString().slice(0,10);
 if(!history?.complete||!isDate(history.checkedFrom)||!isDate(history.checkedThrough)||
    history.checkedFrom>coverageStart||history.checkedThrough<beforeDay)
  block("UNVERIFIED_NINETY_DAY_PUBLICATION_HISTORY");
 if(!Array.isArray(history?.media))block("MISSING_PERSISTENT_MEDIA_HISTORY");
 if(!Array.isArray(existing?.posts)||existing?.complete!==true ||existing.dateKst!==date)
  block("METRICOOL_ALL_SLOT_STATUS_UNCONFIRMED");
 if(!atomicClaimReady)block("NO_ATOMIC_ONE_SHOT_POST_CLAIM");
 const hrs=editorial.stories?.map(s=>s.hourKst);
 if(new Set(hrs).size!==7 || HOURS.some(h=>!hrs.includes(h)))block("INVALID_EDITORIAL_SLOT_SET");
 const cprod=new Map((catalog?.products??[]).map(p=>[p.id,p]));
 const indexed=new Map((vision?.photos??[]).map(v=>[v.hourKst,v]));
 const prepared=[];
 for(const hour of HOURS){
  const s=editorial.stories.find(x=>x.hourKst===hour);
  if(!s){block("NO_EDITORIAL_STORY",hour);continue;}
  const p=cprod.get(s.productId);
  if(!p||p.title!==s.productTitle||p.landingPath!==s.landingPath)
   block("UNVERIFIED_SELLABLE_PRODUCT",hour);
  if(typeof s.title!=="string" || typeof s.advice!=="string"||
     !s.advice.trim()||!s.topicKey?.includes(date.replaceAll("-","")))
   block("MISSING_OR_STALE_EDITORIAL",hour);
  const v=indexed.get(hour);
  if(!v ||v.automatedSceneMatch!==true||!v.bestCandidateFile)block("SCENE_QA_NOT_PASSED",hour);
  const independent=Array.isArray(v?.independentSceneChecks)&&
   v.independentSceneChecks.length>=2&&
   new Set(v.independentSceneChecks.map(x=>x.model)).size>=2&&
   v.independentSceneChecks.every(x=>x.pass===true &&
     typeof x.model==="string"&&x.model.length>0);
  if(!independent &&
    !(v?.humanVisualReviewed===true&&v?.visualReviewerId&&v?.visualReviewedAt))
   block("SECOND_INDEPENDENT_VISUAL_OR_HUMAN_REVIEW_MISSING",hour);
  const photo=(candidates?.photos??[]).find(c=>
   c.hourKst===hour&&c.file===v?.bestCandidateFile&&c.sha256===v?.candidateSha256);
  if(!photo||!sha(photo.sha256)||!/^[0-9a-f]{16}$/.test(photo.phash??"")||
     photo.width!==1080||photo.height!==1350||
     !Number.isInteger(photo.bytes)||photo.bytes>=4_900_000||photo.bytes<=10000)
   block("MEDIA_HASH_SIZE_PIXEL_OR_SOURCE_MISMATCH",hour);
  if(!photo?.rights||!REAL_LICENSES.has(photo.rights.license)||!photo.rights.licenseUrl?.startsWith("https://creativecommons.org/"))
   block("INVALID_COMMERCIAL_MEDIA_RIGHTS",hour);
  if(photo?.rights?.license?.startsWith("CC BY")&&!photo.rights.artist?.trim())
   block("AUTHOR_ATTRIBUTION_MISSING",hour);
  if(!photo?.sourcePage?.startsWith("https://commons.wikimedia.org/"))
   block("PHOTO_SOURCE_NOT_COMMONS",hour);
  const mediaItem=(media?.files??[]).find(x=>x.hourKst===hour);
  if(!mediaItem||!mediaItem.verifiedPublicMedia||!mediaItem.publicUrl?.startsWith("https://")||
     !sha(mediaItem.sha256)||!sameMedia(photo?.sha256,mediaItem.sha256)||
     mediaItem.mime!=="image/jpeg"|| mediaItem.bytes>=4_900_000)
   block("PUBLIC_HOSTED_MEDIA_NOT_VERIFIED",hour);
  if((history?.media??[]).some(item=>sha(item.sha256)&&
     (item.sha256===photo?.sha256||closePhash(item.phash,photo?.phash)) &&
     isDate(item.dateKst)&&item.dateKst<date &&
     pointDay(date,"00")-pointDay(item.dateKst,"00")<=90*86400_000))
   block("NINETY_DAY_PHOTO_DUPLICATE",hour);
  const related=(existing?.posts??[]).filter(q=>
    q.hourKst===hour&&q.dateKst===date&&q.network===PROVIDERS[hour]);
  if(related.length>0)block("SLOT_ALREADY_RESERVED_OR_ATTEMPTED_DO_NOT_REPOST",hour);
  const credit=photo?.rights?.license?.startsWith("CC BY")
   ?"사진: "+photo.rights.artist+" / "+photo.rights.license+" ("+photo.rights.licenseUrl+")":"";
  const caption=[s.title,s.lifeSituation,s.advice,"운보다 무료 사주: "+s.productCta,credit]
   .filter(Boolean).join("\n");
  if(bytesLen(caption)>450||!caption.includes("운보다")||!caption.includes(s.productTitle))
   block("CAPTION_TOO_LONG_OR_PRODUCT_DISCONNECTED",hour,bytesLen(caption));
  if(photo?.rights?.shareAlikeAdaptationRequired &&
    (!credit.includes("CC BY-SA")||!caption.includes(photo.rights.licenseUrl)))
   block("SHARE_ALIKE_CREDIT_NOT_IN_CAPTION",hour);
  if(Number.isFinite(timeNow)&&timeNow>=pointDay(date,hour)-30*60_000)
   block("LATE_SCHEDULE_WINDOW_NO_RETRY",hour);
  prepared.push({dateKst:date,hourKst:hour,network:PROVIDERS[hour],
    topicKey:s.topicKey,photoSha256:photo?.sha256??null,
    photoPhash:photo?.phash??null,photoSourcePage:photo?.sourcePage??null,
    photoAttribution:credit,mediaUrl:mediaItem?.publicUrl??null,
    caption,captionLength:bytesLen(caption)});
 }
 if(new Set(prepared.map(p=>p.photoSha256)).size!==7)
  block("PHOTO_REUSE_WITHIN_SAME_DAY");
 const monthlyCount=(existing?.monthTotal??0);
 if(!Number.isInteger(monthlyCount)||monthlyCount<0||monthlyCount+7>600)
  block("MONTHLY_SNS_LIMIT_EXCEEDED");
 return {state:issues.length===0?"PREFLIGHT_GATES_PASSED_NOT_PUBLISHED":"BLOCKED",
  ready:issues.length===0, dateKst:date,
  issues,prepared:issues.length===0?prepared:[],
  expectedSlots:7,approvedPhotos:prepared.filter(p=>p.photoSha256).length,
  publishAttempted:false,bookingAttempted:false};
}
function parseArgs(arr){
 return Object.fromEntries(arr.filter(s=>s.startsWith("--")&&s.includes("="))
  .map(s=>{const i=s.indexOf("=");return[s.slice(2,i),s.slice(i+1)]}));
}
if(process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\","/"))){
 const args=parseArgs(process.argv.slice(2));
 const read=(key)=>args[key]?JSON.parse(fs.readFileSync(args[key],"utf8")):null;
 const response=inspectLifeReadiness({
  editorial:read("editorial"),candidates:read("candidates"),
  vision:read("vision"),media:read("media"),history:read("history"),
  existing:read("existing"),catalog:read("catalog"),
  atomicClaimReady:args["claim-ready"]==="true"
 });
 if(args.output)fs.writeFileSync(args.output,JSON.stringify(response,null,2)+"\n");
 console.log("UNBODA_LIFESTYLE_PREFLIGHT "+JSON.stringify({date:response.dateKst,
  state:response.state,issues:response.issues.map(e=>e.kind+"@"+(e.hour??"global")),
  publishAttempted:false}));
 // Missing data is ordinary fail-closed, not a network request; CI may alert from exit 2.
 if(!response.ready)process.exitCode=2;
}
