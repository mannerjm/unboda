// Social publisher safety rules. No production cron or network writes.
import {createHash} from "node:crypto";
import {similarity} from "./safety.mjs";

export const CADENCE_HOURS=Object.freeze({"text-image":3,"short-video":6});
export const SAFE_BRAND_POSTS_PER_30D=500;
// Conservative provisional caps, NOT provider guaranteed limits.
// Live publishing requires a separate, freshly verified account-specific quota.
export const PROVIDER_ROLLING_24H=Object.freeze({
 instagram:40,facebook:24,"facebook-reels":24,threads:100,youtube:8,tiktok:8
});
export const CHANNELS=Object.freeze({
 "text-image":["instagram","facebook","threads"],
 "short-video":["instagram","facebook","tiktok","youtube"]
});
export const MAX_NETWORKS_PER_ORIGINAL=Object.freeze({"text-image":1,"short-video":2});

function normalize(value){return String(value??"").replace(/\s+/g," ").trim().toLocaleLowerCase("ko");}
export function contentId(post){
 return createHash("sha256").update([post.title,post.script,post.caption,post.mediaHash].map(normalize).join("|")).digest("hex");
}
export function shouldGenerateSlot({kind,now,lastSlotAt}){
 const every=CADENCE_HOURS[kind];
 if(!every)throw Error("UNKNOWN_OR_DISABLED_CONTENT_KIND");
 if(!Number.isFinite(now))throw Error("INVALID_CLOCK");
 if(lastSlotAt==null)return true;
 if(!Number.isFinite(lastSlotAt))throw Error("INVALID_PREVIOUS_SLOT");
 return now-lastSlotAt>=every*3600*1000;
}
// Pick the least recently used *eligible* channel; never random or 5-channel flooding.
// confirmedAccountQuotas and connected are backend-verified, not client claims.
export function selectChannels({kind,channels=[],maxNetworks=MAX_NETWORKS_PER_ORIGINAL[kind]}){
 if(!Object.hasOwn(CHANNELS,kind))throw Error("UNKNOWN_CONTENT_KIND");
 if(!Number.isInteger(maxNetworks)||maxNetworks<1||maxNetworks>MAX_NETWORKS_PER_ORIGINAL[kind])
  throw Error("INVALID_NETWORK_TARGET");
 return channels.filter(c=>CHANNELS[kind].includes(c.network)&&c.connected===true&&
   c.quotaConfirmed===true&&c.available===true&&Number.isFinite(c.lastPublishedAt))
  .sort((a,b)=>a.lastPublishedAt-b.lastPublishedAt||a.network.localeCompare(b.network))
  .slice(0,maxNetworks).map(c=>c.network);
}
export function evaluatePublisherGuard({
 kind,post,history,brandUsage,providerUsage,network,lockAcquired=false,verifiedMedia=false,
 accountQuotaConfirmed=false,verifiedEditorialHistory=false,expectedDeliveries=1
}){
 const reasons=[];
 if(!Object.hasOwn(CADENCE_HOURS,kind))reasons.push("UNKNOWN_OR_DISABLED_CONTENT_KIND");
 if(!post?.title||!post?.script||!post?.caption)reasons.push("INCOMPLETE_CONTENT");
 if(!Array.isArray(history)||!verifiedEditorialHistory||
    !history.every(x=>x&&typeof x==="object"))reasons.push("HISTORY_NOT_VERIFIED");
 if(!lockAcquired)reasons.push("IDEMPOTENCY_LOCK_MISSING");
 if(!verifiedMedia||!post?.mediaHash)reasons.push("MEDIA_NOT_VERIFIED");
 if(post?.originalOrLicensed!==true)reasons.push("ORIGINALITY_NOT_PROVEN");
 if(post?.factChecked!==true)reasons.push("EDITORIAL_QA_PENDING");
 if(kind==="short-video"&&(!Number.isFinite(post?.durationSeconds)||
    post.durationSeconds<15||post.durationSeconds>45))reasons.push("SHORT_DURATION_INVALID");
 if(!Number.isInteger(expectedDeliveries)||expectedDeliveries<1||expectedDeliveries>2)
  reasons.push("INVALID_DELIVERY_COUNT");
 if(!brandUsage||!Number.isInteger(brandUsage.posted)||!Number.isInteger(brandUsage.queued)||
  brandUsage.posted<0||brandUsage.queued<0)reasons.push("BRAND_USAGE_NOT_VERIFIED");
 else if(brandUsage.posted+brandUsage.queued+expectedDeliveries>SAFE_BRAND_POSTS_PER_30D)
  reasons.push("BRAND_MONTHLY_SAFETY_CAP");
 const quota=PROVIDER_ROLLING_24H[network];
 if(!CHANNELS[kind]?.includes(network)||!quota||!accountQuotaConfirmed||!providerUsage||
    !Number.isInteger(providerUsage.posted)||!Number.isInteger(providerUsage.queued)||
    providerUsage.posted<0||providerUsage.queued<0)
   reasons.push("NETWORK_QUOTA_NOT_VERIFIED");
 else if(providerUsage.posted+providerUsage.queued+1>quota)
   reasons.push("NETWORK_DAILY_SAFETY_CAP");
 if(Array.isArray(history)&&post){
  const id=contentId(post);
  if(history.some(p=>p.fingerprint===id||(p.topicKey&&post.topicKey&&p.topicKey===post.topicKey)))
   reasons.push("REUSED_CREATIVE_OR_TOPIC");
  else if(history.some(p=>p.script&&similarity(p.script,post.script)>0.62))
   reasons.push("REPETITIVE_SCRIPT");
 }
 return {ready:reasons.length===0,reasons:[...new Set(reasons)]};
}
