import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {archiveVerifiedVideoReview} from './verified-review-archive.mjs';
const bytes=new Uint8Array(1600);
bytes.set([0,0,0,24,102,116,121,112,105,115,111,109],0);
const hash=createHash('sha256').update(bytes).digest('hex');
const report={state:'PASS_TECHNICAL_ONLY',technicalChecksPassed:true,
 publicationAllowed:false,video:{sha256:hash,bytes:bytes.length}};
const allowed={report,bytes,ownerStorageApproved:true,approvedStorageBudget:true,
 sourceCommercialRightsVerified:true,voiceCommercialRightsVerified:true,
 privacyOfPublicReviewUrlApproved:true};
test('unapproved media and storage never trigger a paid Blob write',async()=>{
 let writes=0,reads=0;
 const put=async()=>{writes++;throw Error('SHOULD_NOT_WRITE')};
 const fetcher=async()=>{reads++;throw Error('SHOULD_NOT_READ')};
 for(const data of [
  {...allowed,ownerStorageApproved:false},
  {...allowed,approvedStorageBudget:false},
  {...allowed,sourceCommercialRightsVerified:false},
  {...allowed,voiceCommercialRightsVerified:false},
  {...allowed,privacyOfPublicReviewUrlApproved:false},
  {...allowed,report:{...report,state:'BLOCKED'}},
  {...allowed,report:{...report,publicationAllowed:true}},
  {...allowed,bytes:new Uint8Array(1600)}
 ]){
  const r=await archiveVerifiedVideoReview({...data,put,fetcher});
  assert.equal(r.state,'BLOCKED');assert.equal(r.published,false);
 }
 assert.equal(writes,0);assert.equal(reads,0);
});
test('verified bytes and remote hash permit review archive but never public posting',async()=>{
 let writes=0,reads=0;
 const key='unboda-social/review/'+hash.slice(0,32)+'.mp4';
 const url='https://example.public.blob.vercel-storage.com/'+key;
 const r=await archiveVerifiedVideoReview({...allowed,
  put:async(p,b,o)=>{writes++;assert.equal(p,key);
    assert.equal(o.allowOverwrite,false);assert.equal(b.length,bytes.length);
    return {url,pathname:key};},
  fetcher:async(u,opt)=>{reads++;assert.equal(u,url);assert.equal(opt.method,'GET');
    assert.equal(opt.redirect,'error');
    return {ok:true,headers:{get:k=>k==='content-type'?'video/mp4':
      k==='content-length'?String(bytes.length):null},
     arrayBuffer:async()=>bytes.buffer};}});
 assert.equal(writes,1);assert.equal(reads,1);
 assert.equal(r.state,'ARCHIVED_REVIEW_ONLY');
 assert.equal(r.published,false);assert.equal(r.commercialPublishingApproved,false);
 assert.equal(r.automaticSNSPublicationTriggered,false);
 assert.equal(r.sha256,hash);assert.equal(r.permanentUrl,url);
});
test('remote mismatch after upload becomes reconciliation hold, not duplicate upload',async()=>{
 let uploads=0;
 const altered=Uint8Array.from(bytes);altered[22]=127;
 const key='unboda-social/review/'+hash.slice(0,32)+'.mp4';
 const r=await archiveVerifiedVideoReview({...allowed,
  put:async()=>{uploads++;return {pathname:key,
   url:'https://example.public.blob.vercel-storage.com/'+key};},
  fetcher:async()=>({ok:true,headers:{get:k=>k==='content-type'?'video/mp4':null},
   arrayBuffer:async()=>altered.buffer})});
 assert.equal(uploads,1);assert.equal(r.state,'STORAGE_RECONCILIATION_REQUIRED');
 assert.equal(r.doNotBlindRetry,true);assert.equal(r.published,false);
});
