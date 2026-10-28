// One-way reviewed-media storage bridge. It NEVER schedules or publishes posts.
// This pure adapter is not wired to a production worker; all writes fail closed
// until explicit storage/rights approvals and a passed technical report exist.
import {createHash} from 'node:crypto';
import {createVercelPublicBlobWriter} from './vercel-blob-driver.mjs';
const MAX=45*1024*1024;
export async function archiveVerifiedVideoReview({
  report,bytes,put,fetcher=fetch,ownerStorageApproved=false,
  sourceCommercialRightsVerified=false,voiceCommercialRightsVerified=false,
  privacyOfPublicReviewUrlApproved=false,approvedStorageBudget=false
}={}){
 const blocked=(reason)=>Object.freeze({state:'BLOCKED',reason,published:false});
 if(!ownerStorageApproved||!approvedStorageBudget)
  return blocked('STORAGE_OWNER_AND_BUDGET_APPROVAL_REQUIRED');
 if(!sourceCommercialRightsVerified||!voiceCommercialRightsVerified||
    !privacyOfPublicReviewUrlApproved)
  return blocked('PUBLIC_REVIEW_RIGHTS_OR_VISIBILITY_NOT_APPROVED');
 if(report?.state!=='PASS_TECHNICAL_ONLY'||report?.technicalChecksPassed!==true||
    report?.publicationAllowed!==false||!report.video?.sha256)
  return blocked('TECHNICAL_VIDEO_REPORT_REQUIRED');
 if(!(bytes instanceof Uint8Array)||bytes.length<1024||bytes.length>MAX)
  return blocked('REVIEW_VIDEO_BYTES_INVALID');
 const actual=createHash('sha256').update(bytes).digest('hex');
 if(actual!==report.video.sha256||bytes.length!==report.video.bytes)
  return blocked('REVIEW_MEDIA_REPORT_CHECKSUM_MISMATCH');
 const key='unboda-social/review/'+actual.slice(0,32)+'.mp4';
 const writer=createVercelPublicBlobWriter({put,
   ownerApprovedStorage:true,approvedStoragePathPrefix:'unboda-social/review'});
 const saved=await writer({key,bytes,sha256:actual,contentType:'video/mp4'});
 if(saved.persisted!==true)return blocked(saved.reason??'STORAGE_RECEIPT_UNVERIFIED');
 if(typeof fetcher!=='function')return {
   state:'STORAGE_RECONCILIATION_REQUIRED',storageKey:key,
   published:false,doNotBlindRetry:true
 };
 try{
   // Read-after-write verification, not simply trusting the Blob SDK receipt.
   const response=await fetcher(saved.url,{method:'GET',redirect:'error',
     cache:'no-store',signal:AbortSignal.timeout(25000)});
   if(!response?.ok||!(response.headers?.get('content-type')??'').startsWith('video/mp4'))
    throw Error('NOT_VERIFIED');
   const length=Number(response.headers?.get('content-length')??0);
   if(length>MAX||(length>0&&length!==bytes.length))throw Error('INVALID_SIZE');
   const remote=new Uint8Array(await response.arrayBuffer());
   if(remote.length!==bytes.length||createHash('sha256').update(remote).digest('hex')!==actual)
    throw Error('REMOTE_SHA_MISMATCH');
 }catch{
   return Object.freeze({state:'STORAGE_RECONCILIATION_REQUIRED',
     storageKey:key,sha256:actual,doNotBlindRetry:true,published:false});
 }
 return Object.freeze({
  state:'ARCHIVED_REVIEW_ONLY',storageKey:key,permanentUrl:saved.url,
  sha256:actual,bytes:bytes.length,
  voiceHumanReviewed:false,thumbnailPlatformVerified:false,
  commercialPublishingApproved:false,published:false,
  automaticSNSPublicationTriggered:false
 });
}
