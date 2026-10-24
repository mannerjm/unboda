// Stateless recovery policy. Caller MUST persist decisions and idempotency records.
// Never retry on a mere HTTP timeout without a definitive remote post lookup.
export const MAX_RETRIES=3;
export const BACKOFF_MINUTES=Object.freeze([5,30,120]);
export function classifyFailure({httpStatus,errorCode}={}){
 const code=String(errorCode??"").toUpperCase();
 if([401,403].includes(httpStatus)||/TOKEN|AUTH|PERMISSION|DISCONNECTED|ACCOUNT/.test(code))
  return "AUTH_RECONNECT";
 if([400,404,409,415,422].includes(httpStatus)||/COPYRIGHT|POLICY|FORMAT|MEDIA|CONTENT/.test(code))
  return "MANUAL_CONTENT_REVIEW";
 if(httpStatus===429||/QUOTA|RATE_LIMIT|TOO_MANY/.test(code))
  return "RATE_LIMIT";
 if(httpStatus>=500&&httpStatus<600||/TIMEOUT|NETWORK|TEMPORARY/.test(code))
  return "TRANSIENT";
 return "UNKNOWN";
}
export function planRecovery({
 state,kind,attempts=0,remoteLookupPerformed=false,publicationConfirmed=null,
 now,scheduledAt,errorCode,httpStatus,manualHold=false
}){
 if(!Number.isFinite(now)||!Number.isFinite(scheduledAt)||!Number.isInteger(attempts)||attempts<0)
  throw Error("INVALID_RECOVERY_INPUT");
 if(manualHold)return {action:"ESCALATE",reason:"MANUAL_HOLD"};
 if(publicationConfirmed===true||state==="PUBLISHED")return {action:"MARK_PUBLISHED"};
 if(state==="SCHEDULED"||state==="PENDING"){
  if(now<scheduledAt+60*60_000)return {action:"WAIT_FOR_PUBLICATION"};
  return {action:"VERIFY_REMOTE_STATUS",reason:"POST_NOT_CONFIRMED"};
 }
 if(state!=="FAILED")return {action:"VERIFY_REMOTE_STATUS",reason:"UNKNOWN_STATE"};
 const category=kind??classifyFailure({httpStatus,errorCode});
 if(category==="AUTH_RECONNECT"||category==="MANUAL_CONTENT_REVIEW")
  return {action:"ESCALATE",reason:category};
 // Unknown outcome may mean the remote post was created; never blind retry.
 if(!remoteLookupPerformed||publicationConfirmed!==false)
  return {action:"VERIFY_REMOTE_STATUS",reason:"DUPLICATE_PUBLICATION_RISK"};
 if(category==="UNKNOWN")return {action:"ESCALATE",reason:"FAILURE_UNCLASSIFIED"};
 if(attempts>=MAX_RETRIES)return {action:"ESCALATE",reason:"RETRY_EXHAUSTED"};
 const delayMinutes=category==="RATE_LIMIT"?
  Math.max(BACKOFF_MINUTES[attempts],60):
  BACKOFF_MINUTES[attempts];
 return {action:"RETRY_AFTER",nextAttemptAt:now+delayMinutes*60_000,
  attemptsNext:attempts+1,reason:category};
}
