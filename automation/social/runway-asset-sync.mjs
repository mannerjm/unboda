// Cloud-worker source-media synchronization: Runway task -> durable object storage.
// This is the handoff users must NEVER perform by downloading/re-uploading files.
// The storage driver is injected and must be configured separately; no upload
// occurs unless a durable, non-expiring HTTPS destination and media checksum
// confirmation are available. This does NOT authorize spending or posting.
import {createHash} from "node:crypto";

const API="https://api.dev.runwayml.com";
const MAX_BYTES=35*1024*1024;
const ALLOWED_SOURCE_HOST="dnznrvs05pmza.cloudfront.net";
const RUNWAY_VERSION="2024-11-06";

export function validateProviderMediaUrl(value){
 if(typeof value!=="string"||value.length>4096)return false;
 try{
  const url=new URL(value);
  return url.protocol==="https:" &&
    url.hostname===ALLOWED_SOURCE_HOST &&
    (url.port===""||url.port==="443") &&
    !url.username&&!url.password&&url.pathname.endsWith(".mp4");
 }catch{return false;}
}
export function verifyMp4Header(bytes) {
 if(!(bytes instanceof Uint8Array)||bytes.length<16)return false;
 const sig=String.fromCharCode(...bytes.slice(4,8));
 return sig==="ftyp";
}
export function verifyPermanentMediaUrl(value){
 if(typeof value!=="string"||value.length>4096)return false;
 try{
  const url=new URL(value);
  return url.protocol==="https:"&&url.hostname.length>3&&
   !url.username&&!url.password&&!url.search&&!url.hash&&
   url.pathname.toLowerCase().endsWith(".mp4")&&
   url.hostname!==ALLOWED_SOURCE_HOST;
 }catch{return false;}
}
export async function syncCompletedRunwayTask({
 taskId,apiKey,
 get=fetch,
 // async ({key,bytes,contentType,sha256}) => {url,persisted:boolean}
 putObject,
 ownerCopyrightApproved=false,
 storageBudgetApproved=false,
 storageObjectPrefix="unboda-social/pilots"
}={}){
 const no=(reason)=>({state:"BLOCKED",reason,externalUploadPerformed:false});
 if(!/^[0-9a-f-]{36}$/i.test(taskId??""))return no("INVALID_TASK_ID");
 if(typeof apiKey!=="string"||apiKey.length<10)return no("RUNWAY_AUTH_MISSING");
 if(!ownerCopyrightApproved)return no("SOURCE_RIGHTS_NOT_CONFIRMED");
 if(!storageBudgetApproved)return no("STORAGE_COST_NOT_APPROVED");
 if(typeof putObject!=="function")return no("DURABLE_STORAGE_NOT_CONFIGURED");
 if(!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/i.test(storageObjectPrefix))
  return no("UNSAFE_STORAGE_PREFIX");

 try{
  const response=await get(API+"/v1/tasks/"+encodeURIComponent(taskId),{
   method:"GET",headers:{
    Authorization:"Bearer "+apiKey,
    "X-Runway-Version":RUNWAY_VERSION
   },redirect:"error",cache:"no-store",signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)return {state:"FAILED",reason:"RUNWAY_TASK_READ_FAILED",
    providerStatus:response.status};
  const item=await response.json();
  if(item?.status!=="SUCCEEDED")return {state:"NOT_READY",
    providerStatus:String(item?.status??"UNKNOWN"),externalUploadPerformed:false};
  const url=item?.output?.find(validateProviderMediaUrl);
  if(!url)return no("UNTRUSTED_OR_MISSING_RUNWAY_MEDIA_URL");

  const media=await get(url,{method:"GET",redirect:"error",
   cache:"no-store",signal:AbortSignal.timeout(25000)});
  if(!media.ok)return {state:"FAILED",reason:"MEDIA_DOWNLOAD_FAILED",
    httpStatus:media.status,externalUploadPerformed:false};
  const length=Number(media.headers?.get("content-length")??0);
  if(!Number.isSafeInteger(length)||length>MAX_BYTES)
   return no("MEDIA_EXCEEDS_LIMIT");
  const type=(media.headers?.get("content-type")??"").split(";")[0].trim();
  if(type!=="video/mp4"&&type!=="application/octet-stream")
   return no("MEDIA_TYPE_NOT_MP4");
  const buf=new Uint8Array(await media.arrayBuffer());
  if(buf.length<1000||buf.length>MAX_BYTES||!verifyMp4Header(buf))
   return no("MP4_SIGNATURE_OR_SIZE_INVALID");
  const sha256=createHash("sha256").update(buf).digest("hex");
  const key=storageObjectPrefix+"/"+taskId+"-"+sha256.slice(0,16)+".mp4";
  // This is the first external write; callers MUST ensure object key is
  // idempotent and quota checked. Unknown writes must be reconciled by key.
  const stored=await putObject({key,bytes:buf,sha256,contentType:"video/mp4",
    pathnameMustBeIdempotent:true});
  if(!stored?.persisted||!verifyPermanentMediaUrl(stored.url))
   return {state:"STORAGE_WRITE_UNCONFIRMED_RECONCILE",
    taskId,storageKey:key,sha256,doNotBlindRetry:true};
  return {state:"PERMANENT_SOURCE_MP4_STORED",taskId,
   storageKey:key,sha256,bytes:buf.length,permanentUrl:stored.url,
   visualQualityNotYetApproved:true,koreanNarrationNotYetGenerated:true,
   publishingNotYetAuthorized:true,manualUserFileTransferNeeded:false};
 }catch{
  return {state:"UNKNOWN_SYNC_OUTCOME_RECONCILE",
   doNotBlindRetry:true,taskId};
 }
}
