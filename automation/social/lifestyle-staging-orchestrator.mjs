// Staging-only orchestration. Injected adapters allow offline contract tests.
// Never call a live SNS publisher, paid model, or write to user/payment tables.
// When connected to a real database, use service-only RPC behind the worker.
import {makeNovelLifestyleCandidate} from "./lifestyle-autogenerator.mjs";

const DAY=86400000;
const CHANNELS=Object.freeze(["facebook","instagram","threads","tiktok","youtube"]);
const halt=(reason,details={})=>Object.freeze({state:"BLOCKED",reason,
 publicationAllowed:false,paidGenerationAllowed:false,...details});
const validEntries=(data)=>Array.isArray(data)&&data.length<=1500&&data.every(item=>
 item&&typeof item.topicKey==="string"&&item.topicKey.trim()&&
 Array.isArray(item.narrationDraft)&&item.narrationDraft.length>=3&&
 item.narrationDraft.every(v=>typeof v==="string"&&v.trim())&&
 typeof item.createdAt==="string"&&Number.isFinite(Date.parse(item.createdAt)));

export function checkRemote90DayCoverage(snapshot,clockMs){
 if(!Number.isFinite(clockMs))return {ok:false,reason:"CLOCK_REQUIRED"};
 if(!snapshot||snapshot.source!=="verified-metricool-published-export"||
  snapshot.paginationComplete!==true||
  snapshot.hasPublishedHistory!==true)
  return {ok:false,reason:"VERIFIED_90_DAY_PUBLIC_HISTORY_REQUIRED"};
 const start=Date.parse(snapshot.from),through=Date.parse(snapshot.through),
  fetched=Date.parse(snapshot.fetchedAt);
 if(![start,through,fetched].every(Number.isFinite)||
    start>clockMs-90*DAY||through<clockMs-30*60000||
    through>clockMs+10*60000||fetched<clockMs-6*3600000||
    fetched>clockMs+10*60000)
  return {ok:false,reason:"STALE_OR_INCOMPLETE_HISTORY_WINDOW"};
 if(!Array.isArray(snapshot.channels)||
  CHANNELS.some(name=>!snapshot.channels.includes(name)))
  return {ok:false,reason:"CONNECTED_CHANNEL_HISTORY_INCOMPLETE"};
 if(!validEntries(snapshot.items))
  return {ok:false,reason:"NORMALIZED_PUBLIC_HISTORY_INVALID"};
 return {ok:true,count:snapshot.items.length};
}
export async function runOfflineStagingEditorialCycle({
 nowMs,remoteHistory,readStagingHistory,claimCandidate,generateCandidate,
 persistCandidate,hasApprovedReadOnlyProviders=false,offlineDryRun=false
}={}){
 if(offlineDryRun!==true)return halt("PAID_AND_PUBLISHING_LOCKED");
 if(hasApprovedReadOnlyProviders!==true)return halt("READ_ONLY_SOCIAL_SOURCE_NOT_CONNECTED");
 const coverage=checkRemote90DayCoverage(remoteHistory,nowMs);
 if(!coverage.ok)return halt(coverage.reason);
 if([readStagingHistory,claimCandidate,generateCandidate,persistCandidate]
    .some(fn=>typeof fn!=="function"))
  return halt("STAGING_WORKER_ADAPTERS_NOT_CONNECTED");
 let staging;
 try{staging=await readStagingHistory({atMs:nowMs})}
 catch{return halt("STAGING_HISTORY_FETCH_FAILED")}
 if(staging?.source!=="isolated-staging-review-ledger"||
   staging?.includesAllPublishedPlatforms!==false||
   staging?.truncated!==false||!validEntries(staging.items))
  return halt("STAGING_HISTORY_UNVERIFIED");
 const combined=[...staging.items,...remoteHistory.items];
 if(combined.length>1500)return halt("90_DAY_HISTORY_TOO_LARGE");
 let claim;
 try{claim=await claimCandidate({kind:"short-video",atMs:nowMs})}
 catch{return halt("ATOMIC_STAGING_CLAIM_FAILED")}
 const slotMs=Date.parse(claim?.candidate_slot);
 if(!claim||!(/^[a-f0-9]{64}$/i.test(claim?.claimed_job_key??""))||
  !Number.isFinite(slotMs)||slotMs<nowMs||slotMs>nowMs+48*3600000)
  return halt("INVALID_OR_MISSING_CLAIM");
 const editorial=await makeNovelLifestyleCandidate({
  atMs:slotMs,fetchHistory:async()=>combined,
  generator:generateCandidate,historyVerified:true,offlineDryRun:true
 });
 if(editorial.state!=="CANDIDATE_ONLY")
  return halt("GENERATED_DRAFT_NOT_REVIEWABLE",
    {draftReason:editorial.reason,validationReasons:editorial.validationReasons??[]});
 let saved;
 try{saved=await persistCandidate({
  claimed_job_key:claim.claimed_job_key,storyboard:editorial.storyboard
 })}
 catch{return halt("DURABLE_DRAFT_SAVE_FAILED_NO_AUTO_RETRY")}
 if(saved?.state!=="STAGING_REVIEW_ONLY"||saved?.publicationAllowed!==false||
  saved?.rightsVerified!==false||saved?.mediaReady!==false||
  saved?.jobKey!==claim.claimed_job_key)
  return halt("UNVERIFIED_DURABLE_DRAFT_RECEIPT");
 return Object.freeze({state:"STAGING_REVIEW_ONLY",jobKey:saved.jobKey,
   topicKey:editorial.topicKey,scheduledFor:saved.scheduledFor,
   mergedHistoryCount:combined.length,
   commercialRightsReviewNeeded:true,naturalVoiceReviewNeeded:true,
   actualMediaNotYetGenerated:true,publicationAllowed:false,
   paidGenerationAllowed:false,remotePublicationPerformed:false});
}
