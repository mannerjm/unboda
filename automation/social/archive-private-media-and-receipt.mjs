// One-way staging private-video archive, explicit owner storage allowance required.
// Database proof is recorded ONLY after an independent full MP4 SHA256 readback.
// No generated URL is exposed, no SNS posts or paid model requests.
import {storeVideoAsPrivateReview} from './private-review-storage.mjs';
const blocked=(reason,extra={})=>Object.freeze({state:'BLOCKED',reason,
 publicationAllowed:false,publicUrl:null,...extra});
export async function archiveVideoToPrivateReviewLedger({
 bytes,qa,privateStorage,persistReadbackReceipt,
 ownerApprovedPrivateStorage=false,authorizedMonthlyStorageBytes=0
}={}){
 if(typeof persistReadbackReceipt!=='function')return blocked('SERVICE_ONLY_DB_ARCHIVE_RECORDER_MISSING');
 const stored=await storeVideoAsPrivateReview({
  bytes,qa,storage:privateStorage,ownerApprovedPrivateStorage,
  authorizedMonthlyStorageBytes
 });
 if(stored.state!=='PRIVATE_ARCHIVE_HASH_VERIFIED')
  return blocked(stored.reason??stored.state,{doNotBlindlyRetry:!!stored.doNotBlindlyRetry});
 let journal;
 try{
  journal=await persistReadbackReceipt({
   sha256:stored.sha256,objectKey:stored.objectKey,
   bytes:stored.bytes,actualReadbackSha256:stored.sha256
  });
 }catch{
  return blocked('STORAGE_VERIFIED_BUT_DB_RECONCILIATION_REQUIRED',{
    privateObjectKey:stored.objectKey,doNotBlindlyRetry:true});
 }
 if(journal?.state!=='PRIVATE_ARCHIVE_DB_RECORDED'||
    journal?.sha256!==stored.sha256||
    journal?.objectKey!==stored.objectKey||
    journal?.bytes!==stored.bytes||
    journal?.publicationAllowed!==false||
    journal?.socialPostCreated!==false||
    journal?.publicUrl!==null)
  return blocked('PRIVATE_DB_RECEIPT_UNVERIFIED',{
    privateObjectKey:stored.objectKey,doNotBlindlyRetry:true});
 return Object.freeze({
  state:'PRIVATE_MP4_VERIFIED_AND_RECORDED',
  sha256:stored.sha256,objectKey:stored.objectKey,bytes:stored.bytes,
  publicationAllowed:false,publicUrl:null,commercialRightsApproved:false,
  humanVoiceApproved:false,snsPostCreated:false
 });
}
