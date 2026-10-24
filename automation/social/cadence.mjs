// Dry-run-only scheduling guard. Does not call any publishing API.
// All values are defensive defaults until account-specific quotas and provider status are verified.
import {createHash} from "node:crypto";
import {similarity} from "./safety.mjs";

export const CADENCE_HOURS=Object.freeze({"text-image":2,"short-video":4,"long-video":6});
export const SAFE_BRAND_POSTS_PER_30D=500;
export const PROVIDER_ROLLING_24H=Object.freeze({instagram:45,"facebook-reels":28,threads:200,youtube:8});

function normalize(value){return String(value??"").replace(/\s+/g," ").trim().toLocaleLowerCase("ko");}
export function contentId(post){
 return createHash("sha256").update([post.title,post.script,post.caption,post.mediaHash].map(normalize).join("|")).digest("hex");
}
export function shouldGenerateSlot({kind,now,lastSlotAt}){
 const every=CADENCE_HOURS[kind];
 if(!every)throw Error("UNKNOWN_CONTENT_KIND");
 if(!Number.isFinite(now))throw Error("INVALID_CLOCK");
 if(lastSlotAt==null)return true;
 if(!Number.isFinite(lastSlotAt))throw Error("INVALID_PREVIOUS_SLOT");
 return now-lastSlotAt>=every*3600*1000;
}
export function evaluatePublisherGuard({
 kind,post,history,brandUsage,providerUsage,network,lockAcquired=false,verifiedMedia=false,
 accountQuotaConfirmed=false
}){
 const reasons=[];
 if(!Object.hasOwn(CADENCE_HOURS,kind))reasons.push("UNKNOWN_CONTENT_KIND");
 if(!post?.title||!post?.script||!post?.caption)reasons.push("INCOMPLETE_CONTENT");
 // History must come from a durable store and cover all published and queued content.
 if(!Array.isArray(history)||!history.every(x=>x&&typeof x==="object"))reasons.push("HISTORY_NOT_VERIFIED");
 if(!lockAcquired)reasons.push("IDEMPOTENCY_LOCK_MISSING");
 if(!verifiedMedia||!post?.mediaHash)reasons.push("MEDIA_NOT_VERIFIED");
 if(post?.originalOrLicensed!==true)reasons.push("ORIGINALITY_NOT_PROVEN");
 if(post?.factChecked!==true)reasons.push("EDITORIAL_QA_PENDING");
 if(kind==="short-video"&&(post?.durationSeconds<15||post?.durationSeconds>60))
  reasons.push("SHORT_DURATION_INVALID");
 if(kind==="long-video"&&(post?.durationSeconds<180||post?.durationSeconds>900||!post?.originalNarration))
  reasons.push("LONG_VIDEO_NOT_READY");
 if(!brandUsage||!Number.isInteger(brandUsage.posted)||!Number.isInteger(brandUsage.queued)||
  brandUsage.posted<0||brandUsage.queued<0)reasons.push("BRAND_USAGE_NOT_VERIFIED");
 else if(brandUsage.posted+brandUsage.queued>=SAFE_BRAND_POSTS_PER_30D)
  reasons.push("BRAND_MONTHLY_SAFETY_CAP");
 const quota=PROVIDER_ROLLING_24H[network];
 if(!quota||!accountQuotaConfirmed||!providerUsage||!Number.isInteger(providerUsage.posted)||
  !Number.isInteger(providerUsage.queued)||providerUsage.posted<0||providerUsage.queued<0)
  reasons.push("NETWORK_QUOTA_NOT_VERIFIED");
 else if(providerUsage.posted+providerUsage.queued>=quota)reasons.push("NETWORK_DAILY_SAFETY_CAP");
 if(Array.isArray(history)&&post){
  const id=contentId(post);
  if(history.some(p=>p.fingerprint===id||p.topicKey&&p.topicKey===post.topicKey))
   reasons.push("REUSED_CREATIVE_OR_TOPIC");
  else if(history.some(p=>p.script&&similarity(p.script,post.script)>0.62))
   reasons.push("REPETITIVE_SCRIPT");
 }
 return {ready:reasons.length===0,reasons:[...new Set(reasons)]};
}
