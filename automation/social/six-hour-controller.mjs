// Six-hour UNBODA cloud-only video job planner.
// No timers, no posting, no Runway spending by module import.
// Scheduled by a future durable cloud runner with locked job state;
// user never reviews or transfers individual clips.
import {createHash} from "node:crypto";
export const VIDEO_INTERVAL_MS=6*60*60*1000;
export const VIDEO_LOOKAHEAD_MS=48*60*60*1000;
export const ONE_RUNWAY_SOURCE_CREDITS=50;
export const ESTIMATED_KOREAN_VOICE_CREDITS=3;
export const ESTIMATED_30_DAY_CREDITS=120*(ONE_RUNWAY_SOURCE_CREDITS+ESTIMATED_KOREAN_VOICE_CREDITS);
const ANCHOR=Date.parse("2026-10-24T20:00:00+09:00");
export function nextSixHourSlots({now,lookaheadHours=48}={}){
 const start=typeof now==="string"?Date.parse(now):now;
 if(!Number.isFinite(start)||!Number.isInteger(lookaheadHours)||
   lookaheadHours<6||lookaheadHours>48)
  throw Error("INVALID_PLANNING_WINDOW");
 const first=Math.floor((start-ANCHOR)/VIDEO_INTERVAL_MS)+1;
 const slots=[];
 const until=start+lookaheadHours*3600_000;
 for(let i=Math.max(0,first);i<first+10;i++){
  const time=ANCHOR+i*VIDEO_INTERVAL_MS;
  if(time>until)break;
  const date=new Date(time).toISOString();
  slots.push({slotId:"unboda-video-"+date.slice(0,16).replace(/[T:-]/g,""),
   dueAt:date,
   kind:"short-video",
   publishNetworksMax:2});
 }
 return slots;
}
export function monthlyVideoCreditProjection({
 videosPerDay=4,days=30,baseMotion=50,voiceCredits=3
}={}){
 if([videosPerDay,days,baseMotion,voiceCredits].some(v=>!Number.isSafeInteger(v)||v<0))
  throw Error("INVALID_COST_PROJECTION");
 return {videos:videosPerDay*days,
  minimumCredits:videosPerDay*days*(baseMotion+voiceCredits),
  excludesReRenders:true,excludesMediaAndComputeStorage:true,
  isGuaranteedInvoice:false};
}
export function headlessReleaseReadiness({
 permanentSourceAvailable=false,finalVideoReady=false,
 koreanNarrationVerified=false,commercialRightsVerified=false,
 cloudWorkerConnected=false,cloudSchedulerKind=null,
 durableQueueAndLockConnected=false,bufferAutomaticModeVerified=false,
 bufferRemoteReconciliationVerified=false,bufferQueueCapacityVerified=false,
 ownerApprovedMonthlyCredits=0,
 currentCredits,creditsSpentThisMonth=0,creditsReserved=0,
 autoBillingEnabled=false
}={}){
 const reasons=[];
 if(!permanentSourceAvailable)reasons.push("SOURCE_STORAGE_MISSING");
 if(!finalVideoReady)reasons.push("FINAL_VIDEO_MISSING");
 if(!koreanNarrationVerified)reasons.push("NATURAL_KOREAN_VOICE_QA_MISSING");
 if(!commercialRightsVerified)reasons.push("COMMERCIAL_RIGHTS_UNVERIFIED");
 if(!cloudWorkerConnected)reasons.push("CLOUD_WORKER_NOT_CONNECTED");
 if(!durableQueueAndLockConnected)reasons.push("DURABLE_QUEUE_LEDGER_NOT_CONNECTED");
 if(!bufferAutomaticModeVerified)reasons.push("BUFFER_AUTOMATIC_WRITE_NOT_VERIFIED");
 if(!bufferRemoteReconciliationVerified)reasons.push("BUFFER_PUBLICATION_CHECK_NOT_VERIFIED");
 if(!bufferQueueCapacityVerified)reasons.push("BUFFER_FREE_QUEUE_LIMIT_NOT_CHECKED");
 if(!["vercel-pro-cron","supabase-cron","github-actions-prod"].includes(cloudSchedulerKind))
  reasons.push("SIX_HOUR_CLOUD_SCHEDULER_MISSING");
 if(!Number.isSafeInteger(ownerApprovedMonthlyCredits)||ownerApprovedMonthlyCredits<=0)
  reasons.push("ONE_TIME_MONTHLY_CREDIT_CEILING_REQUIRED");
 if(!Number.isSafeInteger(currentCredits)||currentCredits<0)
  reasons.push("ACTUAL_PROVIDER_BALANCE_NOT_VERIFIED");
 if(!Number.isSafeInteger(creditsSpentThisMonth)||creditsSpentThisMonth<0||
  !Number.isSafeInteger(creditsReserved)||creditsReserved<0)
  reasons.push("DURABLE_BUDGET_LEDGER_NOT_VERIFIED");
 if(Number.isSafeInteger(currentCredits)&&currentCredits<53)
  reasons.push("RUNWAY_BALANCE_BELOW_ONE_VIDEO");
 if(Number.isSafeInteger(ownerApprovedMonthlyCredits)&&
    creditsSpentThisMonth+creditsReserved+53>ownerApprovedMonthlyCredits)
  reasons.push("MONTHLY_RUNWAY_CREDIT_CEILING_REACHED");
 // Auto billing is never enabled without separate explicit authorization.
 if(autoBillingEnabled)reasons.push("AUTOBILLING_REQUIRES_EXPLICIT_SEPARATE_APPROVAL");
 return {state:reasons.length?"NOT_READY":"READY_FOR_ATOMIC_JOB",
  reasons,perVideoMaxCredits:53,hasScheduledAnyPost:false,
  userManualPerVideoApprovalRequired:false,
  nextAction:reasons.length?"REMEDIATE_BLOCKERS":"CLAIM_NEXT_DURABLE_SLOT"};
}
