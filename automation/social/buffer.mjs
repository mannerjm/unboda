// Deterministic 48-hour planning only. This module never schedules social posts,
// charges an AI provider, or writes to production storage.
import {createHash} from "node:crypto";
import {CADENCE_HOURS} from "./cadence.mjs";

export const DEFAULT_BUFFER_HOURS=48;
export const ANCHORS_KST=Object.freeze({
 "text-image":"2026-10-24T19:30:00+09:00",
 "short-video":"2026-10-24T20:00:00+09:00"
});
export function plannedJobKey(kind,scheduledAt,brandId="7377653"){
 if(!Object.hasOwn(CADENCE_HOURS,kind)||!Number.isFinite(scheduledAt))
  throw Error("INVALID_SCHEDULE_KEY");
 return createHash("sha256").update([brandId,kind,new Date(scheduledAt).toISOString()].join("|"))
  .digest("hex");
}
export function planContentBuffer({now,hours=DEFAULT_BUFFER_HOURS,knownJobKeys=[],
 brandId="7377653"}){
 if(!Number.isFinite(now)||!Number.isInteger(hours)||hours<1||hours>72)
  throw Error("INVALID_BUFFER_WINDOW");
 if(!Array.isArray(knownJobKeys)||knownJobKeys.some(k=>typeof k!=="string"))
  throw Error("DURABLE_JOB_KEYS_REQUIRED");
 const already=new Set(knownJobKeys);
 const limit=now+hours*3600000;
 const jobs=[];
 for(const [kind,anchor] of Object.entries(ANCHORS_KST)){
  const interval=CADENCE_HOURS[kind]*3600000;
  const origin=Date.parse(anchor);
  const first=origin+Math.max(0,Math.ceil((now-origin)/interval))*interval;
  for(let at=first;at<limit;at+=interval){
   const jobKey=plannedJobKey(kind,at,brandId);
   if(already.has(jobKey))continue;
   jobs.push(Object.freeze({
    jobKey,kind,scheduledAt:new Date(at).toISOString(),
    timezone:"Asia/Seoul",state:"CANDIDATE_ONLY",
    requires:["originalMedia","editorialApproval","durableIdempotencyLock","platformQuotaVerification"]
   }));
  }
 }
 return jobs.sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt)||
  a.kind.localeCompare(b.kind));
}
export function bufferCoverage({jobs,now,hours=DEFAULT_BUFFER_HOURS}){
 if(!Array.isArray(jobs)||!Number.isFinite(now))throw Error("BUFFER_STATUS_NOT_VERIFIED");
 const horizon=now+hours*3600000;
 const count={"text-image":0,"short-video":0};
 for(const job of jobs){
  const time=Date.parse(job.scheduledAt);
  if(!(time>=now&&time<horizon))continue;
  if(job.state!=="READY"||!job.mediaVerified||!job.editorialApproved||
     !job.rightsVerified)continue;
  if(Object.hasOwn(count,job.kind))count[job.kind]++;
 }
 const expected={"text-image":Math.floor(hours/3),"short-video":Math.floor(hours/6)};
 return {ready:Object.keys(expected).every(k=>count[k]>=expected[k]),
  verifiedReady:count,required:expected};
}
