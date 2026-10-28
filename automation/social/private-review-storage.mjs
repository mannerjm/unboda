// Server-only Supabase private review archive; not connected to production.
// The bucket has RLS with no anon/authenticated policies.
// This module requires an injected server-only upload/download adapter.
import {createHash} from 'node:crypto';
const BUCKET='unboda-social-private-review';
const MAX_BYTES=45000000;
const BLOCK=(reason,more={})=>Object.freeze({
 state:'BLOCKED',reason,stored:false,published:false,...more
});
function hex(bytes){return createHash('sha256').update(bytes).digest('hex')}
export async function storeVideoAsPrivateReview({
 bytes,qa,storage,ownerApprovedPrivateStorage=false,
 authorizedMonthlyStorageBytes=0,alreadyWritten=false
}={}){
 if(ownerApprovedPrivateStorage!==true||
    !Number.isSafeInteger(authorizedMonthlyStorageBytes)||
    authorizedMonthlyStorageBytes<1)
  return BLOCK('PRIVATE_STORAGE_BUDGET_OWNER_APPROVAL_REQUIRED');
 if(!bytes||!(bytes instanceof Uint8Array)||bytes.length<1024||
    bytes.length>MAX_BYTES||bytes.length>authorizedMonthlyStorageBytes)
  return BLOCK('PRIVATE_STORAGE_BYTES_OR_SIZE_CAP_INVALID');
 if(bytes.length<8||String.fromCharCode(...bytes.subarray(4,8))!=='ftyp')
  return BLOCK('MP4_CONTAINER_HEADER_INVALID');
 const computed=hex(bytes);
 if(qa?.state!=='PASS_TECHNICAL_ONLY'||qa?.technicalChecksPassed!==true||
    qa?.publicationAllowed!==false||qa?.video?.sha256!==computed||
    qa?.video?.bytes!==bytes.length||!Array.isArray(qa.reasons)||
    qa.reasons.length>0)
  return BLOCK('FULL_MEDIA_QA_AND_CHECKSUM_REQUIRED');
 if(storage?.bucket!==BUCKET||typeof storage.upload!=='function'||
    typeof storage.download!=='function'||storage.usesServerServiceRole!==true||
    storage.isPrivateBucket!==true)
  return BLOCK('SERVER_ONLY_PRIVATE_STORAGE_ADAPTER_REQUIRED');
 // Deterministic exact object path avoids title collisions and opaque URLs.
 const path='qa/'+computed+'.mp4';
 if(alreadyWritten===true)
  return BLOCK('POSSIBLE_PREVIOUS_UPLOAD_MUST_RECONCILE_BY_HASH',{
   objectKey:path,doNotBlindlyRetry:true
  });
 let receipt;
 try{
  receipt=await storage.upload(path,bytes,{
   contentType:'video/mp4',upsert:false,cacheControl:'private'
  });
 }catch{
  return Object.freeze({state:'STORAGE_RECONCILIATION_REQUIRED',
   objectKey:path,sha256:computed,doNotBlindlyRetry:true,
   stored:false,published:false});
 }
 // Storage acknowledgement is not proof of completed upload.
 if(receipt?.path!==path||receipt?.bucket!==BUCKET||
    receipt?.publicUrl||receipt?.signedUrl)
  return BLOCK('UNTRUSTED_OR_PUBLIC_STORAGE_RECEIPT',{
   objectKey:path,doNotBlindlyRetry:true
  });
 let remote;
 try{
  remote=await storage.download(path);
  if(remote?.arrayBuffer instanceof Function)
    remote=new Uint8Array(await remote.arrayBuffer());
  if(!(remote instanceof Uint8Array)||
     remote.length!==bytes.length||hex(remote)!==computed)
   throw Error('UNVERIFIED_BYTES');
 }catch{
  return Object.freeze({state:'STORAGE_RECONCILIATION_REQUIRED',
   objectKey:path,sha256:computed,doNotBlindlyRetry:true,
   stored:false,published:false});
 }
 return Object.freeze({
  state:'PRIVATE_ARCHIVE_HASH_VERIFIED',bucket:BUCKET,
  objectKey:path,sha256:computed,bytes:bytes.length,
  stored:true,publicUrl:null,publicPermission:false,
  commercialRightsApproved:false,voiceHumanApproved:false,
  SNSPublished:false,publicationAllowed:false,published:false
 });
}
