// ElevenLabs Korean narration adapter. NO BILLABLE CALLS unless explicitly
// unlocked by a persisted budget reservation and editorial/voice rights approval.
import {authorizeEstimatedSpend} from "./budget.mjs";
const ENDPOINT="https://api.elevenlabs.io/v1/text-to-speech/";
const MODEL="eleven_multilingual_v2";
const hasKorean=s=>/[가-힣]/.test(s);
export function koreanVoiceRequest({
 script,voiceId,voiceRightsApproved=false,editorialApproved=false,
 estimatedCents=null,budget={},reservationId,allowPaid=false
}={}){
 const reasons=[];
 if(typeof script!=="string"||script.length<20||script.length>3500||!hasKorean(script))
  reasons.push("INVALID_KOREAN_SCRIPT");
 if(typeof voiceId!=="string"||!/^[A-Za-z0-9_-]{10,80}$/.test(voiceId))
  reasons.push("VOICE_ID_NOT_VERIFIED");
 if(!voiceRightsApproved)reasons.push("VOICE_RIGHTS_NOT_APPROVED");
 if(!editorialApproved)reasons.push("EDITORIAL_APPROVAL_REQUIRED");
 if(!reservationId||typeof reservationId!=="string")reasons.push("BUDGET_RESERVATION_REQUIRED");
 if(!allowPaid)reasons.push("PAID_GENERATION_SWITCH_OFF");
 const cost=authorizeEstimatedSpend({...budget,estimatedCents});
 if(!cost.authorized)reasons.push(...cost.reasons);
 return {authorized:reasons.length===0,reasons:[...new Set(reasons)],
  ...(reasons.length?{}:{body:{text:script,model_id:MODEL},endpoint:
    ENDPOINT+encodeURIComponent(voiceId)+"?output_format=mp3_44100_128"})};
}
export async function requestKoreanNarration({
 apiKey,fetcher=fetch,...request
}={}){
 const auth=koreanVoiceRequest(request);
 if(!auth.authorized)return {state:"BLOCKED",reasons:auth.reasons};
 if(typeof apiKey!=="string"||apiKey.length<10)
  return {state:"BLOCKED",reasons:["ELEVENLABS_API_KEY_MISSING"]};
 const response=await fetcher(auth.endpoint,{
  method:"POST",
  headers:{"xi-api-key":apiKey,"Content-Type":"application/json",
   "Accept":"audio/mpeg"},
  body:JSON.stringify(auth.body)
 });
 if(!response.ok)return {state:"FAILED",provider:"elevenlabs",status:response.status,
  retryable:response.status===429||response.status>=500};
 const contentType=response.headers?.get?.("content-type")??"";
 if(!contentType.toLowerCase().includes("audio/"))
  return {state:"FAILED",provider:"elevenlabs",reason:"AUDIO_RESPONSE_INVALID"};
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes.length<128)
  return {state:"FAILED",provider:"elevenlabs",reason:"AUDIO_BYTES_INVALID"};
 return {state:"AUDIO_GENERATED_NEEDS_QA",bytes,format:"mp3",
  provider:"elevenlabs",voiceId:request.voiceId,
  rightsConfirmed:true,editorialReviewStatus:"approved",
  pronunciationReviewStatus:"pending",outputNotSaved:true};
}
