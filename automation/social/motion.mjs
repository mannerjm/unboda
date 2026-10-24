// Runway image-to-video adapter. Paid generation OFF by default.
// Persist task IDs and original image-license provenance in a private ledger.
// Provider spec: https://docs.dev.runwayml.com/api (2026-10-24 review).
import {authorizeEstimatedSpend} from "./budget.mjs";
const BASE="https://api.dev.runwayml.com";
const VERSION="2024-11-06";
const MODEL="gen4_turbo";
export function motionRequest({
 imageUri,prompt,durationSeconds=10,model=MODEL,
 imageRightsApproved=false,editorialApproved=false,
 estimatedCents=null,budget={},reservationId,allowPaid=false
}={}){
 const reasons=[];
 if(typeof imageUri!=="string"||!/^https:\/\/[^\s/]+\/\S+/.test(imageUri))
  reasons.push("HTTPS_SOURCE_IMAGE_REQUIRED");
 if(typeof prompt!=="string"||prompt.trim().length<25||prompt.length>1000)
  reasons.push("MOTION_PROMPT_INVALID");
 if(![5,10].includes(durationSeconds))reasons.push("DURATION_UNSUPPORTED");
 if(model!==MODEL)reasons.push("MODEL_NOT_APPROVED");
 if(!imageRightsApproved)reasons.push("SOURCE_IMAGE_RIGHTS_REQUIRED");
 if(!editorialApproved)reasons.push("EDITORIAL_APPROVAL_REQUIRED");
 if(!reservationId||typeof reservationId!=="string")reasons.push("BUDGET_RESERVATION_REQUIRED");
 if(!allowPaid)reasons.push("PAID_GENERATION_SWITCH_OFF");
 const cost=authorizeEstimatedSpend({...budget,estimatedCents});
 if(!cost.authorized)reasons.push(...cost.reasons);
 return {authorized:reasons.length===0,reasons:[...new Set(reasons)],
  ...(reasons.length?{}:{body:{
   model,promptImage:imageUri,promptText:prompt,ratio:"720:1280",duration:durationSeconds
  }})};
}
export async function requestMotionClip({apiKey,fetcher=fetch,...request}={}){
 const auth=motionRequest(request);
 if(!auth.authorized)return {state:"BLOCKED",reasons:auth.reasons};
 if(typeof apiKey!=="string"||apiKey.length<10)
  return {state:"BLOCKED",reasons:["RUNWAY_API_KEY_MISSING"]};
 const response=await fetcher(BASE+"/v1/image_to_video",{
  method:"POST",
  headers:{"Authorization":"Bearer "+apiKey,"X-Runway-Version":VERSION,
    "Content-Type":"application/json"},
  body:JSON.stringify(auth.body)
 });
 if(!response.ok)return {state:"FAILED",provider:"runway",status:response.status,
  retryable:response.status===429||response.status>=500};
 const data=await response.json();
 if(typeof data?.id!=="string"||!data.id)
  return {state:"FAILED",provider:"runway",reason:"MISSING_TASK_ID"};
 return {state:"GENERATION_TASK_ACCEPTED",provider:"runway",taskId:data.id,
  model:auth.body.model,durationSeconds:auth.body.duration,
  imageRightsApproved:true,outputNotVerified:true};
}
// Poll with external scheduler no faster than 5 seconds; GET does not generate
// extra videos. Never mark success until output is downloaded, probed and licensed.
export async function readMotionTask({
 taskId,apiKey,fetcher=fetch,lastPolledAt=null,now=Date.now()
}={}){
 if(typeof taskId!=="string"||!/^[-a-zA-Z0-9]{20,100}$/.test(taskId))
  return {state:"BLOCKED",reasons:["INVALID_TASK_ID"]};
 if(!apiKey||apiKey.length<10)
  return {state:"BLOCKED",reasons:["RUNWAY_API_KEY_MISSING"]};
 if(lastPolledAt!==null&&Number.isFinite(lastPolledAt)&&now-lastPolledAt<5000)
  return {state:"WAIT",reason:"POLL_INTERVAL_MIN_5_SECONDS"};
 const response=await fetcher(BASE+"/v1/tasks/"+encodeURIComponent(taskId),{
  method:"GET",
  headers:{"Authorization":"Bearer "+apiKey,"X-Runway-Version":VERSION}
 });
 if(!response.ok)return {state:"FAILED",provider:"runway",status:response.status};
 const data=await response.json();
 if(data?.status==="SUCCEEDED"){
  const outputUri=Array.isArray(data.output)?data.output.find(x=>typeof x==="string"&&
   /^https:\/\//.test(x)):null;
  if(!outputUri)return {state:"FAILED",reason:"OUTPUT_URL_MISSING"};
  return {state:"MOTION_GENERATED_NEEDS_QA",taskId,outputUri,
   requires:["download","ffprobe","copyrightAndContentReview","commercialQualityReview"]};
 }
 if(data?.status==="FAILED"||data?.status==="CANCELED")
  return {state:"FAILED",provider:"runway",reason:"PROVIDER_TASK_"+data.status};
 return {state:"PENDING",taskId,providerStatus:String(data?.status??"UNKNOWN")};
}
