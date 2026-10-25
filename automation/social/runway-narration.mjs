// Runway Korean TTS adapter for the existing funded Developer API.
// Uses Runway's ElevenLabs multilingual_v2 model; no second subscription.
// Paid invocation remains disabled until a separate capped voice budget is approved.
// API: POST https://api.dev.runwayml.com/v1/text_to_speech
const ORIGIN="https://api.dev.runwayml.com";
const VERSION="2024-11-06";
const MODEL="eleven_multilingual_v2";

export function planRunwayKoreanNarration({
 text, allowPaid=false,
 monthlyCreditLimit=0, usedCredits=0, reservedCredits=0,
 ledgerReservationConfirmed=false,
 editorialApproved=false, commercialRightsConfirmed=false,
 voiceProvider="runway"
}={}){
 const reasons=[];
 const count=Array.from(typeof text==="string"?text:"").length;
 if(count<50||count>2048)reasons.push("KOREAN_SCRIPT_LENGTH_INVALID");
 if(!/[가-힣]/u.test(text??""))reasons.push("KOREAN_SCRIPT_REQUIRED");
 if(!editorialApproved)reasons.push("EDITORIAL_APPROVAL_REQUIRED");
 if(!commercialRightsConfirmed)reasons.push("COMMERCIAL_VOICE_USE_UNVERIFIED");
 if(voiceProvider!=="runway")reasons.push("UNAPPROVED_TTS_PROVIDER");
 if(!allowPaid)reasons.push("PAID_VOICE_DISABLED");
 const estimatedCredits=Math.ceil(count/50);
 if(!Number.isSafeInteger(monthlyCreditLimit)||monthlyCreditLimit<=0)
  reasons.push("MONTHLY_AUDIO_CREDIT_BUDGET_MISSING");
 if(!Number.isSafeInteger(usedCredits)||usedCredits<0||
  !Number.isSafeInteger(reservedCredits)||reservedCredits<0)
  reasons.push("AUDIO_CREDIT_LEDGER_INVALID");
 if(usedCredits+reservedCredits+estimatedCredits>monthlyCreditLimit)
  reasons.push("AUDIO_CREDIT_BUDGET_EXCEEDED");
 if(!ledgerReservationConfirmed)reasons.push("DURABLE_BUDGET_RESERVATION_REQUIRED");
 return {authorized:reasons.length===0,reasons,
  estimatedCredits,characterCount:count,
  ...(reasons.length?{}:{request:{
    model:MODEL,promptText:text
    // Do not invent outputFormat or sampleRate: this API does not specify them
    // for eleven_multilingual_v2. Output media verified from the task response.
  }})};
}
export async function requestRunwayKoreanNarration({apiKey,fetcher=fetch,...opts}={}){
 const p=planRunwayKoreanNarration(opts);
 if(!p.authorized)return {state:"BLOCKED",reasons:p.reasons,
  estimatedCredits:p.estimatedCredits};
 if(typeof apiKey!=="string"||apiKey.length<10)
  return {state:"BLOCKED",reasons:["RUNWAY_API_KEY_MISSING"]};
 try{
  const res=await fetcher(ORIGIN+"/v1/text_to_speech",{
   method:"POST",
   headers:{"Authorization":"Bearer "+apiKey,"X-Runway-Version":VERSION,
    "Content-Type":"application/json"},
   body:JSON.stringify(p.request)
  });
  if(!res.ok)return {state:"UNKNOWN_PROVIDER_OUTCOME_NO_BLIND_RETRY",
   httpStatus:res.status,doNotRetryAutomatically:true};
  const data=await res.json();
  if(!/^[a-f0-9-]{36}$/i.test(data?.id??""))
   return {state:"UNKNOWN_PROVIDER_OUTCOME_NO_BLIND_RETRY",
    doNotRetryAutomatically:true};
  return {state:"TTS_TASK_ACCEPTED_NOT_VERIFIED",
   taskId:data.id,estimatedCredits:p.estimatedCredits,
   provider:"Runway",model:MODEL,outputNotVerified:true};
 }catch{
  return {state:"UNKNOWN_PROVIDER_OUTCOME_NO_BLIND_RETRY",
   doNotRetryAutomatically:true};
 }
}
export async function readRunwayKoreanNarrationTask({
 taskId,apiKey,fetcher=fetch
}={}){
 if(!/^[a-f0-9-]{36}$/i.test(taskId??""))
  return {state:"BLOCKED",reason:"TASK_ID_INVALID"};
 if(!apiKey||apiKey.length<10)
  return {state:"BLOCKED",reason:"RUNWAY_API_KEY_MISSING"};
 const res=await fetcher(ORIGIN+"/v1/tasks/"+encodeURIComponent(taskId),{
  method:"GET",headers:{"Authorization":"Bearer "+apiKey,
    "X-Runway-Version":VERSION}
 });
 if(!res.ok)return {state:"FAILED",reason:"TASK_READ_ERROR",status:res.status};
 const data=await res.json();
 if(data?.status!=="SUCCEEDED")
  return {state:data?.status==="FAILED"?"FAILED":"NOT_READY",
   status:String(data?.status??"UNKNOWN")};
 const media=data?.output?.find(x=>typeof x==="string"&&x.startsWith("https://"));
 if(!media)return {state:"FAILED",reason:"TTS_OUTPUT_URI_MISSING"};
 return {state:"TTS_OUTPUT_NEEDS_STORAGE_AND_PRONUNCIATION_QA",
  taskId,outputUri:media,pronunciationVerified:false,
  mediaPersisted:false};
}
